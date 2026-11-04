# Plano: a versão em espanhol do curso de alfabetização

Pedido do dono (04/11/2026): "traduzir a plataforma inteira para espanhol". Feito pelo mesmo
caminho do inglês (PLANO-INGLES.md): mesmo código, uma terceira build.

## A arquitetura

- **Mesmo código, três builds.** `NEXT_PUBLIC_LOCALE=es` gera o export em espanhol em
  `app/out-es/`; sem a variável, sai o português de hoje, igual.
- **O site em espanhol é um site "de fora", como o inglês**: sem PIX, sem CDC, sem WhatsApp
  (+55), sem CNPJ no JSON-LD, Paddle em dólar, 14 dias para desistir. No código isso é
  `EXTERIOR` (`app/src/i18n/locale.ts`) e `exterior()` (`worker/src/lib/idioma.js`).
- **Interface:** cada dicionário de `app/src/i18n/telas/` tem agora `pt`, `en` e `es`, e a
  linha do `tx` escolhe entre os três (o minificador apaga os dois que não vão ao ar).
- **Conteúdo do curso:** `data/es/`, igual a `data/en/`, com o texto no campo `es`.
  `node tools/i18n.mjs extrair` atualiza os dois; `relatorio es` mostra o que falta.
- **Transliteração:** `tools/translit-es.mjs` (e a cópia em `app/src/i18n/translit.ts`),
  convertida da do português na build.
- **E-mails:** `worker/src/lib/mail-es.js`, os mesmos nomes de `mail-en.js`, ligados em
  `lib/mensagens.js`. A conta guarda `idioma = 'es'` (mesma coluna da migração 0004).
- **Políticas:** `app/src/components/legal/es/` (Termos, Privacidade, Reembolso), traduzidas
  do inglês, que é o texto escrito para o público de fora. Versões em `data/politicas-versoes-es/`.
- **Worker:** `wrangler.es.toml` (o terceiro), `LOCALE = "es"`, ainda sem domínio e sem publicação.
- **Catálogo e empresa:** `titleEs`, `taglineEs`... em `data/courses.json`; `horarioEs`,
  `lembreteDeEstudoEs`, `atualizadoEmEs` em `data/empresa.json`. O e-mail de contato é o do
  inglês até haver um `emailEs`.

Montar à mão:

```sh
cd app && NEXT_PUBLIC_LOCALE=es HF_I18N_ESTRITO=1 npm run build   # app/out-es
npx wrangler dev -c wrangler.es.toml --local
```

## O repositório (04/11/2026, decisão do dono)
O site em espanhol mora em **`Moshikgueta/hebreo-fluido`** (privado), com o histórico comum com o
brasileiro e **banco próprio** (`hebreo-fluido`, ainda por criar na Cloudflare). Lá, o `wrangler.toml` é o do
espanhol, e toda Action fica parada até a variável `HEBREO_PUBLICAR = true`. Falta adaptar o
`deploy-worker.yml` de lá para montar `app/out-es` (hoje ele monta o português), na etapa da publicação.

## Onde estamos

**Etapas 1 e 2 feitas (04/11/2026):** a estrutura e a PRIMEIRA versão de toda a tradução
(telas, conteúdo do curso, e-mails, políticas), em espanhol neutro da América Latina, com "tú".

## Para o dono decidir

1. **Mercado e domínio.** Um site para toda a América Latina (como está escrito), ou um país
   primeiro? O domínio, e se o site em espanhol mora num repositório próprio, como o inglês
   (`fluent-hebrew`).
2. **Preço e pagamento.** Hoje o espanhol segue o inglês: US$ 47 pelo Paddle, 14 dias. A Mercado
   Pago também atende vários países de língua espanhola, mas em moeda local.
3. **A transliteração** (etapa 3), primeira versão em `tools/translit-es.mjs`:
   ח/כ = j (léjem, Janucá), צ׳ = ch, ז׳ = zh, ג׳ = y, ss = s, o acento da sílaba forte fica.
   O "y" para ג׳ é o ponto mais discutível.
4. **As comparações de pronúncia com o espanhol** (marcadas `etapa 3: pronúncia, rever`), em
   especial `telas/motor-som-pt.ts`, `motor-pares-de-som.ts`, `motor-exam.ts` (`gerechDesc`) e
   `motor-alfabeto-publico.ts`. Algumas telas dizem que o curso compara os sons "con el
   español": isso só é verdade quando essas frases forem aprovadas.
5. **As gravações do professor** comparam com o português (ex.: a ח com o R de sotaques
   brasileiros). O texto em espanhol compara com a j de "jamón": texto e áudio não batem.
6. **A biografia** (`telas/motor-autor.ts`, `venda-trajetoria.ts`, `venda-hero.ts`): tradução
   literal do português ou do inglês, nada acrescentado. Conferir.
7. **O depoimento da Natália**: o site de fora não mostra depoimentos (`EXTERIOR`).
8. **Nomes de produtos**: "Israel Alem do Obvio" e "Raizes Sefarditas" ficaram como no inglês.
9. **Políticas**: o advogado precisa ler as três antes de ir ao ar (e dizer se convém citar as
   leis de dados de México, Argentina, Colômbia, Chile).

## O que falta (as próximas etapas)

| # | Etapa | Quem |
|---|---|---|
| 3 | Transliteração e comparações de pronúncia aprovadas | dono |
| 4 | Revisão por nativos (planilha: `node tools/i18n.mjs planilha es`) | revisores do dono |
| 5 | Domínio, Worker publicado, Paddle com o domínio aprovado | dono e Claude |
| 6 | Políticas com o advogado | advogado |
| 7 | SEO e página de venda revisados em espanhol (o cartão do link já existe: `og-curso-es.jpg`) | Claude |
