#!/usr/bin/env bash
# Sobe a plataforma na Cloudflare, do zero, com um comando.
# ──────────────────────────────────────────────────────────────────────────
#   bash scripts/cloudflare-setup.sh
#
# Pode rodar quantas vezes quiser: cada passo verifica antes de agir. Se
# parar no meio, conserte o que ele apontou e rode de novo - ele pula tudo
# que já estava feito.
#
# Não faz nada escondido. Cada passo diz o que vai fazer, e quando falha diz
# O QUE deu errado e O QUE fazer - um script de implantação que morre com
# "Error: 10021" é pior do que nenhum.

set -uo pipefail
cd "$(dirname "$0")/.."

DB_NAME="hebreo-fluido"
# Versão fixa. Este script roda com TODOS os segredos de produção no ambiente
# (token da Cloudflare, Mercado Pago, Resend); `wrangler@4` resolvia para a
# versão mais nova a cada execução, e um pacote comprometido rodaria com tudo
# isso nas mãos. Subir de versão é uma edição deliberada, testada, aqui.
# O wrangler do package-lock.json da raiz (auditoria de 01/10/2026,
# SEC-A-009): com `npm ci` na raiz, a versão E todas as dependências dela vêm
# do lockfile, conferidas pelo hash. O `npx --yes wrangler@VERSÃO` fixava só
# o pacote de cima e resolvia o resto a cada execução - num passo que tem os
# segredos de produção no ambiente. Sem `npm ci` (uma máquina nova), cai no
# npx com a mesma versão do lockfile.
if [ -x "$PWD/node_modules/.bin/wrangler" ]; then
  WRANGLER_LOCAL="$PWD/node_modules/.bin/wrangler"
else
  WRANGLER_LOCAL="npx --yes wrangler@4.146.0"
fi
W="$WRANGLER_LOCAL"
# Vira 1 quando este script edita o wrangler.toml. No CI a edição é
# descartável (o runner some), então a publicação funciona mesmo assim - mas
# o arquivo do repositório continua com o valor de exemplo, e é isso que o
# aviso do fim cobra.
PATCHED=0

bold()  { printf '\033[1m%s\033[0m\n' "$*"; }
ok()    { printf '  \033[32m✓\033[0m %s\n' "$*"; }
info()  { printf '  · %s\n' "$*"; }
erro()  { printf '  \033[31m✗\033[0m %s\n' "$*"; }

# morre <o que falhou> <o que fazer>
morre() {
  echo
  erro "$1"
  echo
  printf '  \033[1mO que fazer:\033[0m %s\n' "$2"
  echo
  echo "  Depois de resolver, rode este script de novo - ele continua de onde parou."
  exit 1
}

echo
bold "Hebraico Fluente → Cloudflare"
echo

# ── 0. wrangler e login ───────────────────────────────────────────────────
# Roda igual na máquina de alguém e dentro do GitHub Actions. A única
# diferença é de onde vem a credencial: `wrangler login` grava um perfil
# local; no CI, o wrangler lê CLOUDFLARE_API_TOKEN do ambiente sozinho. Por
# isso não há dois caminhos aqui - só uma mensagem que serve aos dois.
bold "0. Conta"
WHO="$($W whoami 2>&1)"
if echo "$WHO" | grep -qi "not authenticated\|you are not logged in\|please run.*login"; then
  morre "O wrangler não está autenticado." \
        "Na sua máquina: 'npx wrangler login' (abre o navegador).
       No GitHub Actions ou em servidor sem navegador: defina
       CLOUDFLARE_API_TOKEN (modelo 'Edit Cloudflare Workers', mais D1:Edit)."
fi
ACCOUNT="$(echo "$WHO" | grep -oE '[0-9a-f]{32}' | head -1)"
if [ -z "$ACCOUNT" ]; then
  info "Não consegui ler o Account ID da saída do whoami - seguindo assim mesmo."
else
  ok "Conta $ACCOUNT"
  # O Account ID vem do PRÓPRIO TOKEN, e não de uma variável que alguém
  # digitou. Um id colado errado (ou de outra conta da mesma pessoa) faz a
  # Cloudflare responder 7003 - "could not route" - em vez de um erro de
  # permissão, e a mensagem manda procurar no lugar errado. Derivando daqui,
  # essa classe inteira de engano deixa de existir.
  if [ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ] && [ "$CLOUDFLARE_ACCOUNT_ID" != "$ACCOUNT" ]; then
    info "CLOUDFLARE_ACCOUNT_ID não bate com a conta do token - usando a do token."
  fi
  export CLOUDFLARE_ACCOUNT_ID="$ACCOUNT"
fi

# ── 1. o banco ────────────────────────────────────────────────────────────
echo
bold "1. Banco D1"

# `d1 list` cobre o caso de o banco já existir de uma tentativa anterior -
# `d1 create` falharia com "already exists" e o script pararia por nada.
LIST="$($W d1 list --json 2>/dev/null)"
DB_ID="$(printf '%s' "$LIST" \
  | python3 -c "
import sys,json
try: rows=json.load(sys.stdin)
except Exception: rows=[]
print(next((r.get('uuid') or r.get('id','') for r in rows if r.get('name')=='$DB_NAME'), ''))
" 2>/dev/null)"

if [ -n "$DB_ID" ]; then
  ok "Já existe: $DB_ID"
else
  info "Criando '$DB_NAME'…"
  OUT="$($W d1 create "$DB_NAME" 2>&1)"
  DB_ID="$(printf '%s' "$OUT" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)"

  if [ -z "$DB_ID" ]; then
    # 7003 / "could not route" na rota de D1 quase nunca é o que parece. A
    # Cloudflare não responde 403 quando o token não carrega a permissão de
    # D1: ela responde que a ROTA não existe, porque para aquele token ela
    # realmente não existe. Quem lê a mensagem literal vai procurar id
    # inválido e não acha nada.
    if printf '%s' "$OUT" | grep -qE '7003|[Cc]ould not route'; then
      morre "O token não tem permissão de D1.

       A Cloudflare responde 'could not route ... [code: 7003]' em vez de um
       erro de permissão, porque para um token sem D1 essa rota realmente
       não existe. Não é id inválido." \
            "Não precisa criar outro token - dá para editar o que existe:

       1. https://dash.cloudflare.com/profile/api-tokens
       2. Na linha do token, menu ⋯ à direita → 'Edit'
       3. No quadro Permissions, clique em '+ Add more'
       4. Preencha a linha:  Account  |  D1  |  Edit
       5. 'Continue to summary' → 'Save'

       O valor do token NÃO muda - não precisa colar de novo no GitHub."
    fi
    morre "Não consegui criar o banco. O wrangler disse:

