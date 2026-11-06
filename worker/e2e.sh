#!/bin/bash
# Prova de ponta a ponta do Worker, contra um `wrangler dev` local.
# ──────────────────────────────────────────────────────────────────────────
# O que ela cobre é o que não pode estar errado: quem entra, quem é barrado,
# quanto é cobrado e o que acontece quando o acesso vence. O que ela NÃO cobre
# é a Mercado Pago de verdade - com um token falso, criar um pedido tem de
# falhar limpo (502) e deixar o pedido registrado, e é isso que o passo C
# verifica.
#
# Rodar:
#   npm run build:platform
#   npx wrangler d1 execute fluent-hebrew --file=worker/schema.sql --local
#   npx wrangler dev --local --port 8787 &
#   bash worker/e2e.sh
#
# Precisa de um .dev.vars com SESSION_SECRET (ver .env.example). Os valores de
# Mercado Pago podem ser falsos: nada aqui chega a cobrar.
#
# ⚠ Não use `curl -o /dev/stdout` neste arquivo. Quando a saída do script está
# redirecionada para um arquivo, /dev/stdout É esse arquivo, e o curl o abre
# truncando - cada chamada apagaria tudo que veio antes. Levou uma execução
# inteira para descobrir isso.

set -u
B="${HF_BASE:-http://127.0.0.1:8787}"
JAR="$(mktemp)"
# Domínio .invalid (RFC 2606): reservado, jamais resolve, ninguém consegue
# receber e-mail nele. Isso importa porque a limpeza automática no fim da
# publicação apaga por PADRÃO de endereço - e um padrão que pudesse casar com
# o e-mail de um aluno de verdade seria uma forma criativa de apagar cliente.
MAIL="hf-e2e-$RANDOM@example.invalid"
fails=0

G() { curl -s --noproxy '*' "$@"; }

# O site em inglês (LOCALE = "en" no wrangler.toml deste repositório) cobra
# pelo Paddle, em dólar, e não tem a prévia do e-book nem o curso A1. As
# conferências que dependem disso escolhem pelo mesmo arquivo que a
# publicação usou.
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
# O site em espanhol (LOCALE = "es", Moshikgueta/hebreo-fluido) é de fora do
# mesmo jeito: Paddle, dólar, sem prévia nem A1. EM_INGLES quer dizer "site de
# fora"; o nome ficou do tempo em que o inglês era o único.
EM_INGLES=0
grep -qE '^LOCALE *= *"(en|es)"' "$RAIZ/wrangler.toml" 2>/dev/null && EM_INGLES=1

# espera <descrição> <esperado> <obtido>
espera() {
  if [ "$2" = "$3" ]; then
    printf '  ✓ %s\n' "$1"
  else
    printf '  ✗ %s - esperava %s, veio %s\n' "$1" "$2" "$3"
    fails=$((fails + 1))
  fi
}

code()     { G -o /dev/null -w '%{http_code}' "$@"; }
location() { G -o /dev/null -D - -H 'Sec-Fetch-Dest: document' "$@" \
               | grep -i '^location:' | sed 's/^[Ll]ocation: *//' | tr -d '\r'; }

# Quem respondeu, quando não foi o nosso Worker.
# ──────────────────────────────────────────────────────────────────────────
# Uma publicação em que TODAS as verificações falham com o mesmo código não é
# trinta e uma falhas: é uma só, e nenhuma das trinta e uma linhas diz qual.
# Aconteceu com um 403 em tudo - e "403" sozinho não distingue o Worker
# recusando, a Cloudflare bloqueando o curl, e um domínio que ainda não
# entrega. A resposta está nos cabeçalhos e no <title>, e eles custam uma
# chamada.
#
# Só roda quando alguma coisa já falhou, e uma vez.
diagnostico_feito=0
diagnostico() {
  [ "$diagnostico_feito" = "1" ] && return 0
  diagnostico_feito=1
  local url="$1" cab corpo
  echo
  echo "  Quem está respondendo em $url:"
  cab="$(G -o /dev/null -D - -H 'Sec-Fetch-Dest: document' "$url" 2>/dev/null)"
  # Os cabeçalhos que dizem de quem é a resposta. `cf-mitigated` aparece
  # quando é a Cloudflare barrando (WAF, Bot Fight Mode, Under Attack); a
  # ausência dele com `server: cloudflare` aponta para o Worker ou para o
  # roteamento do domínio.
  printf '%s' "$cab" | grep -iE '^(HTTP/|server:|cf-ray:|cf-mitigated:|cf-cache-status:|content-type:)' \
    | sed 's/^/    /' | tr -d '\r'
  corpo="$(G -H 'Sec-Fetch-Dest: document' "$url" 2>/dev/null)"
  local titulo
  titulo="$(grep -oiE '<title[^>]*>[^<]*' <<<"$corpo" | head -1 | sed 's/<[^>]*>//')"
  [ -n "$titulo" ] && echo "    título: $titulo"
  # O texto visível das primeiras linhas, sem marcação. Numa página de bloqueio
  # da Cloudflare é aqui que aparece o motivo em português claro.
  sed -e 's/<[^>]*>/ /g' -e 's/  */ /g' <<<"$corpo" | grep -vE '^\s*$' | head -4 \
    | sed 's/^ */    /'
  echo
}

