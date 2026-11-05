#!/usr/bin/env bash
# Instala o Chromium do Playwright sem pendurar a publicação (05/11/2026).
#
# Uso: bash scripts/instalar-chromium.sh "playwright@<versão>"
#      (rodado da pasta onde o `npx` deve achar o Playwright)
#
# Por que existe: em 05/11/2026 duas publicações caíram porque o
# `install --with-deps chromium` pendurou. Uma tentativa durou 17 minutos com
# teto de 5, porque o apt-get das bibliotecas do sistema roda com sudo e o
# `timeout` sem `-k` não o matava; o que sobrava dele derrubava a tentativa
# seguinte em um segundo. A saída ia para /dev/null, então não havia como
# saber o porquê. O passo "E-book no site" ganhou a correção primeiro (PR
# 394); este script leva a mesma correção às conferências em navegador.
#
#   1. As bibliotecas do sistema vão à parte, com teto e `-k` (mata de vez).
#      Se falharem, segue com um aviso: a máquina do GitHub já traz quase
#      todas, porque já traz o Google Chrome.
#   2. O navegador é baixado sem o apt-get, em até duas tentativas de 4
#      minutos com `-k`, apagando antes a trava que uma tentativa morta deixa.
#   3. A saída vai para um arquivo, e o fim dele aparece no log quando algo
#      falha.
#
# Sai com erro só se o navegador não vier nas duas tentativas. No pior caso
# leva uns 13 minutos; num dia normal, segundos (o navegador vem do cache).
set -u
PW="${1:?uso: instalar-chromium.sh playwright@<versão>}"
LOG="${RUNNER_TEMP:-/tmp}/playwright-install-$$.log"

if ! timeout -k 15 240 npx --yes "$PW" install-deps chromium >"$LOG" 2>&1; then
  echo "::warning::As bibliotecas do Chromium não instalaram em 4 minutos; segue com as da máquina."
  tail -n 20 "$LOG" || true
fi

for tentativa in 1 2; do
  rm -rf "$HOME/.cache/ms-playwright/__dirlock"
  if timeout -k 15 240 npx --yes "$PW" install chromium >"$LOG" 2>&1; then
    exit 0
  fi
  echo "Chromium: a tentativa $tentativa falhou ou passou de 4 minutos."
  tail -n 20 "$LOG" || true
done
echo "Chromium não instalou em 2 tentativas." >&2
exit 1