$(printf '%s' "$OUT" | sed 's/^/       /')" \
          "Se a mensagem fala em limite de bancos, apague um D1 que não usa
       no painel. Cole essa saída que eu resolvo."
  fi
  ok "Criado: $DB_ID"
fi

# ── 2. colar o id no wrangler.toml ────────────────────────────────────────
echo
bold "2. wrangler.toml"
CURRENT="$(grep -oP 'database_id\s*=\s*"\K[^"]+' wrangler.toml || true)"
if [ "$CURRENT" = "$DB_ID" ]; then
  ok "database_id já está certo"
else
  python3 - "$DB_ID" <<'PY'
import re, sys
p = 'wrangler.toml'
s = open(p, encoding='utf8').read()
s = re.sub(r'(database_id\s*=\s*")[^"]*(")', lambda m: m.group(1) + sys.argv[1] + m.group(2), s, count=1)
open(p, 'w', encoding='utf8').write(s)
PY
  ok "database_id ← $DB_ID"
  PATCHED=1
fi

# ── 3. tabelas ────────────────────────────────────────────────────────────
echo
bold "3. Tabelas"
# Aplica SEMPRE, e não só quando o banco está vazio.
#
# A versão anterior pulava este passo se `accounts` já existisse - e com isso
# uma tabela NOVA acrescentada ao esquema nunca seria criada num banco que já
# estava no ar. O sintoma seria a funcionalidade nova falhando em silêncio, em
# produção, com o esquema "já aplicado" no relatório.
#
# É seguro repetir: cada comando do arquivo é CREATE ... IF NOT EXISTS, então
# rodar de novo não toca em nada que exista nem apaga um dado sequer.
info "Aplicando worker/schema.sql…"
if $W d1 execute "$DB_NAME" --remote --file=worker/schema.sql >/dev/null 2>&1; then
  ok "Esquema em dia"
else
  morre "Falhou ao aplicar o esquema." \
        "Rode à mão para ver a mensagem inteira:
       npx wrangler d1 execute $DB_NAME --remote --file=worker/schema.sql"
fi

# ── 3b. migrações ─────────────────────────────────────────────────────────
# O schema.sql só CRIA o que não existe (auditoria de 28/09, INFRA-005): uma
# coluna nova numa tabela que já está no ar nunca chegaria à produção. Cada
# mudança assim é um arquivo em worker/migrations/ (NNNN-descricao.sql),
# aplicado UMA vez, em ordem, e anotado na tabela `migracoes`. Uma migração
# que falha para a publicação ANTES de o código novo subir - o site continua
# com a versão anterior, que não depende dela.
MIGR_DIR=worker/migrations
if ls "$MIGR_DIR"/[0-9][0-9][0-9][0-9]-*.sql >/dev/null 2>&1; then
  if ! FEITAS_JSON="$($W d1 execute "$DB_NAME" --remote --json --command "SELECT nome FROM migracoes" 2>/dev/null)"; then
    morre "Não consegui ler a tabela de migrações." \
          "Sem saber quais já rodaram, aplicar de novo pode duplicar uma mudança."
  fi
  FEITAS="$(printf '%s' "$FEITAS_JSON" | python3 -c 'import json,sys
d=json.load(sys.stdin)
print("\n".join(r["nome"] for b in d for r in b.get("results", [])))')"
  for f in $(ls "$MIGR_DIR"/[0-9][0-9][0-9][0-9]-*.sql | sort); do
    n="$(basename "$f")"
    case "$n" in *[!a-z0-9.-]*) morre "Nome de migração inválido: $n" "Use NNNN-descricao.sql, só minúsculas, números e hífen." ;; esac
    grep -qxF "$n" <<<"$FEITAS" && continue
    info "Aplicando a migração $n…"
    $W d1 execute "$DB_NAME" --remote --file="$f" >/dev/null 2>&1 \
      || morre "A migração $n falhou." "Rode à mão para ver a mensagem:
       npx wrangler d1 execute $DB_NAME --remote --file=$f"
    $W d1 execute "$DB_NAME" --remote --command \
      "INSERT INTO migracoes (nome, aplicado_em) VALUES ('$n', unixepoch()*1000)" >/dev/null 2>&1 \
      || morre "A migração $n rodou, mas não consegui anotá-la." \
               "Anote à mão antes de publicar de novo, senão ela roda outra vez:
       npx wrangler d1 execute $DB_NAME --remote --command \"INSERT INTO migracoes (nome, aplicado_em) VALUES ('$n', unixepoch()*1000)\""
    ok "Migração $n aplicada"
  done
else
  ok "Nenhuma migração pendente"
fi

# ── 4. segredos ───────────────────────────────────────────────────────────
echo
bold "4. Segredos"
# Falha aqui é falha, e não "lista vazia". A versão anterior engolia o erro
# (`|| true`), lia a lista como vazia, concluía que SESSION_SECRET não existia
# e gerava OUTRO - e cada aluno logado caía fora no meio de uma publicação
# verde. Uma listagem que não deu certo não prova ausência de nada.
#
# A exceção é a primeira publicação de um Worker novo: ele só nasce no
# `wrangler deploy` (passo 5), e a lista responde "run `wrangler deploy`
# first". Um Worker que não existe não tem segredo nem aluno logado, então
# não há o que derrubar: ele é criado aqui, e a lista é pedida de novo.
if ! SECRETS="$($W secret list 2>&1)" \
   && printf '%s' "$SECRETS" | grep -qiE 'wrangler deploy. first|code: 10007'; then
  info "O Worker ainda não existe (primeira publicação) - criando antes dos segredos…"
  $W deploy >/dev/null 2>&1 \
    || morre "Não consegui criar o Worker." "Rode à mão para ver a mensagem: npx wrangler deploy"
  ok "Worker criado"