# Primeiro a saúde. Sem isto, uma publicação sem banco ou sem SESSION_SECRET
# produz nove falhas idênticas - todas "veio 500" - e nenhuma delas diz qual
# das três peças está faltando. Com isto, a causa aparece na primeira linha.
echo "Saúde"

# A saúde é consultada com algumas tentativas, e não uma vez só.
#
# Quando esta conferência roda logo depois de uma publicação - que é o caso no
# CI -, os primeiros segundos ainda podem ser respondidos pela versão ANTERIOR
# do Worker. Um campo que acabou de nascer volta ausente, e a checagem acusa
# uma falha que não existe: foi exatamente isso que aconteceu quando `progresso`
# entrou. Quinze segundos de paciência cobrem a propagação; passado isso, o
# campo ausente é falha de verdade e é assim que ela aparece.
#
# Os detalhes da saúde só saem com o ADMIN_TOKEN (auditoria de 01/10/2026,
# SEC-A-007): para o público, /api/health responde só `ok` e `monitor`. A
# publicação gera o token, o põe no Worker e o entrega aqui em
# HF_ADMIN_TOKEN (scripts/cloudflare-setup.sh, passo 4). Sem ele (uma
# passagem à mão), as conferências de detalhe ficam de fora e isso é dito.
SAUDE_AUT=()
[ -n "${HF_ADMIN_TOKEN:-}" ] && SAUDE_AUT=(-H "Authorization: Bearer $HF_ADMIN_TOKEN")
saude() { G --max-time 15 ${SAUDE_AUT[@]+"${SAUDE_AUT[@]}"} "$B/api/health"; }
HEALTH=''
for _ in 1 2 3 4 5; do
  HEALTH="$(saude)"
  # O campo MAIS NOVO é o sinal de que a versão nova já está respondendo.
  # Trocar quando um campo novo entra faz parte de acrescentá-lo. Sem token,
  # a resposta é a pública, e o sinal é ela ter só os dois campos.
  if [ -n "${HF_ADMIN_TOKEN:-}" ]; then
    case "$HEALTH" in *'"verificacao"'*) break ;; esac
  else
    case "$HEALTH" in *'"ok"'*'"monitor"'*) case "$HEALTH" in *'"db"'*) ;; *) break ;; esac ;; esac
  fi
  sleep 3
done
campo() { grep -o "\"$1\":[a-z]*" <<<"$HEALTH" | cut -d: -f2; }
PUBLICA="$(G --max-time 15 "$B/api/health")"
espera "a saúde pública diz só ok e monitor" nao \
  "$(grep -qE '"(db|modo|vendedor|tokenFormato|emailEntregue|varredura)"' <<<"$PUBLICA" && echo sim || echo nao)"
if [ -z "${HF_ADMIN_TOKEN:-}" ]; then
  echo "  · sem HF_ADMIN_TOKEN: conferindo só o 'ok' público; tabelas, sessão,"
  echo "    e-mail e cobrança ficam de fora desta passagem."
  espera "a saúde pública diz ok" true "$(campo ok)"
else
espera "o ADMIN_TOKEN abre os detalhes da saúde" true "$(grep -q '"db"' <<<"$HEALTH" && echo true || echo false)"
espera "ligação com o banco (D1)"      true "$(campo db)"
espera "tabelas criadas (schema.sql)"  true "$(campo schema)"
espera "tabela de progresso criada"    true "$(campo progresso)"
espera "tabela de recuperação criada"  true "$(campo recuperacao)"
# A de confirmação de e-mail (24/09/2026). Sem ela o site funciona igual e
# ninguém confirma o e-mail - e a publicação não aplica o schema.sql, então
# este ✗ é o aviso de que falta rodá-lo (ver o topo de worker/schema.sql).
espera "tabela de confirmação de e-mail criada" true "$(campo verificacao)"
espera "SESSION_SECRET definido"       true "$(campo session)"
if [ "$(campo payments)" != "true" ]; then
  if [ "$EM_INGLES" = 1 ]; then
    echo "  · pagamento desligado (sem a chave do Stripe, ou do Paddle e o token do"
    echo "    Paddle.js, ou de outro ambiente) - o site funciona assim"
  else
    echo "  · pagamento desligado (MP_ACCESS_TOKEN ausente) - o site funciona assim"
  fi
fi
# Sem provedor de e-mail o site sobe inteiro e "esqueci minha senha" não
# entrega o link a ninguém. Não é falha de publicação - é uma peça que falta,
# e ela precisa aparecer no log em vez de ficar implícita.
if [ "$(campo email)" != "true" ]; then
  echo "  · e-mail desligado (RESEND_API_KEY ou EMAIL_FROM ausente) - ninguém"
  echo "    recupera a senha sozinho. Ver .env.example."
fi
# `emailEntregue` NÃO é conferido aqui, e a tentação de fazê-lo custou uma
# falsa falha: este bloco roda ANTES de a seção "Senha" pedir qualquer link,
# então o campo só pode refletir a execução ANTERIOR. Na primeira publicação
# depois de a chave entrar, ele lê o estado de antes dela - "sem-provedor" - e
# acusa uma recusa que não houve, mandando quem lê conferir DNS à toa.
# A conferência de verdade está no fim, depois dos envios desta passagem.
if [ "$(campo ok)" != "true" ]; then
  echo
  echo "  A publicação está incompleta. As falhas abaixo são consequência disso;"
  echo "  conserte o que está marcado ✗ aqui em cima primeiro."
  echo
