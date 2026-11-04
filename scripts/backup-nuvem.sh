#!/usr/bin/env bash
# O backup do banco, todo dia, guardado fora do banco - e provado.
# ──────────────────────────────────────────────────────────────────────────
#   bash scripts/backup-nuvem.sh copiar            # o que a Action roda todo dia
#   bash scripts/backup-nuvem.sh ensaiar [chave]   # restaura uma cópia num banco de teste
#   bash scripts/backup-nuvem.sh conferir ARQ.sql  # só a prova, num banco local
#   bash scripts/backup-nuvem.sh provar-gravacoes  # o teste do filtro de `gravacoes`, sem nuvem
#
# POR QUE EXISTE. O D1 é o único lugar onde moram as contas, os direitos de
# acesso, os pedidos e o progresso de todos os alunos. O Time Travel da
# Cloudflare volta o banco para um instante dos últimos 30 dias, mas não
# sobrevive a apagar o banco nem a perder a conta. A auditoria de 28/09/2026
# (INFRA-001) marcou isso como o único P0: sem cópia fora do banco, um
# acidente leva todos os alunos de uma vez.
#
# ONDE FICA. No R2, um bucket PRIVADO da mesma conta Cloudflare
# (`hebreo-fluido-backups`), criado por este script na primeira vez:
#   diario/hebreo-fluido-AAAAMMDD-HHMMSS.sql.gz   uma por dia, 90 dias
#   ultimo/hebreo-fluido.sql.gz                   sempre a mais recente
# As diárias somem sozinhas depois de 90 dias (regra de ciclo de vida do
# bucket). A política de privacidade precisa dizer esse prazo (LEGAL-007).
#
# NUNCA num artefato do Actions nem no repositório: o arquivo tem o e-mail de
# todo aluno e o hash de cada senha. O bucket não tem acesso público; quem lê
# é quem já tem a conta Cloudflare, que também lê o banco.
#
# PROVADO, NÃO ESPERADO. Um backup que nunca foi restaurado é uma esperança.
#   · `copiar` restaura cada cópia num banco LOCAL antes de enviar, e só
#     envia se todas as tabelas voltarem com o mesmo número de linhas que
#     saíram. Uma cópia que não restaura faz a Action falhar - e avisar.
#   · `ensaiar` baixa uma cópia do R2 e restaura num banco de TESTE na
#     Cloudflare (`hebreo-fluido-ensaio`), confere as contagens e apaga o
#     banco de teste. É a prova de que dá para voltar do zero. Rodar uma vez
#     agora e depois uma vez por mês.
#
# A TABELA `gravacoes` FICA FORA DA CÓPIA (desde 01/10/2026, SEC-A-001).
# O painel /admin/gravar guarda cada áudio como BLOB numa linha dessa tabela
# (até 1,5 MB). O `d1 export` escreve cada linha como UM comando INSERT com o
# blob em hexadecimal (o dobro do tamanho: até 3 MB), e o SQLite recusa
# qualquer comando acima de 1.000.000 bytes (SQLITE_TOOBIG). Um dump assim não
# restaura em lugar nenhum: nem no banco local da prova, nem no D1 remoto do
# `ensaiar`. Por isso, a partir do primeiro áudio gravado (30/09/2026), a
# Action falhou todo dia e nenhuma cópia nova chegou ao R2.
#   · `sem_gravacoes` tira do dump só as linhas `INSERT INTO "gravacoes"`; o
#     CREATE TABLE fica, e a tabela volta vazia na restauração.
#   · Não se perde conteúdo: a gravação é conteúdo do CURSO, não dado de
#     aluno. O Worker serve `/audio/<id>.mp3` da tabela quando a linha existe
#     e do arquivo `audio/<id>.mp3` do git quando não existe (audio.js), e
#     `tools/exportar-gravacoes.mjs` (deploy-worker.yml, disparo manual com
#     "exportar_gravacoes") leva cada gravação do banco para o git, já cortada
#     e nivelada. Depois de uma restauração, o curso toca os arquivos do git.
#     O que estiver gravado e ainda não exportado para o git não tem cópia:
#     o resumo da Action lista esses ids todo dia.
#   · A contagem continua provada: `gravacoes` sai do arquivo com 0 linhas e
#     volta com 0 (`comparar` não precisa de exceção).
#   · `provar-gravacoes` reproduz o caso num D1 local (um blob de 1 MB, 2 MB
#     em hex): o dump cru TEM de falhar com SQLITE_TOOBIG e o filtrado TEM de
#     restaurar com as mesmas contagens. Sem nuvem, sem token.