fi
if ! SECRETS="$($W secret list 2>&1)"; then
  morre "Não consegui listar os segredos do Worker." \
        "Sem a lista não dá para saber se SESSION_SECRET existe, e gerar um
       novo por engano derruba a sessão de todo mundo. A resposta foi:
       $(printf '%s' "$SECRETS" | tail -5)"
fi
tem() { printf '%s' "$SECRETS" | grep -q "\"$1\"\|^$1\b"; }

if tem SESSION_SECRET; then
  ok "SESSION_SECRET definido"
else
  info "SESSION_SECRET não existe - gerando um e enviando…"
  if openssl rand -base64 48 | $W secret put SESSION_SECRET >/dev/null 2>&1; then
    ok "SESSION_SECRET criado"
  else
    morre "Não consegui gravar SESSION_SECRET." \
          "Rode à mão: npx wrangler secret put SESSION_SECRET
       (cole o resultado de: openssl rand -base64 48)"
  fi
fi

# ADMIN_TOKEN: o que abre os detalhes de /api/health (auditoria de
# 01/10/2026, SEC-A-007). Para o público a saúde diz só `ok` e `monitor`; a
# conferência desta publicação (worker/e2e.sh) precisa do resto - tabelas,
# sessão, e-mail, modo da cobrança - e o recebe em HF_ADMIN_TOKEN.
#
# Um valor NOVO a cada publicação, a menos que ADMIN_TOKEN venha no ambiente
# (quem quiser um fixo põe nos segredos do repositório). Ninguém precisa
# guardá-lo: quem lê os detalhes fora da publicação é o administrador, pela
# própria sessão com o segundo fator. Trocar a cada vez é também o que
# torna inútil um token visto num log velho.
ADMIN_TOKEN="${ADMIN_TOKEN:-$(openssl rand -hex 32)}"
if printf '%s' "$ADMIN_TOKEN" | $W secret put ADMIN_TOKEN >/dev/null 2>&1; then
  ok "ADMIN_TOKEN enviado ao Worker"
  export HF_ADMIN_TOKEN="$ADMIN_TOKEN"
else
  info "Não consegui enviar ADMIN_TOKEN: a conferência vai ver só a saúde pública."
fi

# Os da Mercado Pago: se o valor estiver no AMBIENTE (segredo do GitHub, ou
# exportado na sua máquina), ele é empurrado para o Worker. É o que evita a
# viagem ao painel da Cloudflare - os segredos ficam num lugar só, o mesmo
# onde já estão os da Cloudflare, e uma troca de chave é uma edição e um push.
#
# Empurra SEMPRE que o valor existe no ambiente, mesmo que o Worker já tenha
# um: é assim que rotacionar uma chave funciona. Sem isso, trocar o token no
# GitHub não trocaria nada e a pessoa passaria uma tarde entendendo por quê.
empurra() {
  local nome="$1" valor="$2"
  if [ -n "$valor" ]; then
    if printf '%s' "$valor" | $W secret put "$nome" >/dev/null 2>&1; then
      ok "$nome enviado ao Worker"
    else
      info "Não consegui enviar $nome - rode 'npx wrangler secret put $nome'."
    fi
  elif tem "$nome"; then
    ok "$nome já definido no Worker"
  else
    return 1
  fi
}

# PAGAMENTO_LIGADO guarda a resposta para o aviso do fim do script. Sem ele,
# a última linha da publicação continuava dizendo "falta: Mercado Pago" muito
# depois de a credencial ter entrado - e um relatório que pede uma coisa já
# feita ensina a não ler o relatório.
PAGAMENTO_LIGADO=1
empurra MP_ACCESS_TOKEN   "${MP_ACCESS_TOKEN:-}" \
  || { PAGAMENTO_LIGADO=0
       info "MP_ACCESS_TOKEN ausente - pagamento fica desligado (o site funciona)."; }
empurra MP_WEBHOOK_SECRET "${MP_WEBHOOK_SECRET:-}" \
  || info "MP_WEBHOOK_SECRET ausente - o webhook recusa tudo, de propósito."
# O Paddle do site em espanhol (PLANO-INGLES.md, etapa 5; worker/src/lib/paddle.js).
empurra PADDLE_API_KEY        "${PADDLE_API_KEY:-}" \
  || info "PADDLE_API_KEY ausente - o checkout em espanhol diz que o pagamento não está ligado."
empurra PADDLE_WEBHOOK_SECRET "${PADDLE_WEBHOOK_SECRET:-}" \
  || info "PADDLE_WEBHOOK_SECRET ausente - o aviso do Paddle recusa tudo, de propósito."
empurra RESEND_API_KEY    "${RESEND_API_KEY:-}" \
  || info "RESEND_API_KEY ausente - ninguém recupera a senha sozinho (ver .env.example)."

# ── 5. construir ──────────────────────────────────────────────────────────
# HF_SKIP_BUILD=1 quando quem chama já construiu - é o caso do GitHub Actions,
# que constrói num passo próprio para aproveitar o cache do npm e para que uma
# falha de build apareça como falha de build, e não como falha de publicação.
echo
bold "5. Construir o site"
if [ "${HF_SKIP_BUILD:-0}" = "1" ] && [ -d app/out-es ]; then
  # Este repositório publica o site em espanhol: o wrangler.toml serve
  # app/out-es, que só a build com NEXT_PUBLIC_LOCALE=es escreve.
  # Um build construído sem NEXT_PUBLIC_PLATFORM_API é a DEMONSTRAÇÃO: as
  # contas moram no navegador e qualquer pedido se aprova sozinho. Publicar
  # isso por cima da loja seria entregar o curso de graça com a tarja de
  # "demonstração" como único aviso. A tarja é prerenderizada no HTML, então
  # ela mesma é a prova.
  if grep -q 'Entorno de demostraci' app/out-es/index.html 2>/dev/null; then
    morre "app/out-es é um build de DEMONSTRAÇÃO, não de plataforma." \
          "Reconstrua com: cd app && NEXT_PUBLIC_LOCALE=es NEXT_PUBLIC_PLATFORM_API=worker npm run build
       (ou rode este script sem HF_SKIP_BUILD, que ele constrói certo)."
  fi
  ok "Já construído ($(find app/out-es -type f | wc -l | tr -d ' ') arquivos)"