fi
fi  # fim das conferências que pedem HF_ADMIN_TOKEN

# O site de vendas inteiro, SEM conta nenhuma. É o requisito mais óbvio da
# plataforma e o mais fácil de quebrar sem perceber: basta um prefixo a mais na
# lista do portão e uma página de vendas some atrás de um login. Quem não
# consegue ver o curso não compra o curso.
#
# `code` não segue redirecionamento de propósito: 200 aqui significa "a página
# abriu", e um 302 - mesmo que fosse para algum lugar bonito - é exatamente a
# falha que este bloco existe para pegar.
echo "Site público, sem conta"
PUBLICAS="/ /metodo/ /cursos/ /curso-de-hebraico/ /sobre/ /faq/ /entrar/ /criar-conta/ /checkout/alfabetizacao/"
# O A1 não entra no catálogo em inglês (sem price.usd): a página não existe lá.
[ "$EM_INGLES" = 1 ] || PUBLICAS="$PUBLICAS /cursos/hebraico-a1/"
for p in $PUBLICAS; do
  c="$(code -H 'Sec-Fetch-Dest: document' "$B$p")"
  espera "$p abre" 200 "$c"
  # A primeira página que não abre já diz quem respondeu. Sem isto, as dez
  # linhas seguintes repetem o mesmo código sem acrescentar nada.
  [ "$c" = "200" ] || diagnostico "$B$p"
done

# A busca (31/10/2026, auditoria de SEO): o robots.txt que vai ao ar é o NOSSO
# (app/seo.mjs), e não o "robots.txt gerenciado" da Cloudflare, que acrescenta
# Disallow para robôs de IA quando o painel liga "bloquear robôs de IA". Isso
# é configuração da conta, não defeito da versão: AVISA e não conta como
# falha, para não desfazer uma publicação boa. Os robôs de BUSCA por IA
# (OAI-SearchBot, ChatGPT-User, PerplexityBot) bloqueados tiram o site das
# respostas desses assistentes; os de treino (GPTBot, CCBot) são escolha do dono.
echo "A busca: robots.txt, sitemap e o espelho da capa"
ROBOTS="$(G "$B/robots.txt")"
espera "robots.txt aponta o sitemap" 1 "$(grep -c '^Sitemap: .*/sitemap.xml' <<<"$ROBOTS")"
espera "sitemap.xml responde" 200 "$(code "$B/sitemap.xml")"
espera "o espelho da capa fica fora do sitemap" 0 "$(G "$B/sitemap.xml" | grep -c 'curso-de-hebraico')"
espera "/curso-de-hebraico/ declara a capa como canonical" 1 \
  "$(G -H 'Sec-Fetch-Dest: document' "$B/curso-de-hebraico/" | grep -c 'rel="canonical" href="https://[^/"]*/"')"
if grep -qiE '^Disallow: */ *$' <<<"$ROBOTS"; then
  BLOQUEADOS="$(awk 'tolower($1)=="user-agent:"{ua=$2} tolower($1)=="disallow:" && ($2=="/"||$2=="/ "){print ua}' <<<"$ROBOTS" | sort -u | tr '\n' ' ')"
  printf '  ! AVISO: o robots.txt no ar bloqueia o site inteiro para: %s\n' "$BLOQUEADOS"
  printf '    (Cloudflare: Segurança > Bots / AI Crawl Control. Ver audit/2026-10-31-seo/RELATORIO.md, seção 9.)\n'
  grep -qiE '^User-agent: *(\*|Googlebot|Bingbot) *$' <<<"$(awk 'tolower($1)=="user-agent:"{ua=$0} tolower($1)=="disallow:" && $2=="/"{print ua}' <<<"$ROBOTS")" \
    && { printf '  ✗ o robots.txt no ar bloqueia o Google ou o Bing\n'; fails=$((fails + 1)); }
else
  printf '  ✓ o robots.txt no ar não bloqueia nenhum robô\n'
fi

# A prévia grátis do e-book (23/10/2026): o link que vai no direct a quem
# comenta EBOOK. Abre sem conta, fica fora da busca e não vende o livro (que
# continua aVenda: false). O nome antigo do livro não pode aparecer.
if [ "$EM_INGLES" = 1 ]; then
  # O site em inglês não monta a prévia (o livro é só do site brasileiro).
  echo "A prévia do e-book: fora do site em inglês"
  espera "/previa/ não existe" 404 "$(code -H 'Sec-Fetch-Dest: document' "$B/previa/")"
else
  echo "A prévia do e-book, sem conta"
  PREVIA_HTML="$(G -H 'Sec-Fetch-Dest: document' "$B/previa/")"
  espera "/previa/ abre sem conta" 200 "$(code -H 'Sec-Fetch-Dest: document' "$B/previa/")"
  espera "/previa/ fora da busca (cabeçalho)" 1 "$(G -o /dev/null -D - "$B/previa/" | grep -ci '^x-robots-tag:.*noindex')"
  espera "/previa/ fora da busca (meta)" 1 "$(grep -c 'name="robots" content="noindex' <<<"$PREVIA_HTML")"
  espera "/previa/ tem a mochila, o monte e a roleta" 1 "$(grep -q '"tipo":"mochila"' <<<"$PREVIA_HTML" && grep -q '"tipo":"monte"' <<<"$PREVIA_HTML" && grep -q '"jogo":"roleta"' <<<"$PREVIA_HTML" && echo 1 || echo 0)"
  espera "/previa/ não vende o livro" 0 "$(grep -cE 'R\$|/checkout|/cursos/israel' <<<"$PREVIA_HTML")"
  espera "/previa/ sem o nome antigo do livro" 0 "$(grep -ci 'al[eé]m do roteiro' <<<"$PREVIA_HTML")"