set -uo pipefail
cd "$(dirname "$0")/.."

DB="hebreo-fluido"
ENSAIO_DB="hebreo-fluido-ensaio"
BUCKET="${HF_BACKUP_BUCKET:-hebreo-fluido-backups}"
REGRA="expira-diarias-90-dias"
DIAS=90
# Mesma versão fixa da publicação: estes comandos rodam com o token da conta.
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
W="${HF_WRANGLER:-$WRANGLER_LOCAL}"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

vermelho() { printf '\033[31m%s\033[0m\n' "$*"; }
verde()    { printf '\033[32m%s\033[0m\n' "$*"; }
info()     { printf '  %s\n' "$*"; }
morre()    { vermelho "✗ $1"; [ $# -gt 1 ] && printf '\n  %s\n' "$2"; exit 1; }

# Uma linha no resumo da execução do Actions (e nada fora dele).
resumo() { [ -n "${GITHUB_STEP_SUMMARY:-}" ] && printf '%s\n' "$*" >> "$GITHUB_STEP_SUMMARY"; return 0; }

# ── contagens ─────────────────────────────────────────────────────────────
# Quantas linhas de cada tabela SAÍRAM, lidas do próprio arquivo. O export do
# D1 escreve um INSERT por linha de tabela, e toda linha de dados começa com
# `INSERT INTO`; um valor com quebra de linha continua na linha seguinte,
# que não começa assim.
contar_no_arquivo() { # arquivo.sql -> "tabela n" por linha
  # As tabelas internas (sqlite_sequence, _cf_*, d1_*) ficam de fora dos dois
  # lados: guardam contadores do próprio SQLite, não dado de aluno.
  sed -nE 's/^INSERT INTO "?([A-Za-z0-9_]+)"? .*/\1/p' "$1" \
    | grep -vE '^(sqlite_|_cf_|d1_)' | sort | uniq -c | awk '{print $2, $1}'
}

# Quantas linhas de cada tabela VOLTARAM, perguntadas ao banco restaurado.
# $@ = como chegar nele: `--local --persist-to DIR` ou `--remote`.
contar_no_banco() { # nome-do-banco args... -> "tabela n" por linha
  local nome="$1"; shift
  local tabelas sql
  tabelas="$($W d1 execute "$nome" "$@" --json --command \
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%' ORDER BY name" \
    2>"$TMP/erro-tabelas" | node -e '
      let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
        const r=JSON.parse(s);console.log(r[0].results.map(x=>x.name).join(" "));});')" \
    || { cat "$TMP/erro-tabelas" >&2; return 1; }
  [ -n "$tabelas" ] || return 1
  # Uma linha só, uma coluna por tabela. UNION ALL não serve: o D1 recusa
  # mais que poucos termos num SELECT composto ("too many terms").
  sql=""
  for t in $tabelas; do
    [ -n "$sql" ] && sql="$sql, "
    sql="${sql}(SELECT COUNT(*) FROM \"$t\") AS \"$t\""
  done
  $W d1 execute "$nome" "$@" --json --command "SELECT $sql" 2>"$TMP/erro-contagem" | node -e '
    let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
      const r=JSON.parse(s);
      if (!Array.isArray(r)) { console.error(JSON.stringify(r)); process.exit(1); }
      for (const [t,n] of Object.entries(r[0].results[0])) console.log(t, n);});' \
    || { cat "$TMP/erro-contagem" >&2; return 1; }
}

