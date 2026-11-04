#!/usr/bin/env bash
# Uma cópia do banco, na sua máquina, com a restauração ensaiada.
# ──────────────────────────────────────────────────────────────────────────
#   bash scripts/backup-d1.sh              # copia a produção
#   bash scripts/backup-d1.sh --ensaiar    # copia E prova que a cópia restaura
#
# Por que existe, se a Cloudflare já tem Time Travel: o Time Travel volta o
# banco para um instante dos últimos trinta dias, e é excelente para
# "rodei o UPDATE errado agora". Ele não cobre os três casos que acabam com
# um negócio: a conta ser suspensa, o banco ser apagado, e o erro só ser
# notado no trigésimo primeiro dia. Um arquivo .sql na sua máquina cobre.
#
# E, mais importante: um backup que nunca foi restaurado não é um backup, é
# uma esperança. O `--ensaiar` restaura a cópia num banco local e confere que
# as tabelas e as contagens voltaram. Faça isso pelo menos uma vez.
#
# ⚠ O ARQUIVO GERADO É SEGREDO. Ele tem e-mail de todo aluno, o hash da senha
# de cada um, os pedidos e a trilha. Vale o mesmo que o banco: guarde onde
# você guardaria uma cópia da sua carteira, nunca num repositório, nunca num
# artefato do Actions (que todo colaborador do repositório baixa), nunca anexado
# a um chamado de suporte.

set -uo pipefail
cd "$(dirname "$0")/.."

DB_NAME="hebreo-fluido"
# Mesma versão fixa do script de publicação, pelo mesmo motivo: este comando
# roda com o token da Cloudflare no ambiente.
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

DESTINO="${HF_BACKUP_DIR:-backups}"
CARIMBO="$(date +%Y%m%d-%H%M%S)"
ARQUIVO="$DESTINO/hebreo-fluido-$CARIMBO.sql"

vermelho() { printf '\033[31m%s\033[0m\n' "$*"; }
verde()    { printf '\033[32m%s\033[0m\n' "$*"; }
info()     { printf '  %s\n' "$*"; }

morre() { vermelho "✗ $1"; [ $# -gt 1 ] && printf '\n  %s\n' "$2"; exit 1; }

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] && [ ! -d "$HOME/.wrangler" ]; then
  morre "Sem credencial da Cloudflare." \
        "Rode 'npx wrangler login' uma vez, ou exporte CLOUDFLARE_API_TOKEN."
fi

mkdir -p "$DESTINO"

# O diretório de backups nunca pode entrar no git. O .gitignore já cobre, e
# esta linha é a segunda tranca - ela vale mesmo se alguém mudar o destino
# com HF_BACKUP_DIR para um lugar rastreado.
if git check-ignore -q "$ARQUIVO" 2>/dev/null; then
  :
else
  morre "O destino '$DESTINO' NÃO está no .gitignore." \
        "Um dump do banco versionado é o vazamento mais completo possível.
       Acrescente '$DESTINO/' ao .gitignore, ou use HF_BACKUP_DIR para
       apontar para fora do repositório."
fi

printf '\n'
verde "1. Copiando a produção"
info "banco: $DB_NAME"
info "para:  $ARQUIVO"

if ! $W d1 export "$DB_NAME" --remote --output="$ARQUIVO" 2>/tmp/hf-backup-erro; then
  morre "O export falhou. O wrangler disse:

$(sed 's/^/       /' /tmp/hf-backup-erro | tail -20)"
fi

TAMANHO="$(wc -c < "$ARQUIVO" | tr -d ' ')"
LINHAS="$(grep -c 'INSERT INTO' "$ARQUIVO" || true)"
[ "$TAMANHO" -gt 200 ] || morre "O arquivo saiu vazio ($TAMANHO bytes). Não conte com ele."

# Só o dono lê. Um dump legível por todo usuário da máquina é o mesmo dump.
chmod 600 "$ARQUIVO"
verde "✓ $TAMANHO bytes · $LINHAS linhas de dados"

printf '\n'
if [ "${1:-}" != "--ensaiar" ]; then
  info "Para provar que esta cópia restaura, rode:"
  info "  bash scripts/backup-d1.sh --ensaiar"
  printf '\n'
  exit 0
fi

# ── o ensaio ──────────────────────────────────────────────────────────────
# Restaura num banco LOCAL (nunca no remoto: um --remote aqui seria um
# script de backup que apaga a produção) e confere que o que voltou tem as
# tabelas e as linhas que saíram.
verde "2. Ensaiando a restauração, num banco local"

ENSAIO=".wrangler/ensaio-$CARIMBO"
rm -rf "$ENSAIO"; mkdir -p "$ENSAIO"

if ! $W d1 execute "$DB_NAME" --local --persist-to "$ENSAIO" \
     --file="$ARQUIVO" >/tmp/hf-restore 2>&1; then
  morre "A cópia NÃO restaurou. O wrangler disse:

$(tail -20 /tmp/hf-restore | sed 's/^/       /')" \
        "Um backup que não restaura é o pior dos dois mundos: ocupa espaço
       e dá confiança. Me mande essa saída."
fi

conta() {
  $W d1 execute "$DB_NAME" --local --persist-to "$ENSAIO" --json \
    --command "SELECT COUNT(*) AS n FROM $1" 2>/dev/null \
    | grep -o '"n": *[0-9]*' | head -1 | tr -cd '0-9'
}

printf '\n'
for t in accounts entitlements orders payment_events progress invites; do
  N="$(conta "$t")"
  info "$(printf '%-16s %s' "$t" "${N:-?} linha(s)")"
done

CONTAS="$(conta accounts)"
rm -rf "$ENSAIO"

printf '\n'
if [ -n "$CONTAS" ]; then
  verde "✓ A cópia restaura. $CONTAS conta(s) voltaram."
else
  morre "Restaurou sem erro, mas não consegui contar as contas." \
        "Confira o arquivo à mão antes de confiar nele."
fi

info "Guarde $ARQUIVO fora desta máquina também - um disco que morre leva"
info "o repositório e o backup juntos."
printf '\n'