fi
# Só o curso de alfabetização no site (27/10/2026, decisão do dono): o link da
# bio vai direto à página do curso, e as páginas das jornadas, das experiências
# "Em breve" e o "Comece aqui" levam à capa, com a consulta junto. O curl é robô
# para o contador (estatisticas.js), então esta conferência não soma visita.
echo "Só o curso no site"
espera "/bio leva ao curso" "$B/curso-de-hebraico/?parceria=bio#experimente" "$(location "$B/bio")"
for p in "/comece-aqui/" "/aprender-hebraico/" "/descobrir-israel/" "/israel-alem-do-obvio/" "/raizes-sefarditas/"; do
  espera "$p leva à capa" "$B/" "$(location "$B$p")"
done
espera "/comece-aqui/ leva a parceria" "$B/?parceria=bio" "$(location "$B/comece-aqui/?parceria=bio")"
espera "a capa é a página do curso" 1 "$(G -H 'Sec-Fetch-Dest: document' "$B/" | grep -c 'id="experimente"')"

# Status 200 não prova que a página aparece. Um HTML vazio, um bundle que
# some ou uma folha de estilo 404 devolvem 200 e mostram uma tela branca - que
# do lado de quem abre é indistinguível de "o site não funciona". Estas três
# checagens olham o CONTEÚDO.
echo "A capa aparece de verdade"
# A capa é buscada com um parâmetro descartável no fim.
# ─────────────────────────────────────────────────────────────────────────
# Sem ele esta verificação tem uma corrida embutida, e ela apareceu de
# verdade: a borda ainda servia o HTML da publicação ANTERIOR, cujos nomes
# de arquivo JavaScript acabaram de ser substituídos, e a checagem seguinte
# pedia um arquivo que já não existia - 404 numa publicação inteiramente
# sadia. O parâmetro faz a borda ir buscar a versão nova, que é a que este
# passo existe para conferir. O servidor de ativos ignora a query e resolve
# o mesmo index.html.
HOME_HTML="$(G --max-time 20 -H 'Sec-Fetch-Dest: document' "$B/?publicacao=$$")"
espera "o HTML tem tamanho de página" true \
  "$([ "${#HOME_HTML}" -gt 3000 ] && echo true || echo false)"
# Duas perguntas, e nenhuma delas é "a frase X está lá".
#
# A checagem anterior procurava uma frase da página de vendas, e ficou vermelha
# no dia em que a capa foi reescrita - sem que nada tivesse quebrado. Um teste
# que cai quando o texto muda não está medindo o site: está medindo o texto, e
# ensina a ignorar o vermelho.
#
# O que importa aqui é o que a tela branca NÃO tem:
#   · um <h1> com texto dentro - a capa renderizou conteúdo, e não um casco;
#   · a marca - é o site certo, e não uma página de erro do provedor.
# Os dois sobrevivem a qualquer reescrita de copy e falham em toda falha real.
#
# `<<<` e não `printf | grep -q`: o `-q` sai no primeiro acerto e fecha o
# cano, e aí o printf do outro lado imprime "write error: Broken pipe" no log
# de uma verificação que PASSOU. Ruído desse tipo ensina a ignorar log.
# O texto do <h1> é contado SEM as tags de dentro (28/09/2026): a capa nova
# quebra o título em linhas (<span>), e o grep antigo, que exigia o texto
# logo depois de <h1>, caiu com a página certa no ar - exatamente o tipo de
# vermelho que esta nota acima pede para não existir.
espera "a capa tem um título com texto" true \
  "$(perl -0ne '$ok = 0; if (/<h1[^>]*>(.*?)<\/h1>/s) { ($t = $1) =~ s/<[^>]+>//g; $t =~ s/\s+/ /g; $ok = length($t) >= 12 } print $ok ? "true" : "false"' <<<"$HOME_HTML")"
# A marca de cada site (worker/src/lib/idioma.js, MARCA): Hebraico Fluente no
# brasileiro, Hebrew Unlocked no inglês, Hebreo Fluido no espanhol.
MARCA_DO_SITE='Hebraico Fluente'
grep -qE '^LOCALE *= *"en"' "$RAIZ/wrangler.toml" 2>/dev/null && MARCA_DO_SITE='Hebrew Unlocked'
grep -qE '^LOCALE *= *"es"' "$RAIZ/wrangler.toml" 2>/dev/null && MARCA_DO_SITE='Hebreo Fluido'
espera "a capa traz a marca ($MARCA_DO_SITE)" true \
  "$(grep -q "$MARCA_DO_SITE" <<<"$HOME_HTML" && echo true || echo false)"

# O primeiro script do Next referenciado pela capa. Se ele não vier, o
# navegador mostra o texto mas nada funciona - e um erro de caminho de
# ativos aparece exatamente assim.
ASSET="$(printf '%s' "$HOME_HTML" | grep -oE '/_next/static/[^"]+\.js' | head -1)"
if [ -n "$ASSET" ]; then
  # Uma segunda tentativa depois de três segundos, e só uma. Publicar não é
  # atômico entre os pontos de presença da Cloudflare: o HTML novo pode
  # chegar a este ponto alguns segundos antes dos arquivos que ele cita. O
  # que a verificação quer saber é se o ativo EXISTE, não em que milésimo
  # ele apareceu - e uma tentativa que continua 404 três segundos depois é
  # falha de verdade, não propagação.
  ASSET_CODE="$(code "$B$ASSET")"
  if [ "$ASSET_CODE" != "200" ]; then
    sleep 3
    ASSET_CODE="$(code "$B$ASSET")"
  fi
  espera "o JavaScript da página carrega" 200 "$ASSET_CODE"
  # 01/10/2026 (auditoria PERF-001): /_next/static sai SEM Worker e com um
  # ano de cache, pelo app/public/_headers. Um `max-age=0` aqui quer dizer
  # que o _headers não foi copiado para app/out ou que a lista do
  # run_worker_first voltou a `true`.
  espera "o chunk do Next é imutável (_headers)" true \
    "$(G -o /dev/null -D - "$B$ASSET" | grep -i '^cache-control:' | grep -q 'immutable' && echo true || echo false)"