# Compara o que saiu com o que voltou. Toda tabela do banco restaurado tem de
# ter exatamente as linhas que o arquivo carregava (zero, se não carregava).
# `gravacoes` NÃO é exceção aqui, de propósito: `sem_gravacoes` tira as
# linhas dela ANTES de o arquivo ser contado, então ela sai com 0 e tem de
# voltar com 0 (a tabela existe, vazia). Se um dia ela aparecer com linhas
# num dos lados, é um dump que não passou pelo filtro, e a prova acusa.
comparar() { # saiu.txt voltou.txt -> 0 se tudo bate
  node -e '
    const fs=require("fs");
    const ler=f=>Object.fromEntries(fs.readFileSync(f,"utf8").trim().split("\n")
      .filter(Boolean).map(l=>{const [t,n]=l.split(" ");return [t,Number(n)];}));
    const saiu=ler(process.argv[1]), voltou=ler(process.argv[2]);
    let ok=Object.keys(voltou).length>0;
    const nomes=[...new Set([...Object.keys(saiu),...Object.keys(voltou)])].sort();
    for (const t of nomes) {
      const a=saiu[t]??0, b=voltou[t];
      const bate=b!==undefined && a===b;
      if(!bate) ok=false;
      console.log(`${bate?"✓":"✗"} ${t.padEnd(22)} saiu ${String(a).padStart(6)} · voltou ${b===undefined?"(tabela ausente)":String(b).padStart(6)}`);
    }
    process.exit(ok?0:1);' "$1" "$2"
}

# ── a tabela gravacoes ────────────────────────────────────────────────────
# O teto do SQLite por comando. Um INSERT acima disto não restaura em lugar
# nenhum (SQLITE_TOOBIG), e um dump com um comando assim é inútil inteiro.
TETO_COMANDO=1000000

# Tira do dump as linhas de dados de `gravacoes` (só os INSERTs; o CREATE
# TABLE fica). Imprime quantas saíram. O export escreve cada linha de tabela
# num comando só, terminado em `);`; um valor com quebra de linha continuaria
# nas linhas seguintes, e por isso o filtro pula até o fim do comando, e não
# só a primeira linha. (As colunas de `gravacoes` não carregam quebra de
# linha: id com formato fixo, tipo normalizado, e-mail. É só cautela.)
sem_gravacoes() { # entrada.sql saida.sql -> imprime N
  awk -v contagem="$TMP/n-gravacoes" '
    /^INSERT INTO "?gravacoes"?[ (]/ { n++; aberto = 1 }
    aberto { if ($0 ~ /\);[ \t]*$/) aberto = 0; next }
    { print }
    END { print n + 0 > contagem }' "$1" > "$2" || return 1
  cat "$TMP/n-gravacoes"
}

# Os ids das gravações que o dump carregava: o primeiro valor de cada INSERT.
ids_gravacoes() { # entrada.sql -> um id por linha
  sed -nE "s/^INSERT INTO \"?gravacoes\"?[^V]*VALUES\('(he-[0-9a-f]{8})'.*/\1/p" "$1"
}

# Quando a restauração falha, dizer se foi por um comando acima do teto, e de
# qual tabela: é o erro que o SQLite só descreve como "statement too long".
comando_longo() { # arquivo.sql -> uma frase, ou nada
  awk -v teto="$TETO_COMANDO" 'length($0) > teto {
      t = $0; sub(/^INSERT INTO "?/, "", t); sub(/"?[ (].*/, "", t);
      printf "linha %d do arquivo tem %d bytes (tabela %s), acima do teto de %d por comando do SQLite\n", NR, length($0), t, teto; exit }' "$1"
}

# Restaura um .sql num banco LOCAL descartável e compara. Nunca toca a nuvem.
conferir_local() { # arquivo.sql
  local arq="$1" dir="$TMP/restaura-local" longo
  rm -rf "$dir"; mkdir -p "$dir"
  if ! $W d1 execute "$DB" --local --persist-to "$dir" --file="$arq" -y \
      >"$TMP/restaura.log" 2>&1; then
    longo="$(comando_longo "$arq")"
    [ -z "$longo" ] || printf '\n  %s\n  (um dump da produção passa por `sem_gravacoes` antes de chegar aqui; este não passou)\n' "$longo"
    morre "A cópia NÃO restaurou num banco local." "$(tail -20 "$TMP/restaura.log")"
  fi
  contar_no_arquivo "$arq" > "$TMP/saiu.txt"
  contar_no_banco "$DB" --local --persist-to "$dir" > "$TMP/voltou.txt" \
    || morre "Restaurou, mas não consegui contar as tabelas do banco restaurado."
  if comparar "$TMP/saiu.txt" "$TMP/voltou.txt" | tee "$TMP/comparacao.txt"; then
    rm -rf "$dir"; return 0
  fi
  rm -rf "$dir"
  morre "A cópia restaurada não bate com o que saiu (acima)." \
        "Não confie neste arquivo. A Action falha para você ficar sabendo."
}