else
  if [ ! -d app/node_modules ]; then
    info "Instalando dependências (demora na primeira vez)…"
    (cd app && npm ci) >/dev/null 2>&1 || morre "npm ci falhou em app/." \
      "Rode 'cd app && npm ci' para ver o erro."
  fi
  info "next build em modo plataforma…"
  if (cd app && NEXT_PUBLIC_LOCALE=es HF_I18N_ESTRITO=1 NEXT_PUBLIC_PLATFORM_API=worker npm run build) >/tmp/hf-build.log 2>&1; then
    ok "app/out-es pronto ($(find app/out-es -type f | wc -l | tr -d ' ') arquivos)"
  else
    morre "O build falhou. Últimas linhas:

$(tail -20 /tmp/hf-build.log | sed 's/^/       /')" \
          "O log inteiro está em /tmp/hf-build.log"
  fi
fi

# ── 6. publicar ───────────────────────────────────────────────────────────
echo
bold "6. Publicar"
# Guardado antes de publicar, para a checagem logo abaixo.
HAVE_BEFORE="$(grep -oP 'SITE_ORIGIN\s*=\s*"\K[^"]+' wrangler.toml || true)"

# A versão que está no ar AGORA, para voltar a ela sozinho se as conferências
# do passo 9 falharem (auditoria de 28/09, INFRA-003: #152 e #154 subiram,
# a conferência falhou, e a versão nova ficou no ar sem ninguém desfazer).
# Vazio = primeira publicação, ou o wrangler não respondeu: aí não há para
# onde voltar, e o passo 9 só avisa, como antes.
ANTERIOR="$($W deployments status --json 2>/dev/null | node -e '
  let s = "";
  process.stdin.on("data", d => s += d).on("end", () => {
    try {
      const v = (JSON.parse(s).versions || []).slice().sort((a, b) => (b.percentage || 0) - (a.percentage || 0))[0];
      process.stdout.write(v && v.version_id ? String(v.version_id) : "");
    } catch { /* sem versão anterior conhecida */ }
  });' 2>/dev/null || true)"
if [ -n "$ANTERIOR" ]; then
  info "Versão no ar antes desta publicação: $ANTERIOR (é para ela que se volta se algo falhar)"
else
  info "Não consegui ler a versão no ar agora: se a conferência falhar, não haverá volta automática."
fi

DEPLOY="$($W deploy 2>&1)"
RC=$?

# Quem diz se publicou é o CÓDIGO DE SAÍDA do wrangler, e mais nada.
#
# A versão anterior decidia pela presença de uma URL workers.dev na saída, e
# isso quebrou no dia em que o domínio próprio entrou: com `routes` no
# wrangler.toml e sem `workers_dev`, o wrangler desliga o endereço
# workers.dev. A publicação correu inteira, criou os dois domínios e terminou
# em zero - e o script a declarou falha por não achar um endereço que a
# própria publicação tinha desativado. Ler o resultado de um comando pela
# forma do texto que ele imprime funciona até o texto mudar.
if [ "$RC" -ne 0 ]; then
  if printf '%s' "$DEPLOY" | grep -qi 'workers\.dev.*subdomain\|register.*subdomain'; then
    morre "O Worker subiu, mas a sua conta ainda não tem um subdomínio workers.dev." \
          "Painel → Workers & Pages → Overview → escolha o seu subdomínio.
       Depois rode este script de novo."
  fi
  morre "A publicação falhou. O wrangler disse:

$(printf '%s' "$DEPLOY" | tail -25 | sed 's/^/       /')" \
        "Cole essa mensagem que eu resolvo."
fi

# ── qual é o endereço, agora que publicou ────────────────────────────────
# Um domínio próprio declarado em `routes` É o endereço do site; o workers.dev
# ao lado dele é conferência. Sem domínio, o workers.dev é o endereço.
#
# Extrair a URL workers.dev é mais delicado do que parece, e o jeito ingênuo
# (primeiro workers.dev que aparecer) está ERRADO: antes de publicar, o
# wrangler imprime a tabela de bindings, e ela contém a nossa própria
# variável SITE_ORIGIN -
#
#   env.SITE_ORIGIN ("https://hebreo-fluido.workers.dev")   Environment Variable
#
# - que é justamente o valor de exemplo que estamos tentando substituir. Pegar
# essa linha faz o script "achar" uma URL que não existe, gravar o mesmo
# placeholder de volta e conferir um endereço morto.
#
# A URL de verdade tem TRÊS rótulos antes de workers.dev
# (<worker>.<subdomínio-da-conta>.workers.dev); o placeholder tem dois. É essa
# diferença que separa as duas com segurança.
URL="$(printf '%s' "$DEPLOY" \
  | grep -vE 'env\.|Environment Variable' \
  | grep -oE 'https://[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev' | tail -1)"

# Rede de segurança contra a armadilha descrita acima: se a URL extraída for
# igual ao SITE_ORIGIN que já estava no arquivo, é sinal de que pegamos a
# linha de binding em vez do endereço publicado. Parar aqui é melhor do que
# seguir e conferir um endereço morto - que foi o sintoma original.
if [ "$URL" = "${HAVE_BEFORE:-}" ] && [ "${HAVE_BEFORE:-}" = "https://hebreo-fluido.workers.dev" ]; then
  morre "A URL extraída é o valor de exemplo, não o endereço publicado." \
        "É um defeito deste script na leitura da saída do wrangler.
       Me mande a saída inteira de 'npx wrangler deploy'."
fi

# O domínio próprio sai do wrangler.toml, e não da saída do wrangler: é o
# arquivo que manda em qual endereço o site atende. O www é descartado aqui
# porque ele existe para redirecionar, não para ser o endereço.
# Só as linhas de verdade: o exemplo comentado no toml do site em espanhol
# ("<dominio>") virou SITE_ORIGIN em 29/10/2026 e o link do e-mail saiu quebrado.
DOMINIO="$(grep -vE '^\s*#' wrangler.toml \
  | grep -oP 'pattern\s*=\s*"\K[^"]+(?="\s*,\s*custom_domain\s*=\s*true)' \
  | grep -v '^www\.' | head -1)"

if [ -n "$DOMINIO" ]; then
  ok "No ar: https://$DOMINIO"
  [ -n "$URL" ] && info "Conferência: $URL"
  URL="https://$DOMINIO"
elif [ -n "$URL" ]; then
  ok "No ar: $URL"
else
  morre "O wrangler publicou sem erro, mas não sobrou endereço nenhum: não há
       domínio próprio em 'routes' e o workers.dev não apareceu na saída." \
        "Acrescente 'workers_dev = true' ao wrangler.toml, ou declare o
       domínio em 'routes'. Um dos dois precisa existir."
fi

# ── 7. SITE_ORIGIN ────────────────────────────────────────────────────────
# O cron não tem requisição de onde deduzir a origem, e o back_urls da
# Mercado Pago é montado a partir dela. Errada, o comprador volta para o
# lugar errado depois de pagar.
echo
bold "7. SITE_ORIGIN"
HAVE="$(grep -oP 'SITE_ORIGIN\s*=\s*"\K[^"]+' wrangler.toml || true)"

# Um SITE_ORIGIN que NÃO é workers.dev é uma escolha, não um resíduo.
#
# Este passo existe para preencher o endereço na primeira publicação de uma
# conta nova, quando o único endereço que existe é o workers.dev. No dia em
# que um domínio próprio entra, o endereço passa a ser o domínio - e um
# script que continuasse "corrigindo" o arquivo para o workers.dev desfaria a
# mudança em toda publicação, silenciosamente. O sintoma seria caro e
# indireto: o comprador voltaria da Mercado Pago para o endereço errado.
case "$HAVE" in
  https://*.workers.dev|'') ;;                 # ainda no endereço de fábrica
  *)
    # Se o workers.dev responde ou não é decisão do wrangler.toml, e a
    # mensagem lê de lá: afirmar "continua respondendo" sem olhar foi
    # verdade por um tempo e depois virou uma linha que mentia a cada
    # publicação, no meio de uma saída que ninguém lê com desconfiança.
    if grep -qE '^\s*workers_dev\s*=\s*true\s*$' wrangler.toml; then
      ok "Domínio próprio em uso: $HAVE (o workers.dev também responde)"
    else
      ok "Domínio próprio em uso: $HAVE (só ele: workers_dev = false)"
    fi
    URL="$HAVE"
    ;;
esac

if [ "$HAVE" = "$URL" ]; then
  ok "Já aponta para $URL"
else
  python3 - "$URL" <<'PY'
import re, sys
p = 'wrangler.toml'
s = open(p, encoding='utf8').read()
s = re.sub(r'(SITE_ORIGIN\s*=\s*")[^"]*(")', lambda m: m.group(1) + sys.argv[1] + m.group(2), s, count=1)
open(p, 'w', encoding='utf8').write(s)
PY
  info "SITE_ORIGIN ← $URL - republicando…"
  PATCHED=1
  $W deploy >/dev/null 2>&1 && ok "Republicado" || info "A republicação falhou; rode 'npx wrangler deploy'."
fi

# ── 8. o desafio de bot da zona ───────────────────────────────────────────
# O "Bot Fight Mode" da Cloudflare desafia o que ela julga automatizado. Isso
# soa bom até lembrar que ESTE SITE É UMA API: /api/auth/login, /api/me,
# /api/progress e o webhook de pagamento são todas requisições sem navegador
# do outro lado, e todas passam pela mesma porta.
#
# O que aconteceu aqui: o domínio entrou, a zona veio com o desafio ligado, e
# a publicação seguinte recebeu 403 em TUDO - capa, API, saúde. Nas trinta e
# uma linhas vermelhas não havia uma palavra sobre Cloudflare; o motivo só
# apareceu quando o navegador tentou carregar
# `challenges.cloudflare.com/cdn-cgi/challenge-platform` e falhou.
#
# Por isso isto é parte da publicação, e não um lembrete no README: é uma
# configuração que quebra o produto e que ninguém associa ao produto.
#
# Nunca derruba a publicação. O token padrão de Workers não tem permissão de
# zona, e nesse caso o passo diz exatamente o que acrescentar - do mesmo
# jeito que o passo do D1 faz com o erro 7003.
echo
bold "8. Desafio de bot na zona"
ZONA="$(printf '%s' "$URL" | sed -e 's#^https\?://##' -e 's#/.*##')"
case "$ZONA" in
  ''|*.workers.dev)
    info "Sem domínio próprio - a zona não é nossa, nada a fazer."
    ;;
  *)
    CFAPI="https://api.cloudflare.com/client/v4"
    # O token vai por um arquivo de configuração do curl, e não em `-H` na
    # linha de comando: argumentos de processo são legíveis por qualquer
    # outro processo da máquina enquanto o curl roda.
    CFCONF="$(mktemp)"; trap 'rm -f "$CFCONF"' EXIT
    printf 'header = "Authorization: Bearer %s"\nheader = "Content-Type: application/json"\n' \
      "${CLOUDFLARE_API_TOKEN:-}" > "$CFCONF"
    cf() { curl -s -K "$CFCONF" "$@"; }
    # O nome da zona é o domínio registrável: `hebraicofluente.com.br` tem
    # três rótulos, e é ele que a Cloudflare conhece - não um subdomínio.
    ZID="$(cf "$CFAPI/zones?name=$ZONA" | python3 -c "