else
  espera "a capa referencia o JavaScript do Next" true false
fi

# 01/10/2026 (auditoria PERF-002): o Safari só toca áudio de servidor que
# responde 206 a um Range. Os clipes da capa passam pelo Worker, que fatia
# a resposta quando o servidor de ativos devolve o arquivo inteiro
# (worker/src/lib/range.js).
espera "mp3 da capa responde 206 a um Range (Safari)" 206 \
  "$(code -H 'Range: bytes=0-1' "$B/amostra-audio/shalom.mp3")"

echo "Sessão e portão"
espera "/api/me sem sessão recusa"            401 "$(code $B/api/me)"
# O app de agora pede `X-HF-Sessao: opcional` e recebe 200 sem sessão, para
# o visitante não ganhar um erro vermelho por página (PERF-007). Sem o
# cabeçalho, acima, continua o 401 (pacote antigo numa aba aberta).
espera "/api/me sem sessão, pedido pelo app, é 200 signedIn:false" '{"signedIn":false}' \
  "$(G -H 'X-HF-Sessao: opcional' $B/api/me)"
espera "rota paga sem sessão manda ao login"  "$B/entrar/?next=%2Flicao%2Falef%2F" \
       "$(location $B/licao/alef/)"

echo "Conta"
espera "criar conta" 200 "$(G -c "$JAR" -o /dev/null -w '%{http_code}' -X POST $B/api/auth/signup \
  -H 'content-type: application/json' \
  -d "{\"aceitouTermos\":true,\"declarouIdade\":true,\"name\":\"Teste\",\"email\":\"$MAIL\",\"password\":\"cavalo correto\"}")"
espera "/api/me com sessão" 200 "$(G -b "$JAR" -o /dev/null -w '%{http_code}' $B/api/me)"
espera "e-mail repetido" 409 "$(G -o /dev/null -w '%{http_code}' -X POST $B/api/auth/signup \
  -H 'content-type: application/json' \
  -d "{\"aceitouTermos\":true,\"declarouIdade\":true,\"name\":\"Outro\",\"email\":\"$MAIL\",\"password\":\"outra senha\"}")"
espera "senha curta" 400 "$(G -o /dev/null -w '%{http_code}' -X POST $B/api/auth/signup \
  -H 'content-type: application/json' -d '{"aceitouTermos":true,"declarouIdade":true,"email":"x@exemplo.br","password":"1234"}')"
espera "senha errada" 401 "$(G -o /dev/null -w '%{http_code}' -X POST $B/api/auth/login \
  -H 'content-type: application/json' -d "{\"email\":\"$MAIL\",\"password\":\"errada!!\"}")"
# O e-mail é normalizado: entrar com outra caixa e espaços tem de funcionar.
espera "e-mail normalizado" 200 "$(G -c "$JAR" -o /dev/null -w '%{http_code}' -X POST $B/api/auth/login \
  -H 'content-type: application/json' \
  -d "{\"email\":\"  $(echo "$MAIL" | tr '[:lower:]' '[:upper:]') \",\"password\":\"cavalo correto\"}")"

echo "Portão com conta, sem compra"
espera "vai para a página do curso" "$B/curso-de-hebraico/" "$(location -b "$JAR" $B/meu-hebraico/)"