tabela_no_resumo() { # arquivo de comparação -> tabela markdown
  resumo "| Tabela | Linhas |"
  resumo "|---|---:|"
  sed -nE 's/^✓ ([A-Za-z0-9_]+) +saiu +([0-9]+).*/| \1 | \2 |/p' "$1" \
    | while IFS= read -r l; do resumo "$l"; done
}

# ── o bucket ──────────────────────────────────────────────────────────────
garantir_bucket() {
  local lista
  lista="$($W r2 bucket list 2>"$TMP/r2.err")" || {
    if grep -qiE "enable R2|10042|R2 is not enabled|not entitled" "$TMP/r2.err"; then
      morre "O R2 ainda não está ativado nesta conta Cloudflare." \
            "No painel da Cloudflare: menu R2 Object Storage → ativar (o plano
       gratuito cobre 10 GB; a Cloudflare pede um cartão para ativar).
       Depois rode esta Action de novo. Nada mais precisa ser configurado."
    fi
    if grep -qiE "Authentication|10000|403|permission" "$TMP/r2.err"; then
      morre "O token da Cloudflare não tem permissão de R2." \
            "No painel: My Profile → API Tokens → o token usado pelo GitHub →
       Edit → acrescentar  Account · Workers R2 Storage · Edit  → salvar.
       O valor do token não muda; não precisa mexer no GitHub."
    fi
    morre "Não consegui listar os buckets do R2." "$(tail -15 "$TMP/r2.err")"
  }
  if printf '%s\n' "$lista" | grep -qE "^name: *$BUCKET\$|\"$BUCKET\"|^$BUCKET\$"; then
    info "bucket $BUCKET: já existe"
  else
    $W r2 bucket create "$BUCKET" >"$TMP/cria.log" 2>&1 \
      || morre "Não consegui criar o bucket $BUCKET." "$(tail -15 "$TMP/cria.log")"
    verde "✓ bucket $BUCKET criado (privado)"
    resumo "- Bucket \`$BUCKET\` criado agora, sem acesso público."
  fi
  # A regra dos 90 dias. Se falhar, a cópia sai do mesmo jeito: guardar
  # demais é um problema menor do que não guardar.
  if $W r2 bucket lifecycle list "$BUCKET" 2>/dev/null | grep -q "$REGRA"; then
    info "regra de $DIAS dias: já existe"
  elif $W r2 bucket lifecycle add "$BUCKET" "$REGRA" "diario/" --expire-days "$DIAS" -y \
        >"$TMP/regra.log" 2>&1; then
    verde "✓ regra criada: diárias somem em $DIAS dias"
  else
    printf '::warning::Não consegui criar a regra de %s dias no bucket. As cópias ficam até alguém apagar.\n' "$DIAS"
    tail -5 "$TMP/regra.log" | sed 's/^/  /'
  fi
}