import sys,json
try: d=json.load(sys.stdin)
except Exception: d={}
r=(d.get('result') or [])
print(r[0]['id'] if r else '')
" 2>/dev/null)"

    if [ -z "$ZID" ]; then
      info "Não consegui ler a zona $ZONA com este token."
      info "Se o site responder 403 a tudo, é quase certo ser o Bot Fight Mode."
      info "Acrescente ao token: Zone | Zone | Read  e  Zone | Bot Management | Edit"
      info "(ou desligue à mão: painel → $ZONA → Security → Bots)."
    else
      ATUAL="$(cf "$CFAPI/zones/$ZID/bot_management" | python3 -c "
import sys,json
try: d=json.load(sys.stdin)
except Exception: d={}
print(str((d.get('result') or {}).get('fight_mode','?')).lower())
" 2>/dev/null)"

      case "$ATUAL" in
        false)
          ok "Bot Fight Mode já está desligado"
          ;;
        true)
          info "Bot Fight Mode está LIGADO - ele desafia a nossa própria API. Desligando…"
          RESP="$(cf -X PUT "$CFAPI/zones/$ZID/bot_management" --data '{"fight_mode":false}')"
          if printf '%s' "$RESP" | grep -q '"success":true'; then
            ok "Bot Fight Mode desligado"
          else
            erro "Não consegui desligar. A Cloudflare respondeu:"
            printf '%s\n' "$RESP" | head -c 400 | sed 's/^/       /'
            echo
            info "Falta permissão no token: Zone | Bot Management | Edit."
            info "Ou desligue à mão: painel → $ZONA → Security → Bots."
          fi
          ;;
        *)
          info "Não consegui ler o estado do Bot Fight Mode (token sem Bot Management)."
          info "Se o site responder 403 a tudo, desligue à mão em Security → Bots."
          ;;
      esac

      # ── freio na BORDA ───────────────────────────────────────────────
      # O Worker já freia toda rota da API, e isso é a defesa que conta: ela
      # sabe de quem é a conta, quantas falhas houve, e responde um código
      # que o app entende. O que ela não faz é ser barata: cada recusa custa
      # uma execução do Worker e uma escrita no D1. A borda recusa ANTES,
      # sem gastar nada nosso.
      #
      # Duas decisões que valem a nota:
      #
      # · A ação é `block`, nunca `managed_challenge`. Um desafio devolve uma
      #   PÁGINA para um `fetch()` que espera JSON - o login não mostraria
      #   "muitas tentativas", mostraria um erro incompreensível, e o
      #   comprador legítimo atrás de um IP compartilhado ficaria de fora sem
      #   entender o quê. Bloquear é honesto: o app já sabe ler um 429.
      #
      # · Os tetos são altos de propósito. Estes números não existem para
      #   substituir o freio do Worker (30 tentativas de senha por minuto ali
      #   continuam valendo); existem para cortar o que é ordens de grandeza
      #   maior - o laço que tenta dez mil senhas, não a pessoa que errou a
      #   sua três vezes. Um teto apertado aqui derruba cliente de verdade em
      #   rede corporativa, e ninguém descobre o motivo.
      #
      # DUAS coisas variam com o plano da zona, e as duas foram descobertas do
      # jeito caro - publicando e lendo o erro. Por isso aqui não há chute: há
      # uma ESCADA, e o script desce até o degrau que a zona aceita.
      #
      # · QUANTAS regras cabem. O gratuito permite uma; os pagos, mais. As
      #   regras vão em ordem de valor e o script tenta do conjunto inteiro
      #   para baixo.
      #
      # · QUE JANELA cabe. O gratuito só aceita 10 segundos, e recusou 60 com
      #   "not entitled to use the period 60, can only use a period among
      #   [10]" - a recusa DIZ o que existe, então o script lê e usa.
      #
      # O que NÃO varia, e por um tempo eu achei que variava: as
      # características de contagem. `cf.colo.id` é OBRIGATÓRIO, em qualquer
      # plano, e a API é explícita -
      #
      #   '[ip.src]' is not a valid value for characteristics because
      #   characteristics field is missing 'cf.colo.id', this is required as
      #   ratelimiting counting is processed at colocation level only
      #
      # - porque a contagem acontece por datacenter, não globalmente. Houve um
      # degrau de "ip.src sozinho" nesta escada, baseado num palpite meu de que
      # o plano gratuito talvez não aceitasse cf.colo.id. Era o contrário, e o
      # degrau nunca poderia dar certo. Saiu.
      #
      # O TETO não encolhe junto com a janela, de propósito. Converter
      # "30 por minuto" para "5 por 10 segundos" manteria a taxa média e
      # apertaria a rajada seis vezes - e um teto apertado aqui derruba um
      # escritório inteiro atrás de um IP só, sem ninguém descobrir o motivo.
      # Esta camada não existe para ser o freio fino (esse é o do Worker, que
      # continua valendo); existe para cortar o que é ordens de grandeza
      # maior. 30 pedidos em 10 segundos já é muito além de qualquer pessoa.
      #
      # E o relato NUNCA fica calado. Uma versão anterior deste passo imprimia
      # os primeiros 300 bytes do JSON cru (que não cabia a resposta formatada
      # da Cloudflare) e depois passou a imprimir as mensagens do JSON - que
      # numa das recusas vieram vazias, deixando na tela "A Cloudflare disse:"
      # seguido de nada. Um diagnóstico que pode ficar em branco é pior do que
      # nenhum, porque parece que não houve erro.
      #
      # ── o erro mais caro desta história ──────────────────────────────
      # O sucesso era conferido com `grep '"success":true'`. A Cloudflare
      # responde JSON FORMATADO, com `"success": true` - um espaço. Então o
      # script criou as regras, leu a confirmação, não a reconheceu, e relatou
      # fracasso. Duas publicações seguidas disseram "não consegui" sobre uma
      # coisa que tinha funcionado, e me levaram a inventar teoria sobre planos
      # e características que não existia.
      #
      # Agora quem decide é um analisador de JSON, não um casamento de texto. E
      # o passo termina PERGUNTANDO à zona quantas regras estão lá - porque a
      # resposta de uma escrita é o que o servidor diz que fez, e uma leitura
      # depois é o que ele realmente tem.
      echo
      bold "8b. Freio na borda"
      RLSET="$CFAPI/zones/$ZID/rulesets/phases/http_ratelimit/entrypoint"

      regra() { # caminho teto segundos descricao caracteristicas-separadas-por-virgula
        python3 - "$1" "$2" "$3" "$4" "$5" <<'PY'
import json,sys
caminho,teto,janela,desc,caract=sys.argv[1:6]
print(json.dumps({
  "description": desc,
  "expression": f'(http.request.uri.path wildcard "{caminho}")',
  "action": "block",
  "ratelimit": {
    "characteristics": [c for c in caract.split(',') if c],
    "period": int(janela),
    "requests_per_period": int(teto),
    "mitigation_timeout": int(janela),
  },
}))
PY
      }

      posta() { # rules-json
        cf -X PUT "$RLSET" --data "{\"rules\":[$1]}"
      }

      # As janelas que a recusa disser que existem, na ordem em que vieram.
      # Vazio quando o erro for outro - e aí não há segunda tentativa a fazer.
      periodos_oferecidos() { # resposta-json
        printf '%s' "$1" | python3 -c "
import sys,re
t=sys.stdin.read()
m=re.search(r'can only use a period among \[([0-9, ]+)\]', t)
print(' '.join(m.group(1).replace(' ','').split(',')) if m else '')
" 2>/dev/null
      }

      # O motivo da recusa, em uma linha, e NUNCA em branco.
      #
      # Primeiro tenta as mensagens do JSON, que é a forma legível. Se não vier
      # nenhuma - resposta vazia, um 502 do caminho, um HTML de portal - cai
      # para a resposta crua encolhida numa linha. Uma versão anterior deste
      # passo imprimia "A Cloudflare disse:" e nada, e passar a impressão de
      # que não houve erro é o pior resultado possível para um diagnóstico.
      motivo() { # resposta-json → uma linha
        printf '%s' "$1" | python3 -c "
import sys,json,re
t=sys.stdin.read()
try: d=json.loads(t)
except Exception: d={}
ms=[]
for e in (d.get('errors') or []):
    p=(e.get('source') or {}).get('pointer','')
    ms.append(f\"{e.get('message','?')}{' at ' + p if p else ''}\")
if ms: print(' | '.join(ms))
else:
    cru=re.sub(r'\s+',' ',t).strip()
    print(cru[:220] if cru else '(resposta vazia - a chamada não chegou a responder)')
" 2>/dev/null
      }

      # Deu certo? Quem responde é um analisador de JSON.
      #
      # `grep '"success":true'` parecia equivalente e não era: a resposta vem
      # formatada, com espaço depois dos dois-pontos, e o casamento de texto
      # falhava numa escrita que tinha funcionado. Ver a nota acima.
      sucesso() { # resposta-json → 0 se a API disse que sim
        printf '%s' "$1" | python3 -c "
import sys,json
try: sys.exit(0 if json.load(sys.stdin).get('success') is True else 1)
except Exception: sys.exit(1)
" 2>/dev/null
      }

      # Quantas regras a zona TEM agora, perguntando a ela. A resposta de uma
      # escrita diz o que o servidor afirma ter feito; uma leitura depois diz o
      # que ele tem. Para um passo que já mentiu nos dois sentidos, vale a
      # chamada a mais.
      quantas_no_ar() {
        cf "$RLSET" | python3 -c "
import sys,json
try: d=json.load(sys.stdin)
except Exception: print('?'); sys.exit()
r=(d.get('result') or {}).get('rules') or []
print(len([x for x in r if 'HF:' in (x.get('description') or '')]))
" 2>/dev/null
      }

      CARACT='ip.src,cf.colo.id'

      # Da mais específica para a mais geral: a Cloudflare aplica a primeira
      # que casar, então `/api/*` por último ou ele engoliria as outras.
      tentar() { # janela → 0 e imprime, ou 1
        local J="$1"
        local A B C
        A="$(regra '/api/auth/*' 30 "$J" "HF: freio em /api/auth/* (30 por ${J}s por IP)" "$CARACT")"
        B="$(regra '/api/pay/*'  30 "$J" "HF: freio em /api/pay/* (30 por ${J}s por IP)" "$CARACT")"
        C="$(regra '/api/*'     300 "$J" "HF: freio em /api/* (300 por ${J}s por IP)" "$CARACT")"
        for TENTATIVA in "$A,$B,$C" "$A,$C" "$A"; do
          RESP="$(posta "$TENTATIVA")"
          if sucesso "$RESP"; then
            APLICOU="$(printf '%s' "$TENTATIVA" | grep -o '"description"' | wc -l | tr -d ' ')"
            ok "Freio na borda: $APLICOU regra(s) enviada(s), janela de ${J}s."
            return 0
          fi
          # Guarda o que a zona disse, uma vez por motivo distinto. É este
          # registro que fica no resumo quando nenhum degrau serve.
          local M; M="$(motivo "$RESP")"
          case "$VISTOS" in
            *"$M"*) ;;
            *) VISTOS="${VISTOS}${VISTOS:+
}${J}s → ${M}" ;;
          esac
        done
        return 1
      }

      # A escada de janelas. `periodos_oferecidos` entra no meio: quando a
      # recusa de 60s diz quais existem, é essa a próxima tentada - a API sabe
      # melhor do que uma lista escrita aqui.
      APLICOU=0
      VISTOS=""
      JANELAS="60"
      if ! tentar 60; then
        for J in $(periodos_oferecidos "${RESP:-}") 10; do
          case " $JANELAS " in *" $J "*) continue ;; esac
          JANELAS="$JANELAS $J"
          tentar "$J" && break
        done
      fi

      # A confirmação, lida da zona. Roda mesmo quando a escada achou que
      # falhou: se as regras estiverem lá, é isso que interessa saber.
      NO_AR="$(quantas_no_ar)"
      case "$NO_AR" in
        ''|'?'|0) ;;
        *) ok "Confirmado na zona: $NO_AR regra(s) de freio no ar." ; APLICOU="$NO_AR" ;;
      esac

      if [ "$APLICOU" = "0" ]; then
        # Nunca derruba a publicação: é defesa em profundidade, e a camada
        # que conta (o Worker) já está de pé.
        info "Não consegui criar as regras de freio na borda. Cada degrau tentado,"
        info "e o que a Cloudflare respondeu:"
        printf '%s\n' "$VISTOS" | sed 's/^/       /'
        info "Se algum motivo falar em permissão, acrescente ao token:"
        info "  Zone | Zone WAF | Edit   (ou Rulesets | Edit)"
        info "Ou crie à mão em Security → WAF → Rate limiting rules:"
        info "  /api/auth/* e /api/pay/*  30 por janela, por IP · bloquear"
        info "  /api/*                   300 por janela, por IP · bloquear"
        info "O freio do Worker continua valendo de qualquer jeito."
      fi
    fi
    ;;
esac

# ── 9. conferir ───────────────────────────────────────────────────────────
echo
bold "9. Conferir o que subiu"

# Espera o endereço começar a responder. Um domínio próprio recém-criado leva
# alguns minutos até o certificado sair e a rota valer - conferir antes disso
# produz uma tela de falhas que não são falhas.
#
# Deixa o último código em ULTIMO em vez de imprimi-lo: numa substituição de
# comando, tudo que a função escrevesse na saída seria engolido - inclusive o
# "respondeu depois de tantos segundos", que é a informação útil quando dá
# certo na terceira tentativa.
ULTIMO=''
espera_subir() {
  local alvo="$1" i
  for i in $(seq 1 24); do
    ULTIMO="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$alvo/" 2>/dev/null)"
    if [ "$ULTIMO" = "200" ]; then
      [ "$i" -gt 1 ] && info "Respondeu depois de $((i * 5))s."
      return 0
    fi
    sleep 5
  done
  return 1
}

if ! espera_subir "$URL"; then
  # Dois minutos sem 200. Antes de despejar trinta falhas iguais, a pergunta
  # que importa é se o problema é o WORKER ou o ENDEREÇO - e é exatamente para
  # isso que o workers.dev existe (ver `workers_dev` no wrangler.toml).
  erro "$URL respondeu $ULTIMO por 2 minutos, e não 200."
  DEV="$(printf '%s' "$DEPLOY" | grep -vE 'env\.|Environment Variable' \
        | grep -oE 'https://[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev' | tail -1)"
  if [ -n "$DEV" ]; then
    DEVC="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$DEV/" 2>/dev/null)"
    if [ "$DEVC" = "200" ]; then
      info "Mas $DEV responde 200: o Worker está bom, o problema é o domínio."
      info "Olhe a zona no painel: regra de segurança, Bot Fight Mode, modo"
      info "\"Under Attack\", ou o certificado do domínio ainda saindo."
      info "Conferindo pelo workers.dev, para que as checagens abaixo valham."
      URL="$DEV"
    else
      info "E $DEV respondeu $DEVC: o problema está no Worker, não no domínio."
    fi
  fi
fi

HF_BASE="$URL" bash worker/e2e.sh
RC=$?

# ── 10. voltar sozinho, se a conferência falhou ──────────────────────────
# Uma falha pode ser passageira (a do portão no #154 passou na segunda
# tentativa, com o mesmo código), e desfazer uma versão boa por ruído seria
# pior do que o ruído. Então: uma segunda conferência; se ela também falhar,
# volta para a versão anterior e confere que o site responde.
#
# O que o rollback NÃO desfaz: o schema (só cresce, e a versão anterior
# convive com tabelas a mais) e os segredos já enviados no passo 4.
if [ $RC -ne 0 ]; then
  echo
  bold "10. A conferência falhou: tentando mais uma vez antes de voltar"
  HF_BASE="$URL" bash worker/e2e.sh
  RC=$?
  if [ $RC -ne 0 ] && [ -n "$ANTERIOR" ]; then
    bold "Falhou de novo. Voltando para a versão anterior ($ANTERIOR)."
    if $W rollback "$ANTERIOR" -m "Conferência pós-publicação falhou duas vezes (deploy automático)" -y >/tmp/hf-rollback 2>&1; then
      if espera_subir "$URL"; then
        ok "De volta à versão anterior; $URL responde."
      else
        erro "Voltei para a versão anterior, mas $URL respondeu $ULTIMO."
      fi
    else
      erro "O rollback automático falhou. O wrangler disse:"
      tail -15 /tmp/hf-rollback | sed 's/^/       /'
      info "Volte à mão: npx wrangler rollback $ANTERIOR"
    fi
    VOLTOU=1
  elif [ $RC -ne 0 ]; then
    erro "Sem versão anterior conhecida: a versão nova continua no ar."
  else
    ok "Na segunda conferência passou: a falha anterior foi passageira."
  fi
fi

echo
if [ $RC -eq 0 ]; then
  bold "Pronto. $URL"
elif [ "${VOLTOU:-0}" = "1" ]; then
  bold "A versão nova NÃO ficou no ar: a conferência falhou duas vezes e o site voltou à anterior."
else
  bold "Subiu, mas alguma verificação falhou (acima)."
fi

echo
if [ "$PATCHED" = "1" ]; then
  echo "  O wrangler.toml foi editado (database_id e/ou SITE_ORIGIN):"
  echo "    git add wrangler.toml && git commit -m 'database_id e SITE_ORIGIN'"
  echo "  Sem esse commit, o arquivo do repositório continua com o valor de"
  echo "  exemplo - funciona aqui e falha para quem publicar de outro lugar."
  echo
fi
if [ "$PAGAMENTO_LIGADO" = "0" ]; then
  echo "  Falta, quando você quiser:"
  echo "   · Mercado Pago: os dois segredos e o webhook em $URL/api/pay/webhook"
else
  echo "  Pagamento ligado. O webhook da Mercado Pago aponta para:"
  echo "   · $URL/api/pay/webhook"
fi
echo
exit $RC