echo "Cobrança"
# Duas situações legítimas, e a checagem se adapta:
#
#   · MP_ACCESS_TOKEN configurado → o pedido nasce, e o valor tem de ser o do
#     catálogo, no PIX, com o desconto (lido de data/courses.json: o preço
#     muda sozinho no fim do pré-lançamento). É a prova de
#     que o preço sai do servidor e não do navegador.
#   · sem token → 503 `payments-off`, e NENHUM pedido é criado. Também é o
#     comportamento certo: um pendente que nunca vai compensar é pior do que
#     uma recusa clara.
#
# O que seria erro é qualquer outra coisa - e é isso que o `case` separa.
#
# ⚠ COM TOKEN DE PRODUÇÃO, ESTA CHAMADA NÃO É SIMULAÇÃO. Ela cria uma cobrança
# PIX de verdade na Mercado Pago, a cada publicação. Ninguém é cobrado - um PIX
# que ninguém paga expira em trinta minutos sozinho, e a linha do pedido é
# apagada no fim da publicação - mas o painel da Mercado Pago acumularia uma
# cobrança pendente por deploy, e é do painel que sai a conferência de caixa.
#
# Então: com token de PRODUÇÃO a criação é pulada e só se confere que a rota
# está de pé. Com token de TESTE, que não toca em dinheiro nenhum, o pedido é
# criado e o preço é conferido - que é onde essa prova vale alguma coisa.
MODO="$(grep -o '"modo":"[a-z]*"' <<<"$HEALTH" | cut -d'"' -f4)"
VENDEDOR="$(grep -o '"vendedor":"[a-z-]*"' <<<"$HEALTH" | cut -d'"' -f4)"
# Sem o token não se sabe o modo. Contra um endereço que não é a máquina
# local, o seguro é tratar como produção: pular a criação do pedido, que
# deixaria uma cobrança de verdade pendente no painel.
if [ -z "$MODO" ] && [ -z "${HF_ADMIN_TOKEN:-}" ]; then
  case "$B" in
    http://127.0.0.1*|http://localhost*) ;;
    *) MODO=producao ;;
  esac
fi
# Contra a PRODUÇÃO, cobrança de teste é defeito, não configuração (auditoria
# de 28/09, PAY-001): com token de teste o comprador vai a um checkout que não
# cobra, e nada mais falha. Só barra com prova positiva - `vendedor` vem de
# /users/me, que a Mercado Pago às vezes recusa com 403 (`recusado`) para um
# token de produção perfeito, e isso não pode derrubar a publicação.
case "$B" in
  http://127.0.0.1*|http://localhost*) ;;
  *)
    if [ "$EM_INGLES" = 1 ] && [ "$MODO" = teste ] && [[ "$B" == *.workers.dev* ]]; then
      # Site de fora sem domínio: o sandbox do Paddle e a chave de teste do
      # Stripe são permitidos (scripts/pagamento-ativo.mjs, semDominio).
      echo "  · cobrança de TESTE, num site ainda sem domínio: não cobra nada"
    elif grep -q '"payments":true' <<<"$HEALTH"; then
      espera "a cobrança no ar é de produção (não de teste)" producao "$MODO"
      espera "a conta da Mercado Pago não é um usuário de teste" nao \
        "$([ "$VENDEDOR" = "usuario-de-teste" ] && echo sim || echo nao)"
    fi
    ;;
esac
# No site em inglês o meio é um só (o checkout do Paddle), e o preço é o
# price.usd do catálogo, sem desconto de PIX.
# Desde 05/11/2026 o site de fora pode cobrar pelo Stripe (o campo
# `cobranca` da saúde diz qual): o meio é `stripe`, e o aviso é outro.
COBRANCA="$(grep -o '"cobranca":"[a-z-]*"' <<<"$HEALTH" | cut -d'"' -f4)"
# Sem os detalhes da saúde (sem o ADMIN_TOKEN) o campo vem vazio: aí vale o
# que data/empresa.json pede, o mesmo arquivo que o Worker lê (api/pay.js).
if [ -z "$COBRANCA" ] && [ "$EM_INGLES" = 1 ]; then
  COBRANCA="$(node -e 'const e=require(process.argv[1]); console.log((e.pagamento&&e.pagamento.exterior)==="stripe"?"stripe":"paddle")' "$RAIZ/data/empresa.json" 2>/dev/null)"
fi
MEIO=pix
[ "$EM_INGLES" = 1 ] && MEIO=paddle
[ "$EM_INGLES" = 1 ] && [ "$COBRANCA" = stripe ] && MEIO=stripe
if [ "$MODO" = "producao" ]; then
  echo "  · token de PRODUÇÃO: pulando a criação de pedido para não deixar"
  echo "    uma cobrança pendente no painel a cada publicação."
  espera "a rota de pagamento exige sessão" 401 \
    "$(G -o /dev/null -w '%{http_code}' -X POST $B/api/pay/create \
       -H 'content-type: application/json' -d "{\"courseSlug\":\"alfabetizacao\",\"method\":\"$MEIO\"}")"
  pay_code=pulado
else
  # O nome completo e o CPF da nota fiscal (06/11/2026): o site brasileiro
  # não cria pedido sem eles (o CPF é um número de teste válido).
  pay_code=$(G -b "$JAR" -o /dev/null -w '%{http_code}' -X POST $B/api/pay/create \
    -H 'content-type: application/json' \
    -d "{\"courseSlug\":\"alfabetizacao\",\"method\":\"$MEIO\",\"nomeCompleto\":\"Maria da Silva\",\"cpf\":\"529.982.247-25\"}")
fi
case "$pay_code" in
  pulado) ;;
  503)
    espera "pagamento ainda não ligado, e diz isso" 503 "$pay_code"
    espera "e nenhum pedido órfão foi criado" "" \
      "$(G -b "$JAR" $B/api/orders | grep -o '"amountCents":[0-9]*' | head -1 | cut -d: -f2)"
    ;;
  502)
    # O provedor recusou (sem credencial, no wrangler dev): o pedido nasce
    # `failed` sem provider_ref e, desde 01/10/2026 (PAY-B-010), não aparece
    # em Compras. O preço gravado é conferido pelos testes de unidade.
    espera "pagamento recusado pelo provedor não vira compra listada" "" \
      "$(G -b "$JAR" $B/api/orders | grep -o '"amountCents":[0-9]*' | head -1 | cut -d: -f2)"
    ;;
  *)
    espera "o pedido ficou registrado com o preço do servidor" \
      "$(node -e '
        const c = require(process.argv[1]).courses.find(x => x.slug === "alfabetizacao").price;
        console.log(process.argv[2] === "1" ? Math.round(c.usd * 100)
          : Math.round(c.brl * (1 - c.pixDiscountPct / 100) * 100));' \
        "$RAIZ/data/courses.json" "$EM_INGLES")" \
      "$(G -b "$JAR" $B/api/orders | grep -o '"amountCents":[0-9]*' | head -1 | cut -d: -f2)"
    ;;