# ── copiar ────────────────────────────────────────────────────────────────
copiar() {
  local carimbo arq tamanho chave n_grav faltam id
  carimbo="$(date -u +%Y%m%d-%H%M%S)"
  arq="$TMP/hebreo-fluido-$carimbo.sql"
  chave="diario/hebreo-fluido-$carimbo.sql.gz"

  verde "1. O bucket"
  garantir_bucket

  verde "2. Copiando a produção"
  $W d1 export "$DB" --remote --output="$arq" -y >"$TMP/export.log" 2>&1 \
    || morre "O export do banco falhou." "$(tail -20 "$TMP/export.log")"
  tamanho="$(wc -c < "$arq" | tr -d ' ')"
  [ "$tamanho" -gt 200 ] || morre "O export saiu vazio ($tamanho bytes)."
  grep -q 'INSERT INTO "\?accounts' "$arq" \
    || morre "O export não tem nenhuma linha de accounts." "Um banco de produção sem contas é um export errado, não um banco vazio."
  info "$tamanho bytes"

  # As gravações do painel ficam fora (ver o cabeçalho): o blob de cada uma
  # não cabe num comando do SQLite, e elas já têm o git como casa.
  ids_gravacoes "$arq" > "$TMP/ids-gravacoes.txt"
  n_grav="$(sem_gravacoes "$arq" "$arq.sem-gravacoes")" \
    || morre "Não consegui tirar as linhas de gravacoes do export."
  mv "$arq.sem-gravacoes" "$arq"
  faltam=""
  while IFS= read -r id; do
    [ -n "$id" ] && [ ! -f "audio/$id.mp3" ] && faltam="$faltam $id"
  done < "$TMP/ids-gravacoes.txt"
  faltam="${faltam# }"
  info "gravacoes: $n_grav linha(s) na produção, fora da cópia ($(wc -c < "$arq" | tr -d ' ') bytes sem elas)"
  [ -z "$faltam" ] || info "gravacoes ainda sem arquivo em audio/: $faltam"

  verde "3. Provando que a cópia restaura (num banco local)"
  conferir_local "$arq"

  verde "4. Guardando no R2"
  gzip -9 "$arq"
  $W r2 object put "$BUCKET/$chave" --file="$arq.gz" --remote \
      --content-type application/gzip >"$TMP/put.log" 2>&1 \
    || morre "O envio ao R2 falhou." "$(tail -15 "$TMP/put.log")"
  $W r2 object put "$BUCKET/ultimo/hebreo-fluido.sql.gz" --file="$arq.gz" --remote \
      --content-type application/gzip >>"$TMP/put.log" 2>&1 \
    || morre "O envio da cópia 'ultimo' ao R2 falhou." "$(tail -15 "$TMP/put.log")"
  verde "✓ $BUCKET/$chave ($(wc -c < "$arq.gz" | tr -d ' ') bytes compactado)"

  # 5. O carimbo (auditoria de 01/10/2026, SEC-A-005). O Worker não lê o R2
  # de backup, então é o backup que conta ao banco que terminou: a linha
  # `backup` de `batimentos`, a mesma tabela do batimento da varredura. O
  # alerta diário (worker/src/alertas.js) avisa o dono quando ela passa de
  # 36 h. Só depois do envio ao R2: carimbo é "há cópia nova", não "tentei".
  # Se o carimbo falhar, o backup NÃO falha (ele está guardado); o aviso
  # aqui e, passadas 36 h, o e-mail do alerta dizem que algo não fecha.
  verde "5. Carimbando o fim do backup no banco"
  if $W d1 execute "$DB" --remote --command \
      "INSERT INTO batimentos (nome, em) VALUES ('backup', unixepoch() * 1000) ON CONFLICT(nome) DO UPDATE SET em = excluded.em" \
      >"$TMP/carimbo.log" 2>&1; then
    info "batimentos.backup = agora"
  else
    printf '::warning::%s\n' "O backup foi guardado, mas o carimbo no banco falhou: o alerta diário vai dizer que não há backup novo. $(tail -3 "$TMP/carimbo.log" | tr '\n' ' ')"
  fi

  resumo "## ✅ Backup do banco"
  resumo ""
  resumo "- Guardado em \`$BUCKET/$chave\` e em \`$BUCKET/ultimo/hebreo-fluido.sql.gz\`."
  resumo "- Restaurado num banco local antes do envio: todas as tabelas voltaram com o mesmo número de linhas."
  resumo "- As cópias diárias somem sozinhas depois de $DIAS dias."
  resumo "- gravacoes: fora da cópia, $n_grav linha(s) na produção, recuperáveis de \`audio/<id>.mp3\` no git (o curso toca o arquivo do git quando a linha não existe; \`exportar_gravacoes\` no deploy-worker.yml leva o banco para o git)."
  if [ -n "$faltam" ]; then
    resumo "  - ⚠️ ainda SEM arquivo em \`audio/\` (gravadas e não exportadas; só o banco as tem): \`$faltam\`. Rode o deploy-worker.yml com \"exportar_gravacoes\" e abra o PR."
    printf '::warning::%s gravação(ões) do painel ainda não estão em audio/ no git: %s\n' "$(printf '%s\n' $faltam | wc -l | tr -d ' ')" "$faltam"
  fi
  verde "6. A cópia fora da Cloudflare (Google Drive)"
  copiar_drive "$arq.gz" "$(basename "$chave")"
  resumo ""
  tabela_no_resumo "$TMP/comparacao.txt"
}