esac
espera "curso fora de venda é recusado" 404 "$(G -b "$JAR" -o /dev/null -w '%{http_code}' \
  -X POST $B/api/pay/create -H 'content-type: application/json' \
  -d "{\"courseSlug\":\"hebraico-a1\",\"method\":\"$MEIO\"}")"
espera "pedido de outra pessoa não é lido" 404 "$(code -b "$JAR" "$B/api/pay/verify?order=HFNAOEXISTE")"

echo "Webhook"
espera "sem assinatura, recusa" 401 "$(code -X POST "$B/api/pay/webhook?type=payment&data.id=1")"
if [ "$MEIO" = stripe ]; then
  espera "aviso do Stripe sem assinatura, recusa" 401 \
    "$(code -X POST "$B/api/pay/stripe" -H 'content-type: application/json' -d '{"type":"checkout.session.completed","data":{"object":{}}}')"
elif [ "$EM_INGLES" = 1 ]; then
  espera "aviso do Paddle sem assinatura, recusa" 401 \
    "$(code -X POST "$B/api/pay/paddle" -H 'content-type: application/json' -d '{"event_type":"transaction.completed","data":{}}')"
fi

# ── senha ────────────────────────────────────────────────────────────────
# O que dá para provar de FORA, sem ler a caixa de entrada de ninguém.
#
# O ciclo completo - pedir, receber o e-mail, redefinir - é provado contra um
# SQLite de verdade em app/tests/senha.test.ts, com o e-mail interceptado na
# saída. O que só aparece AQUI, contra o que está publicado, é se as rotas
# existem, se as telas abrem, e - a mais importante - se a resposta de
# `forgot` é idêntica para um e-mail que existe e um que não existe. Essa é a
# propriedade que impede o formulário de recuperação de virar uma lista de
# quem é cliente, e ela é observável exatamente de onde um curioso olharia.
echo "Senha"
for p in "/esqueci-senha/" "/nova-senha/"; do
  espera "$p abre sem conta" 200 "$(code -H 'Sec-Fetch-Dest: document' "$B$p")"
done

pede_link() {
  G -X POST "$B/api/auth/forgot" -H 'content-type: application/json' -d "{\"email\":\"$1\"}"
}
EXISTE="$(pede_link "$MAIL")"
NAO_EXISTE="$(pede_link "hf-e2e-fantasma-$RANDOM@example.invalid")"
espera "pedir o link responde 200" 200 "$(G -o /dev/null -w '%{http_code}' \
  -X POST "$B/api/auth/forgot" -H 'content-type: application/json' \
  -d "{\"email\":\"$MAIL\"}")"
espera "a resposta não diz se a conta existe" "$EXISTE" "$NAO_EXISTE"

espera "token inventado é recusado" 400 "$(G -o /dev/null -w '%{http_code}' \
  -X POST "$B/api/auth/reset" -H 'content-type: application/json' \
  -d '{"token":"nao-existe-este-token","password":"outra senha boa"}')"

espera "trocar a senha sem sessão recusa" 401 "$(G -o /dev/null -w '%{http_code}' \
  -X POST "$B/api/auth/password" -H 'content-type: application/json' \
  -d '{"current":"cavalo correto","password":"outra senha boa"}')"
espera "trocar a senha com a atual errada recusa" 401 "$(G -b "$JAR" -o /dev/null \
  -w '%{http_code}' -X POST "$B/api/auth/password" -H 'content-type: application/json' \
  -d '{"current":"chute","password":"outra senha boa"}')"

# A troca de verdade, e as duas consequências que importam. `-c` grava o
# cookie novo que vem na resposta; `VELHO` guarda o anterior para provar que
# ele morreu - que é o ponto inteiro de trocar a senha por desconfiança.
VELHO="$(mktemp)"; cp "$JAR" "$VELHO"
espera "trocar a senha com a atual certa" 200 "$(G -b "$JAR" -c "$JAR" -o /dev/null \
  -w '%{http_code}' -X POST "$B/api/auth/password" -H 'content-type: application/json' \
  -d '{"current":"cavalo correto","password":"outra senha boa"}')"
espera "o cookie novo continua valendo" 200 "$(G -b "$JAR" -o /dev/null -w '%{http_code}' "$B/api/me")"
espera "o cookie antigo caiu" 401 "$(G -b "$VELHO" -o /dev/null -w '%{http_code}' "$B/api/me")"
rm -f "$VELHO"
espera "a senha nova entra" 200 "$(G -c "$JAR" -o /dev/null -w '%{http_code}' \
  -X POST "$B/api/auth/login" -H 'content-type: application/json' \
  -d "{\"email\":\"$MAIL\",\"password\":\"outra senha boa\"}")"
espera "a senha antiga não entra mais" 401 "$(G -o /dev/null -w '%{http_code}' \
  -X POST "$B/api/auth/login" -H 'content-type: application/json' \
  -d "{\"email\":\"$MAIL\",\"password\":\"cavalo correto\"}")"

# O e-mail SAIU DE VERDADE?
# ──────────────────────────────────────────────────────────────────────────
# Aqui, e não lá em cima com o resto da saúde, porque só agora esta execução
# já pediu links de recuperação - e é dos envios DELA que se quer saber.
# Perguntado antes, o campo responde sobre a execução anterior, e na primeira
# publicação depois de a chave entrar ele acusa uma recusa que não houve.
#
# Vale para o estado mais perigoso dos três: a chave existe, a saúde diz que
# sim, a tela diz "o link está a caminho" - e a Resend recusou. Quase sempre é
# o domínio de EMAIL_FROM ainda não verificado, e nada na tela denuncia.
if [ "$(campo email)" = "true" ]; then
  ENTREGA="$(saude | grep -o '"emailEntregue":[a-z]*' | cut -d: -f2)"
  if [ "$ENTREGA" = "false" ]; then
    espera "o e-mail de recuperação saiu" true false
    echo "    A Resend recusou. O motivo exato está em Actions → Acesso → 'envios'."
    echo "    Quase sempre é o domínio de EMAIL_FROM ainda não verificado."
  else
    espera "o e-mail de recuperação saiu" true true
  fi
fi

echo "Saída"
G -b "$JAR" -c "$JAR" -o /dev/null -X POST $B/api/auth/logout
espera "depois de sair, /api/me recusa" 401 "$(G -b "$JAR" -o /dev/null -w '%{http_code}' $B/api/me)"

rm -f "$JAR"

# Contra produção, a passagem deixa rastro: uma conta de teste e, se o
# pagamento estiver ligado, um pedido. Nada disso é bonito num banco de
# verdade, então o script entrega a limpeza pronta em vez de deixar para quem
# lembrar depois - que é ninguém.
if [ "$B" != "http://127.0.0.1:8787" ]; then
  cat <<LIMPEZA

Esta passagem criou a conta de teste $MAIL.
Para apagá-la do banco de produção:

  npx wrangler d1 execute fluent-hebrew --remote --command \\
    "DELETE FROM arrependimentos     WHERE account_id = (SELECT id FROM accounts WHERE email = '$MAIL');
     DELETE FROM novidades           WHERE account_id = (SELECT id FROM accounts WHERE email = '$MAIL');
     DELETE FROM lembretes_estudo    WHERE account_id = (SELECT id FROM accounts WHERE email = '$MAIL');
     DELETE FROM marcas              WHERE account_id = (SELECT id FROM accounts WHERE email = '$MAIL');
     DELETE FROM aparelhos           WHERE account_id = (SELECT id FROM accounts WHERE email = '$MAIL');
     DELETE FROM depoimentos         WHERE account_id = (SELECT id FROM accounts WHERE email = '$MAIL');
     DELETE FROM mensagens           WHERE account_id = (SELECT id FROM accounts WHERE email = '$MAIL');
     DELETE FROM aceites             WHERE account_id = (SELECT id FROM accounts WHERE email = '$MAIL');
     DELETE FROM admin_codigos       WHERE account_id = (SELECT id FROM accounts WHERE email = '$MAIL');
     DELETE FROM provas_a1           WHERE account_id = (SELECT id FROM accounts WHERE email = '$MAIL');
     DELETE FROM certificados        WHERE account_id = (SELECT id FROM accounts WHERE email = '$MAIL');
     DELETE FROM estornos            WHERE order_id IN (SELECT id FROM orders WHERE account_id = (SELECT id FROM accounts WHERE email = '$MAIL'));
     DELETE FROM payment_events      WHERE order_id IN (SELECT id FROM orders WHERE account_id = (SELECT id FROM accounts WHERE email = '$MAIL'));
     DELETE FROM orders              WHERE account_id = (SELECT id FROM accounts WHERE email = '$MAIL');
     DELETE FROM entitlements        WHERE account_id = (SELECT id FROM accounts WHERE email = '$MAIL');
     DELETE FROM progress            WHERE account_id = (SELECT id FROM accounts WHERE email = '$MAIL');
     DELETE FROM registros_acesso    WHERE account_id = (SELECT id FROM accounts WHERE email = '$MAIL');
     DELETE FROM email_verifications WHERE account_id = (SELECT id FROM accounts WHERE email = '$MAIL');
     DELETE FROM password_resets     WHERE account_id = (SELECT id FROM accounts WHERE email = '$MAIL');
     DELETE FROM access_log          WHERE account_id = (SELECT id FROM accounts WHERE email = '$MAIL');
     DELETE FROM accounts WHERE email = '$MAIL'"

(Toda tabela que aponta para accounts precisa estar aí, antes do DELETE das
contas - senão o banco recusa tudo com "FOREIGN KEY constraint failed" e a
conta fica. arrependimentos e estornos também apontam para orders e saem antes dela.
access_log e payment_events não têm chave estrangeira, mas guardam rastro
da conta de teste. Ver worker/schema.sql.)
LIMPEZA
fi

if [ "$fails" -eq 0 ]; then
  echo
  echo "tudo certo."
else
  echo
  echo "$fails verificação(ões) falharam."
  exit 1
fi