# ── a cópia fora da Cloudflare (Google Drive) ────────────────────────────
# Desde 01/10/2026 (pedido do dono; a auditoria marcava como o que faltava
# para o backup sobreviver a perder a conta Cloudflare). Opcional: só roda
# quando os dois segredos existem, e sem eles o backup no R2 segue igual.
#   BACKUP_SENHA          a senha da cifra. Sem ela o arquivo não abre;
#                         guarde-a FORA do GitHub também (gerenciador de senhas).
#   RCLONE_DRIVE_TOKEN    o token do Google Drive gerado com `rclone authorize "drive"`.
# O arquivo vai CIFRADO (AES-256, chave derivada com PBKDF2): o Drive guarda
# só bytes ilegíveis, nunca e-mail ou hash de senha de aluno em claro. Fica
# na pasta `hebreo-fluido-backups` do Drive, uma por dia, e as de mais de
# 90 dias são apagadas, o mesmo prazo do R2 e da Política de Privacidade.
# Para abrir uma cópia (RUNBOOK-ATENDIMENTO.md, "Restaurar do Drive"):
#   openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in ARQ.sql.gz.enc -out ARQ.sql.gz
DRIVE_PASTA="hebreo-fluido-backups"
CIFRA=(-aes-256-cbc -pbkdf2 -iter 600000 -salt)

cifrar() { # entrada saida  (senha em BACKUP_SENHA)
  openssl enc "${CIFRA[@]}" -in "$1" -out "$2" -pass env:BACKUP_SENHA
}
decifrar() { # entrada saida
  openssl enc -d "${CIFRA[@]}" -in "$1" -out "$2" -pass env:BACKUP_SENHA
}

copiar_drive() { # arquivo.sql.gz chave-base
  local gz="$1" nome="$2.enc"
  if [ -z "${BACKUP_SENHA:-}" ] || [ -z "${RCLONE_DRIVE_TOKEN:-}" ]; then
    info "Drive: sem BACKUP_SENHA ou RCLONE_DRIVE_TOKEN, a cópia fora da Cloudflare não foi feita"
    resumo "- ⚠️ Cópia no Google Drive: desligada (faltam os segredos BACKUP_SENHA e RCLONE_DRIVE_TOKEN)."
    return 0
  fi
  command -v rclone >/dev/null || morre "rclone não está instalado no runner."
  cifrar "$gz" "$TMP/$nome" || morre "A cifra da cópia falhou."
  # Prova: a cópia cifrada volta a ser exatamente o arquivo de origem.
  decifrar "$TMP/$nome" "$TMP/prova.gz" && cmp -s "$gz" "$TMP/prova.gz" \
    || morre "A cópia cifrada não decifra igual ao original." "Nada foi enviado ao Drive."
  export RCLONE_CONFIG_GDRIVE_TYPE=drive RCLONE_CONFIG_GDRIVE_TOKEN="$RCLONE_DRIVE_TOKEN"
  rclone copyto "$TMP/$nome" "gdrive:$DRIVE_PASTA/$nome" >"$TMP/drive.log" 2>&1 \
    || morre "O envio ao Google Drive falhou." "$(tail -15 "$TMP/drive.log")
O token pode ter vencido: gere outro com rclone authorize \"drive\" e troque o segredo RCLONE_DRIVE_TOKEN."
  rclone delete --min-age "${DIAS}d" "gdrive:$DRIVE_PASTA" >>"$TMP/drive.log" 2>&1 \
    || printf '::warning::%s\n' "A cópia foi para o Drive, mas apagar as de mais de $DIAS dias falhou."
  verde "✓ Drive: $DRIVE_PASTA/$nome (cifrado)"
  resumo "- Cópia cifrada no Google Drive: \`$DRIVE_PASTA/$nome\` (some depois de $DIAS dias)."
}

# ── provar-gravacoes ──────────────────────────────────────────────────────
# O teste do filtro, reproduzível e sem nuvem: um D1 local com o schema de
# produção, uma conta e UMA gravação com blob de 1 MB (2 MB em hexadecimal no
# dump). O dump cru tem de falhar na restauração com SQLITE_TOOBIG (senão o
# filtro deixou de ter motivo, e alguém precisa olhar); o dump filtrado tem
# de restaurar e bater as contagens, com gravacoes 0/0 e accounts 1/1.
provar_gravacoes() {
  local proj="$TMP/sintetico" cru="$TMP/sintetico.sql" filtrado="$TMP/sintetico-sem-gravacoes.sql" n
  mkdir -p "$proj"
  # `d1 export --local` não aceita --persist-to: o banco local mora em
  # .wrangler/ de um diretório de projeto. Um projeto descartável, então.
  printf 'name = "sintetico"\ncompatibility_date = "2025-01-01"\n[[d1_databases]]\nbinding = "DB"\ndatabase_name = "%s"\ndatabase_id = "00000000-0000-0000-0000-000000000000"\n' "$DB" > "$proj/wrangler.toml"

  verde "1. Um banco local com o schema de produção, uma conta e uma gravação de 1 MB"
  $W d1 execute "$DB" --local --cwd "$proj" --file="$PWD/worker/schema.sql" -y >"$TMP/sint-schema.log" 2>&1 \
    || morre "Não consegui aplicar worker/schema.sql no banco local." "$(tail -15 "$TMP/sint-schema.log")"
  $W d1 execute "$DB" --local --cwd "$proj" -y --command \
    "INSERT INTO accounts (email,name,pass_hash,pass_salt,created_at) VALUES ('prova@example.invalid','Prova','h','s',1);
     INSERT INTO gravacoes VALUES ('he-00000001','audio/wav',randomblob(1000000),1000000,120,900,780,'dono@example.invalid',1)" \
    >"$TMP/sint-dados.log" 2>&1 \
    || morre "Não consegui inserir os dados sintéticos." "$(tail -15 "$TMP/sint-dados.log")"
  $W d1 export "$DB" --local --cwd "$proj" --output="$cru" -y >"$TMP/sint-export.log" 2>&1 \
    || morre "O export local falhou." "$(tail -15 "$TMP/sint-export.log")"
  info "dump cru: $(wc -c < "$cru" | tr -d ' ') bytes; $(comando_longo "$cru")"

  verde "2. O dump cru TEM de falhar na restauração (é o defeito de 30/09/2026)"
  rm -rf "$TMP/restaura-cru"; mkdir -p "$TMP/restaura-cru"
  if $W d1 execute "$DB" --local --persist-to "$TMP/restaura-cru" --file="$cru" -y >"$TMP/sint-cru.log" 2>&1; then
    morre "O dump cru restaurou. O teto do SQLite mudou?" "Se o wrangler passou a dividir comandos, este filtro pode ser revisto; até lá, olhar antes de mexer."
  fi
  grep -q 'SQLITE_TOOBIG' "$TMP/sint-cru.log" \
    || morre "O dump cru falhou, mas não por SQLITE_TOOBIG." "$(tail -10 "$TMP/sint-cru.log")"
  info "falhou como esperado: $(grep -o 'statement too long: SQLITE_TOOBIG' "$TMP/sint-cru.log" | head -1)"

  verde "3. O dump filtrado TEM de restaurar com as mesmas contagens"
  n="$(sem_gravacoes "$cru" "$filtrado")" || morre "O filtro falhou."
  [ "$n" = "1" ] || morre "O filtro tirou $n linha(s) de gravacoes; esperava 1."
  grep -q '^CREATE TABLE "\?gravacoes' "$filtrado" || morre "O CREATE TABLE de gravacoes sumiu do dump filtrado."
  info "ids que saíram: $(ids_gravacoes "$cru" | tr '\n' ' ')"
  info "dump filtrado: $(wc -c < "$filtrado" | tr -d ' ') bytes"
  conferir_local "$filtrado"
  grep -qE '^✓ gravacoes +saiu +0 · voltou +0' "$TMP/comparacao.txt" || morre "gravacoes não voltou 0/0."
  grep -qE '^✓ accounts +saiu +1 · voltou +1' "$TMP/comparacao.txt" || morre "accounts não voltou 1/1."
  verde "✓ O filtro de gravacoes funciona: o dump cru estoura o SQLite, o filtrado restaura e bate."
}

# ── ensaiar ───────────────────────────────────────────────────────────────
ensaiar() {
  local chave="${1:-ultimo/hebreo-fluido.sql.gz}" arq="$TMP/ensaio.sql"
  # A chave vem de um campo digitado no Actions: só o formato das nossas.
  printf '%s' "$chave" | grep -qE '^(diario|ultimo)/[A-Za-z0-9._-]+\.sql\.gz$' \
    || morre "Chave inválida: $chave" "Use uma como diario/hebreo-fluido-AAAAMMDD-HHMMSS.sql.gz, ou deixe vazio."
  # A tranca que importa: este modo APAGA e recria o banco de destino.
  [ "$ENSAIO_DB" != "$DB" ] || morre "O banco de ensaio tem o nome da produção. Parando."

  verde "1. Baixando $BUCKET/$chave"
  $W r2 object get "$BUCKET/$chave" --file="$arq.gz" --remote >"$TMP/get.log" 2>&1 \
    || morre "Não consegui baixar a cópia." "$(tail -15 "$TMP/get.log")"
  gunzip "$arq.gz"
  contar_no_arquivo "$arq" > "$TMP/saiu.txt"

  verde "2. Criando o banco de teste $ENSAIO_DB (na Cloudflare, vazio)"
  apagar_ensaio
  $W d1 create "$ENSAIO_DB" >"$TMP/cria-db.log" 2>&1 \
    || morre "Não consegui criar o banco de teste." "$(tail -15 "$TMP/cria-db.log")"
  trap 'apagar_ensaio; rm -rf "$TMP"' EXIT

  verde "3. Restaurando a cópia inteira nele"
  $W d1 execute "$ENSAIO_DB" --remote --file="$arq" -y >"$TMP/restaura-remoto.log" 2>&1 \
    || morre "A restauração na Cloudflare falhou." "$(tail -20 "$TMP/restaura-remoto.log")"

  verde "4. Conferindo tabela por tabela"
  contar_no_banco "$ENSAIO_DB" --remote > "$TMP/voltou.txt" \
    || morre "Restaurou, mas não consegui contar as tabelas."
  if comparar "$TMP/saiu.txt" "$TMP/voltou.txt" | tee "$TMP/comparacao.txt"; then
    resumo "## ✅ Ensaio de restauração: passou"
    resumo ""
    resumo "- Cópia \`$BUCKET/$chave\` restaurada do zero num banco novo na Cloudflare ($(date -u +%d/%m/%Y) UTC)."
    resumo "- Todas as tabelas voltaram com o mesmo número de linhas. O banco de teste foi apagado em seguida."
    resumo ""
    tabela_no_resumo "$TMP/comparacao.txt"
    verde "✓ A cópia restaura do zero. O banco de teste será apagado."
  else
    resumo "## ❌ Ensaio de restauração: FALHOU"
    morre "O banco restaurado não bate com a cópia (acima)."
  fi
}

apagar_ensaio() {
  [ "$ENSAIO_DB" != "$DB" ] || return 0
  if $W d1 list --json 2>/dev/null | grep -q "\"$ENSAIO_DB\""; then
    $W d1 delete "$ENSAIO_DB" -y >/dev/null 2>&1 \
      && info "banco de teste $ENSAIO_DB apagado" \
      || printf '::warning::Não consegui apagar o banco de teste %s. Apague no painel (D1).\n' "$ENSAIO_DB"
  fi
}

# A conta vem do PRÓPRIO token, como em scripts/cloudflare-setup.sh: um
# CLOUDFLARE_ACCOUNT_ID colado errado faz a Cloudflare responder "could not
# route" em vez de um erro que aponte para o lugar certo.
conta() {
  local who acc
  who="$($W whoami 2>&1)"
  if printf '%s' "$who" | grep -qi "not authenticated\|not logged in\|please run.*login"; then
    morre "O wrangler não está autenticado." \
          "No GitHub Actions falta o segredo CLOUDFLARE_API_TOKEN (o mesmo da publicação)."
  fi
  acc="$(printf '%s' "$who" | grep -oE '[0-9a-f]{32}' | head -1)"
  [ -n "$acc" ] && export CLOUDFLARE_ACCOUNT_ID="$acc" && info "conta $acc"
  return 0
}

case "${1:-}" in
  copiar)   conta; copiar ;;
  ensaiar)  shift; conta; ensaiar "${1:-}" ;;
  conferir) [ -f "${2:-}" ] || morre "Uso: $0 conferir arquivo.sql"; conferir_local "$2"; verde "✓ A cópia restaura." ;;
  provar-gravacoes) provar_gravacoes ;;
  provar-cifra)
    # Sem nuvem: cifra e decifra um arquivo e confere que volta igual.
    BACKUP_SENHA="${BACKUP_SENHA:-senha-de-teste}"; export BACKUP_SENHA
    head -c 200000 /dev/urandom > "$TMP/x" && cifrar "$TMP/x" "$TMP/x.enc" && decifrar "$TMP/x.enc" "$TMP/y" \
      && cmp -s "$TMP/x" "$TMP/y" && ! cmp -s "$TMP/x" "$TMP/x.enc" && verde "✓ A cifra volta igual." || morre "A cifra não volta igual." ;;
  *) morre "Uso: $0 copiar | ensaiar [chave] | conferir arquivo.sql | provar-gravacoes | provar-cifra" ;;
esac
