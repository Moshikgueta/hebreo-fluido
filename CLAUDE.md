# Hebreo Fluido - o site em espanhol do Hebraico Fluente

## Este repositório (04/11/2026, decisão do dono)
Este é o repositório do **site em espanhol** (`Moshikgueta/hebreo-fluido`, privado), com **banco próprio**
(`hebreo-fluido`). O código é o MESMO do site brasileiro (`Moshikgueta/hebraicofluente`), com o histórico
comum; o que muda é a configuração. As notas abaixo desta seção são as do projeto inteiro e valem aqui.
- **O que é só daqui** (nunca copiar do brasileiro): `wrangler.toml` (`LOCALE = "es"`, `app/out-es`, banco
  `hebreo-fluido`, ainda sem domínio), `.github/workflows/` (todos com a trava `HEBREO_PUBLICAR`), os
  scripts com o nome do banco (`scripts/cloudflare-setup.sh`, `backup-d1.sh`, `backup-nuvem.sh`,
  `conferir-gravacoes.mjs`, `tools/exportar-gravacoes.mjs`, `app/sincronia.mjs`), `package.json`,
  `.env.example` e este `CLAUDE.md`. Aqui não existem `wrangler.en.toml` nem `wrangler.es.toml`.
- **Como receber melhorias:** `git merge` da `main` do brasileiro (o histórico é comum), resolvendo os
  arquivos da lista acima a favor deste repositório.
- **A build daqui é a em espanhol:** `cd app && NEXT_PUBLIC_LOCALE=es HF_I18N_ESTRITO=1 npm run build`.
- **Nada se publica ainda.** Faltam: o domínio, o banco (`npx wrangler d1 create hebreo-fluido` e o id no
  `wrangler.toml`), adaptar o `deploy-worker.yml` para montar `app/out-es`, os segredos e a variável
  `HEBREO_PUBLICAR = true`. Plano e pendências do dono: `PLANO-ESPANHOL.md`.
- Nas seções abaixo, "o site em produção" e "hebraicofluente.com.br" falam do site BRASILEIRO.

# Hebraico Fluente - notas do projeto

## Os dois sites iguais (28/10/2026, decisão do dono)
"Quero que os dois sites sejam iguais, mas com versões adaptadas para cada um." O site brasileiro
(`Moshikgueta/hebraicofluente`) e o de inglês (`Moshikgueta/fluent-hebrew`) têm o MESMO código; o que
muda entre eles é só configuração. Toda melhoria entra nos dois, na mesma rodada.
- **O que é de cada um** (nunca copiar de um para o outro): `wrangler.toml` (Worker, banco, domínio,
  `LOCALE`), `wrangler.en.toml` (só no brasileiro), `.github/workflows/` (no inglês, todos com a trava
  `FLUENT_PUBLICAR`), `package.json` e o lockfile, `.env.example`, os scripts com o nome do banco
  (`scripts/cloudflare-setup.sh`, `backup-d1.sh`, `backup-nuvem.sh`, `conferir-gravacoes.mjs`,
  `tools/exportar-gravacoes.mjs`, `app/sincronia.mjs`), `CLAUDE.md`, `PLANO-INGLES.md` e
  `app/tests/isolamento.test.ts` (só no inglês).
- **Todo o resto é igual.** O código do inglês fica atrás de `NEXT_PUBLIC_LOCALE=en` (build) e de
  `LOCALE = "en"` (Worker): sem eles, o site sai em português, com Mercado Pago e PIX, como sempre.
- **Como sincronizar:** no repositório do inglês, `git merge` do brasileiro (o histórico é comum);
  para o brasileiro, copiar os arquivos que diferem, menos a lista acima, e rodar lá os testes, a
  build de produção e as conferências (pacote, promessas, números, SEO, check-legal, clique, a11y).
- Texto novo de tela nasce com o inglês ao lado (dicionário); dado novo do curso pede
  `node tools/i18n.mjs extrair` e a tradução, senão a build estrita em inglês para.

## O site em espanhol (04/11/2026, pedido do dono: "traduzir a plataforma inteira para espanhol")
Terceira língua, no mesmo molde do inglês: `NEXT_PUBLIC_LOCALE=es` gera `app/out-es`, servido por
`wrangler.es.toml` (`LOCALE = "es"`, ainda sem domínio e sem publicação). Plano e pendências do dono em
`PLANO-ESPANHOL.md`.
- É um site de FORA, como o inglês: `EXTERIOR` (app/src/i18n/locale.ts) e `exterior()`
  (worker/src/lib/idioma.js) são "inglês OU espanhol". Condição nova de site de fora usa esses dois,
  nunca `=== 'en'` sozinho.
- Todo dicionário de tela tem `pt`, `en` e `es`; a linha do `tx` é
  `process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;`
  (tests/i18n.test.ts confere). Texto novo de tela nasce nos três.
- Conteúdo em `data/es/` (campo `es`); `node tools/i18n.mjs extrair` atualiza `data/en/` e `data/es/`.
- Transliteração: `tools/translit-es.mjs` = `translitEs` de app/src/i18n/translit.ts
  (tests/espanhol.test.ts). E-mails: `worker/src/lib/mail-es.js`. Políticas: `components/legal/es/`.

## Como trabalhar neste repositório (regras do dono)
Este projeto é SEPARADO do curso de espanhol (`Moshikgueta/espanolsindolordecabeza`).
Sessões do Claude para o Hebraico Fluente abrem só este repositório; nada do
espanhol (regras, fontes, provedor de pagamento) vale aqui.

- **Responder ao dono em português.**
- **Nunca fazer merge nem push em `main` sem aprovação.** Trabalhar no ramo da
  sessão, abrir PR e perguntar "Posso fazer o merge?". Depois de cada merge:
  reiniciar o ramo a partir da `main` nova e conferir a publicação
  (`deploy-worker.yml`) até ficar verde.
- **Conteúdo do curso só no presente.** Exceção aprovada: as leituras bíblicas
  bônus (`data/bonus.json`).
- **Hebraico escrito pelo Claude precisa da aprovação do dono antes de ir ao ar.**
- **Nunca inventar fatos sobre o dono** (Moshik Gueta): cargos, certificados,
  números de alunos, anos de experiência. Só o que ele informou.
- **Nunca trancar conteúdo central do curso atrás de XP.** A loja só troca extras.
- **Não apagar tabelas do banco de produção** sem pedido explícito.
- **Nenhum identificador de modelo** em commits, PRs, comentários ou arquivos.
- **Incidente** (vazamento, invasão, segredo exposto, site fora): seguir
  `INCIDENTES.md`, na ordem. Tem a tabela de como trocar cada segredo e o
  prazo da ANPD.
- A auditoria de pré-lançamento de 28/09/2026 está em `audit/2026-09-28/`
  (`RELATORIO.md` é o consolidado; a seção Q é a ordem de correção).

## Escrita: nada de travessão
O texto do site, dos comentários, dos commits e da documentação usa **hífen `-`**.
Nunca o travessão (U+2014) nem a meia-risca (U+2013), nem as formas escapadas
delas (`\u` seguido do código). Este arquivo cita os dois só pelo número de
propósito: escrever o caractere aqui faria a própria verificação abaixo
acusar o documento que explica a regra.

Travessão é a assinatura mais visível de texto gerado por IA, e este
projeto é vendido como material de um autor. A regra vale para:

- todo arquivo sob `app/`, `data/`, `worker/`, `scripts/`, `tools/`, `.github/`
- os `.md` da raiz, `wrangler.toml`, `.env.example`
- **os geradores**, não só a saída: `tools/export-content.mjs` escreve o cabeçalho
  de `app/src/lib/audio-manifest.ts`, então um travessão lá volta a cada
  `npm run export-content`

Verificação (o locale importa, senão a contagem sai em bytes):

```sh
LC_ALL=C.UTF-8 grep -rlP '\x{2014}|\x{2013}' \
  --exclude-dir={node_modules,.next,out,dist,.git,.wrangler,.claude} .
grep -rn 'u2014\|u2013' --exclude-dir={node_modules,.next,out,dist,.git,.wrangler,.claude} .
```

As duas linhas têm de sair vazias. As réguas de caixa (`─`, U+2500) dos
cabeçalhos de comentário não são travessões e ficam como estão.
`.claude/skills/` fica de fora: são as skills de marketing de terceiros
(coreyhaines31/marketingskills, MIT, instaladas com `npx skills add`), não
texto do site nem do autor.

## Onde mora o quê
- `data/*.json` é a fonte. `app/content/` e `app/src/lib/audio-manifest.ts` são
  **gerados** por `npm run export-content` - editar a saída é perder o trabalho no
  próximo build.
- `data/courses.json` é o catálogo: uma linha por curso, e é dele que saem
  `/cursos`, cada página de curso e **o preço cobrado**. O servidor lê o mesmo
  arquivo (`worker/src/lib/catalog.js`): preço nunca vem do corpo da requisição.
- `worker/` é a API (`/api/*`) e o portão do conteúdo pago. `IMPLEMENTATION` da
  camada de comércio: `DEPLOY-CLOUDFLARE.md` + `worker/schema.sql`.

## O site em inglês (desde 28/10/2026, etapa 1 concluída)
Plano e decisões do dono em `PLANO-INGLES.md` (domínio próprio, US$ 47, Paddle).
Um repositório, um banco, dois sites: `NEXT_PUBLIC_LOCALE=en` gera `app/out-en`,
servido pelo segundo Worker (`wrangler.en.toml`, mesmo D1, ainda sem domínio e
sem publicação). Sem a variável, o site brasileiro sai igual.
- **Texto fixo de tela** mora em `app/src/i18n/telas/<tela>.ts`, com o
  português (o texto de antes, igual) e o inglês lado a lado, lido como
  `tx.chave` (`fmt` para variáveis). Ver o molde em `app/src/i18n/index.ts`:
  a linha do `tx` é escrita igual em todo arquivo, senão o pacote do
  navegador leva os dois idiomas. `Traducao<typeof pt>` recusa chave faltando.
- `node tools/textos-soltos.mjs` (de app/) lista o português ainda escrito
  direto no código das telas do escopo do site em inglês.
  Tem de sair 0: tela nova nasce com dicionário. O que fica fora do escopo
  (Raízes, A1, painéis, políticas, portal guardado) está em `FORA_DO_ESCOPO`.
- **E-mail novo ao aluno** precisa da versão em `worker/src/lib/mail-en.js`
  e de entrar em `lib/mensagens.js`; o idioma vem de `lib/idioma.js` (o do
  site para o que a pessoa pede agora, o da conta para o agendamento).
- Datas e números: `LOCALE_INTL` de `@/i18n`, nunca `'pt-BR'` escrito à mão.
- **Mudou um `data/*.json` do curso?** Rode `node tools/i18n.mjs extrair`: o
  `data/en/` é a lista de trabalho da tradução e `tests/i18n.test.ts` falha se
  ele não acompanhar a fonte. Texto já traduzido cujo português mudou fica
  marcado `revisar`.
- O inglês nunca mexe no hebraico: os trechos em hebraico e as marcas `{{...}}`
  têm de ser os mesmos do português (`mesmoHebraico`). A transliteração fica
  fora do `data/en/` (o inglês terá sistema próprio, etapa 3).
- `HF_I18N_ESTRITO=1` faz a build em inglês parar com qualquer texto sem
  tradução; o relatório sai em `app/content/_traducao.json` e em
  `node tools/i18n.mjs relatorio`.

## Invariantes que quebram o produto se forem ignorados
- **Noto Sans Hebrew é obrigatória** para todo hebraico: são 55 sinais de nikud e
  uma tabela `ccmp`. Fonte que posiciona vogal errado torna todo exercício de
  leitura errado.
- **`<He>` é a única porta de entrada para hebraico.** `unicode-bidi: isolate`,
  e pontuação nunca dentro do span hebraico.
- **Regra da ordem:** nenhuma palavra usa letra que ainda não foi ensinada.
  `npm run validate` cobra isso.
- **Limite de 10 ms de CPU** por requisição no plano gratuito do Workers. É por
  isso que o PBKDF2 roda 25.000 iterações (`worker/src/lib/crypto.js`) e não
  as 600.000 do OWASP. `wrangler dev` não aplica o limite: o erro só aparece em
  produção. Com o Workers Paid: descomentar `PBKDF2_ITERATIONS = "600000"` e o
  bloco `[limits] cpu_ms = 300` no wrangler.toml e publicar; as contas se
  atualizam sozinhas no próximo login.
- **A fusão de progresso é monotônica** (`app/src/lib/state/merge.ts`). Todo
  campo tem um "mais adiantado dos dois" e é ele que fica; contagem é MÁXIMO e
  nunca soma, senão o mesmo dia sincronizado duas vezes dobra o XP. É essa
  propriedade que deixa o adaptador repetir a fusão depois de um 409 sem medo
  de desfazer alguma coisa. Um campo novo no estado precisa de uma regra aqui,
  e de um teste em `app/tests/merge.test.ts`.

## Estado da operação (19/09/2026)
O que está LIGADO em produção, porque um documento que descreve a intenção em
vez do estado manda quem lê procurar no lugar errado:

- **Endereço:** `hebraicofluente.com.br`, com o `*.workers.dev` de conferência.
- **Pagamento: MERCADO PAGO pedida, resolvida a cada publicação.**
  `pagamento.modo` em `data/empresa.json` está em `mercadopago` e diz como se
  QUER cobrar. Quem decide o que VAI ao ar é `scripts/pagamento-ativo.mjs`, um
  passo do deploy que roda **antes do build** e pergunta à Mercado Pago
  (`/users/me`) se a credencial publicada autentica:
  - autenticou → publica em `mercadopago`: PIX, cartão, parcelamento e
    confirmação automática;
  - não autenticou → reescreve o modo para `pix-direto` **só naquela
    execução** (o repositório não muda) e diz no resumo por quê. O site vende
    por PIX em vez de recusar toda compra.

  É o mesmo arquivo dos dois lados - o build do site, que decide o que
  oferecer, e o bundle do Worker, que decide o que criar -, e é por isso que a
  página nunca oferece cartão enquanto o servidor só sabe fazer PIX.
- **Desde 19/09/2026 a credencial autentica** e o que está no ar é a Mercado
  Pago: PIX, cartão, parcelamento e confirmação automática. O caminho até aqui,
  porque o sintoma vai voltar se a chave for trocada de novo: o segredo
  carregava a **Public Key**, e a resposta que encerrou a dúvida foi
  `400 {"message":"invalid_token"}` - um 400, não um 401, que lido pelo código
  mandaria procurar erro na chamada. Os dois valores começam com `APP_USR-`; o
  Access Token tem números com hífens, a Public Key tem o desenho de um UUID.
- **O PIX direto continua pronto**, como rede por baixo: BR Code gerado por nós
  (`worker/src/lib/pix.js`) a partir da chave do CNPJ, sem adquirente nem
  gateway. É para onde a publicação cai sozinha se a credencial parar de
  autenticar - e lá **nada confirma o pagamento sozinho**: a liberação é à mão
  em Actions → Acesso → `liberar`, depois de olhar o extrato.
- **Cobrança real provada:** o dono confirmou em 26/10/2026 que já houve
  compra de verdade. O e2e continua pulando a criação quando o token é de
  produção, de propósito (senão cada publicação deixaria um PIX pendente no
  painel); uma falha numa compra real aparece em Actions → Acesso →
  `pagamento`, que lê `pay-create-failed` com o motivo que a Mercado Pago
  devolveu.
- **E-mail: LIGADO.** Resend, com `EMAIL_FROM` no `wrangler.toml` e
  `RESEND_API_KEY` nos segredos do repositório.
- **Ainda por conferir:** a assinatura do webhook da Mercado Pago contra uma
  notificação real. Não é bloqueante hoje (o webhook não é usado no PIX
  direto), e quando a Mercado Pago voltar o acesso continua tendo três caminhos
  independentes: webhook, `/api/pay/verify` na volta do comprador, e a
  varredura de 5 em 5 min em `worker/src/reconcile.js`.

**O que o site promete tem de ser o que o site faz.** O modo resolvido muda
texto corrido em nove páginas - rodapé, capa, página do curso, FAQ,
Termos, Privacidade, Reembolso, Suporte e o próprio checkout - e o tipo de
defeito que isso gera é silencioso: o build passa, a página fica bonita, e o
rodapé segue oferecendo "cartão em até 12x" numa loja que só processa PIX.
`npm run pagamento` (em `app/`) lê o modo, abre as nove páginas num navegador e
falha na frase que o modo não cumpre; leva o checkout até o código PIX e
confere o prazo prometido a quem já pagou. Rodar depois de mexer no modo.

**Operação sem terminal:** aba Actions → **Acesso**. `liberar` e `revogar`
mexem no acesso de alguém - e no PIX direto `liberar` **não é exceção, é o
processo**: é assim que cada compra vira acesso. `revogar` é a metade que se
esquece depois de um estorno: devolver o dinheiro NÃO tira o curso.
`consultar`, `listar`, `envios` e `pagamento` só leem - `envios` mostra o
motivo que a Resend devolveu quando um e-mail de senha não saiu, e `pagamento`
mostra os pedidos que falharam, com a razão que o provedor deu.

## Auditoria de segurança (20/09/2026)
`SECURITY-AUDIT.md` é o relatório: dez agentes independentes, achados com
arquivo:linha, o que foi consertado e o que foi deixado como proposta. As
regras que ele fixou e que valem para todo commit daqui em diante:

- **Nenhuma decisão de acesso lê cabeçalho que o cliente escreve.** O portão
  (`worker/src/gate.js`) autentica TODA rota paga; `Sec-Fetch-Dest` só decide
  a forma da recusa. Foi um `curl -H 'Sec-Fetch-Dest: empty'` que abria a aula.
- **O conteúdo do curso não pode voltar para o pacote público.** Desde
  20/09/2026 ele sai de `/api/content`, atrás do cookie E do direito de acesso
  no banco. Quem importa os seis JSONs é `lib/content-servidor.ts`, e só
  componente de SERVIDOR pode lê-lo; o navegador lê o depósito de
  `lib/content.ts`, que nasce vazio. Um import estático novo em código de
  cliente desfaz tudo em silêncio - é o que `npm run pacote` (no deploy, contra
  o export publicado) e `tests/conteudo.test.ts` existem para impedir.
  Os 27 diagramas de traçado (`/stroke-order/`) também estão atrás do portão
  desde 24/09/2026; a landing lê só os que mostra, de `/tracado-amostra/`,
  que o exportador recria a partir de `AMOSTRA_TRACADO`
  (`tools/export-content.mjs`). Letra nova na landing entra nessa lista.
- **O repositório é público, e o resumo de cada execução do Actions também.**
  `acesso.yml` mascara todo e-mail que imprime (`mascara`); a trilha
  (`access_log`) não recebe e-mail; `payment_events` guarda só a projeção
  `enxuto()` do pagamento. Nada novo pode imprimir dado de cliente num resumo.
- **Freios decidem pela escrita atômica** (`throttled`: `INSERT ... ON CONFLICT
  ... RETURNING hits`); a leitura prévia só poupa a escrita de quem já estourou
  e nunca autoriza - ler e depois gravar deixava uma rajada em paralelo passar
  inteira. O do login conta só falhas, e vem ANTES de ler o corpo. Um freio que
  grava a cada tentativa barrada é o próprio amplificador.
- **Toda resposta sai por `blindar()`** (`worker.js`): página, API, 301, 302 do
  portão. Um caminho de resposta novo não pode contornar isso.
- **Escrita na API só da própria origem** (`worker.js`), webhook à parte.
- **A correção do pagamento está aplicada** (decisão do dono, 20/09/2026):
  chave do evento `id:status`, estorno (inclusive parcial) recua os meses do
  pedido, direito antes do pedido sem conceder duas vezes, renovação em 45
  dias, 404 do provedor não pede reenvio, logout invalida em todo aparelho.
  `app/tests/pagamento.test.ts` guarda os nove cenários; `audit/README.md` é o
  registro, com as duas decisões de produto embutidas (estorno parcial fecha o
  acesso; sair derruba todos os aparelhos) e o que conferir em produção.
- **Um convite não vira curso sozinho.** Cadastro num endereço presenteado
  AVISA o dono (e-mail para `SUPPORT_EMAIL`, um por endereço por dia) e não
  concede nada; o dono confirma com `liberar`. Quem se cadastrou não é
  informado de que havia presente. Ver a nota em `worker/src/lib/db.js`,
  acima de `invitesPendentes`.
- **A cota do D1 é superfície de ataque** (auditoria de 24/09/2026, medida
  contra o D1 local). No plano gratuito são 500 MB e 100.000 linhas escritas
  por dia, e banco cheio ou cota vencida é TODA escrita falhando - login,
  cadastro, pagamento. Duas regras saíram daí:
  - **Só conta com curso grava progresso** (`PUT /api/progress` → 403
    `sem-curso`, conferido antes do freio). Antes, mil contas grátis de 512 KB
    enchiam o banco. O app trata o 403 como "o aparelho guarda", igual a
    estar deslogado (`lib/state/worker.ts`).
  - **Toda rota que escreve tem teto por HORA por endereço**, conferido
    antes do freio do minuto, e recusa não escreve nada: login 20 erros e 60
    tentativas, cadastro 10, esqueci a senha 10, redefinir 20, saúde 30,
    checkout 10, e 20 somando as rotas da conta (senha, apagar, confirmar e
    reenviar o e-mail) - conta é de graça, então freio só por conta não
    segura. Falha de login contra e-mail inventado não vai para a trilha.
    Uma máquina passou de ~17.000 linhas por HORA para ~17.000 por DIA; a
    cota ainda acaba com uns seis endereços o dia inteiro, e o conserto de
    verdade é o Workers Paid. Rota nova que escreve nasce com teto por hora.
    `tests/auditoria.test.ts` ("a cota de escrita e o tamanho do banco")
    conta as linhas com `total_changes()`.
- **O horizonte da faxina do freio precisa ser maior que a maior janela em
  uso** (`throttled`, hoje 48h contra uma janela máxima de 24h). Menor, e a
  limpeza apaga a linha que a própria chamada acabou de criar - o freio
  conta até um para sempre.
- **Backup diário no R2** (desde 28/09/2026): a Action "Backup do banco"
  (`.github/workflows/backup.yml` + `scripts/backup-nuvem.sh`) exporta o D1
  às 03:17 de Brasília, restaura a cópia num banco local e só guarda no R2
  (`hebraico-fluente-backups`, privado, diárias por 90 dias) se todas as
  tabelas voltarem com as mesmas linhas. "ensaiar", à mão, restaura uma cópia
  do zero num banco de teste na Cloudflare e o apaga depois: uma vez por mês.
  Falha vira e-mail para o SUPPORT_EMAIL. O agendamento só roda no ramo
  PADRÃO do GitHub, que precisa ser a `main`.
- **Publicação volta sozinha** (desde 28/09/2026): `scripts/cloudflare-setup.sh`
  anota a versão no ar antes do `wrangler deploy`; se a conferência de
  produção (`worker/e2e.sh`) falhar duas vezes seguidas, faz `wrangler
  rollback` para ela e a execução fica vermelha. Uma falha só, seguida de
  sucesso, é tratada como passageira. O rollback não desfaz schema (que só
  cresce) nem segredos.
- **Token de teste barra a publicação:** `MP_ACCESS_TOKEN` com `TEST-` faz
  `scripts/pagamento-ativo.mjs` parar antes do build; o e2e de produção exige
  `modo: producao` e conta que não seja usuário de teste da Mercado Pago.
- **Trocar o e-mail de um aluno:** Actions → Acesso → `trocar-email` (campo
  E-mail = o de hoje, `novo_email` = o certo). Só depois de confirmar com o
  aluno por outro canal.
- **Mudança numa tabela que já existe** (desde 28/09/2026): o `schema.sql` só
  cria; `ALTER TABLE` vai num arquivo `worker/migrations/NNNN-descricao.sql`,
  aplicado uma vez pela publicação (passo 3b de `scripts/cloudflare-setup.sh`)
  e anotado na tabela `migracoes`. Só acrescentar (a versão anterior ainda
  está no ar quando a migração roda). Ver `worker/migrations/README.md`.
- **A varredura roda uma de cada vez**: trava `varredura` na tabela `travas`,
  4 minutos de validade, falha aberta (`pegarTrava` em `worker/src/lib/db.js`).
- **Lista do aviso do próximo curso** (desde 28/09/2026): a ÚNICA
  propaganda por e-mail, e só com consentimento. Entra pela caixa "Quero
  receber um e-mail quando o Hebraico A1 abrir" em /perfil (começa
  desmarcada); sai pela mesma caixa, pelo link assinado de /sair-da-lista
  (o GET só abre a página, quem tira é o POST) ou apagando a conta. Tabela
  `novidades`; tudo em `worker/src/api/novidades.js`. O envio do lançamento
  ainda não existe: cada mensagem precisa levar `linkDeSaida(env, id)` no
  corpo e nos cabeçalhos List-Unsubscribe. Nenhum outro e-mail de
  propaganda: a política de privacidade diz isso.
- **Desistência estorna sozinha** (desde 28/09/2026): `POST /api/pay/desistir`
  pede o estorno total à Mercado Pago na hora (`iniciarEstorno` em
  `worker/src/api/pay.js`, chave de idempotência `estorno-<pedido>`), a
  varredura tenta de novo o que falhou (8 vezes, intervalo dobrando) e o
  acesso fecha pelo caminho de sempre quando ela confirma. PIX direto e
  pedido liberado à mão ficam `manual`. Estado em `estornos`.
- **Alertas ao dono** (`worker/src/alertas.js`, na varredura): erros de
  pagamento na última hora viram um e-mail por hora; desistência sem estorno
  resolvido vira lembrete diário. A varredura marca um batimento, e
  `/api/health` responde `monitor: false` se ela parar: é o campo que o
  monitor externo de disponibilidade deve olhar (palavra-chave `"monitor":true`).
- **O backup é segredo:** tem e-mail e hash de senha de todo aluno. Nunca num
  artefato do Actions nem no git. `npm run db:backup` continua existindo para
  uma cópia na sua máquina.
- `npm run csp` prova a CSP num navegador; `app/tests/auditoria.test.ts`
  guarda cada ataque fechado. Um achado novo entra lá antes do conserto.
- **CSP estrita EM VIGOR desde 01/10/2026 (SEC-003).** O build de `app` roda
  `tools/csp-hashes.mjs`, que grava em `out/_csp-hashes.json` o hash de cada
  script inline de cada página. O Worker manda a `Content-Security-Policy`
  sem `'unsafe-inline'`, com esses hashes e um nonce novo por resposta (para o
  script de detecção de robôs que a Cloudflare injeta; ela carimba o nonce do
  cabeçalho no script dela). HTML sem lista de hashes (gerado pelo Worker,
  build antiga) sai com a política de reserva, com `'unsafe-inline'`. O
  navegador relata o que bloqueou em `/api/csp-report` (trilha
  `csp-violacao`, Actions → Acesso → `csp`). Ruído conhecido, que a política
  sempre bloqueou: `wasm-eval` (extensões) e `connect.facebook.net` (navegador
  do Instagram). Relato de script inline do PRÓPRIO site = algo quebrou.
  Qualquer script inline novo só funciona se vier do build (o hash é
  calculado lá). `CSP_ESTRITA=1 npm run csp` (em app) prova num Chromium.

## Proteção do conteúdo contra cópia (29/09/2026)
Pedido do dono. Nenhum site impede quem pagou de copiar o que vê; o que existe:
- **Marca invisível por conta** (`worker/src/lib/marca.js`): `/api/content`
  sai de um molde com um marcador de uso privado no FIM de cada "Você sabia?"
  e de cada parágrafo das cartas de cultura; por pedido, o marcador vira 32
  bits em caracteres de largura zero (a marca aleatória da conta, tabela
  `marcas`). Nunca em hebraico, transliteração ou texto comparado com
  resposta. `_licenca` no JSON mostra o número da cópia. O painel
  `/admin/marca` (POST `/api/admin/marca`, só administrador) lê um trecho
  colado e diz a conta. Banco fora: o curso sai sem marca, nunca sem aula.
- **Três aparelhos por conta** (`worker/src/lib/aparelhos.js`): cada entrada
  cria um `ap` no cookie e uma linha em `aparelhos`; a quarta apaga a mais
  antiga, e `requireAccount`, o portão e `/api/me` recusam o aparelho que
  saiu. Cookie sem `ap` (de antes) vale e ganha um no `/api/me`. Tabela
  ausente: ninguém fica trancado. Trocar a senha mantém o aparelho atual;
  sair libera todas as vagas.
- **Login dividido:** mais de 6 entradas em 24 h deixam `aparelhos-rodizio`
  na trilha (uma por conta por dia) e um e-mail diário ao dono
  (`alertaDeCompartilhamento` em alertas.js). NADA é bloqueado: os Termos
  (art. 4) pedem aviso e 5 dias úteis antes de suspender. Acesso →
  `consultar` mostra os aparelhos e esses dias.
- **Marca d'água visível** (`components/shell/MarcaDagua.tsx`): em pé na
  margem esquerda das páginas pagas, "Licenciado para an•••@dominio · cópia
  XXXXXXXX" (o número da marca invisível, lido de `_licenca`). O painel
  `/admin/marca` aceita esse número digitado, para quem só tem um print.
  Nada impede gravação de tela num site; isto faz a gravação levar a conta.
- **Aviso de direitos** (`AvisoDeDireitos`, no pé de toda página de aula) e
  Termos art. 5: Lei 9.610/1998 (arts. 102-104), Código Penal arts. 184 e
  154-A. Só a lei, sem ameaça que o site não cumpra; revisar com o advogado.
- Termos (art. 2, 4 e 5), Privacidade (duas linhas novas) e FAQ dizem isso.

## Quatro melhorias de 29/09/2026 (pedido do dono)
- **Áudio das leituras da letra** (פּ/פ/ף, בּ/ב, כּ/כ/ך, שׁ/שׂ): o `audioId` de
  cada `variante` saía da consoante sozinha, que nunca foi gravada (não se
  pronuncia): o quadro "As leituras desta letra" era mudo. Agora
  `export-content.mjs` (`exemploDaVariante`) dá a cada leitura um EXEMPLO
  gravado: a sílaba com patach (פַּ, פַ) ou, na forma final, a primeira
  palavra da letra que termina nela (ף → כֶּסֶף). `exemploHe` aparece embaixo
  do botão. `tests/audio.test.ts` passou a incluir as variantes (era por
  isso que o buraco não aparecia); `tests/audio-pe.test.ts` cobre o Pe.
- **Prática de revisão** (o reforço depois da fixação, "Praticar mais um
  pouco"): `ExercisePlayer` com `repetirErros` - errou, a questão volta
  depois de outras 2 (`lib/engine/fila-de-revisao.ts`), e a prática só
  termina com todas certas. Só o reforço liga isso; o resto do curso, não.
- **Ouvir instruções em português** (menu de acessibilidade, `voz`, marca
  `data-a11y-voz` no html): `components/learn/OuvirInstrucao.tsx` lê o
  ENUNCIADO com a voz pt-BR do aparelho (ouvir/pausar/continuar), nunca
  alternativas nem resposta; o hebraico citado vira "o hebraico mostrado"
  (`lib/voz-instrucao.ts`). Voz sintética é só para português: o hebraico
  continua só com gravação.
- **Teclado hebraico na tela** nos exercícios de digitar em hebraico
  (`components/learn/TecladoHebraico.tsx`, lógica em
  `lib/teclado-hebraico.ts`): 22 letras, 5 finais, os 11 sinais do curso;
  escreve no cursor, apaga um ponto de código por vez, não rouba o foco, e
  convive com o teclado do aparelho. A academia deixou de exigir instalar o
  teclado ("Usar o teclado da tela").

## Conta e senha
Criar conta, entrar, sair, **esquecer a senha** e **trocar a senha** - tudo em
`worker/src/api/auth.js`, com as consultas em `worker/src/lib/db.js`.

Três regras que parecem excesso de zelo e são o produto:

- **`/api/auth/forgot` responde igual para e-mail que existe e que não existe**,
  e o envio sai por `ctx.waitUntil` para que o RELÓGIO também não responda. Sem
  as duas coisas, o formulário de recuperação vira uma lista de quem comprou,
  consultável por qualquer um. A tela (`components/platform/EsqueciSenha.tsx`)
  diz "se existir uma conta com esse e-mail" pelo mesmo motivo - uma tela mais
  simpática desfaz sozinha o que o servidor protege.
- **O banco guarda o sha256 do token, nunca o token** (`password_resets`, e o
  hash é a chave primária). Quem lê a tabela não consegue trocar a senha de
  ninguém.
- **Trocar a senha sobe `session_version`**, o que derruba todo cookie já
  emitido, e a resposta traz um cookie novo. É uma consulta só
  (`changePassword` em `lib/db.js`): trocar a senha porque alguém entrou na
  conta e não expulsar esse alguém é não ter trocado nada.

O link do e-mail sai de `SITE_ORIGIN`, **nunca do cabeçalho Host** - o Host é
escolhido por quem chama, e um pedido forjado faria a plataforma mandar, para o
endereço certo do dono, um e-mail legítimo com o token dentro.

Entregar o e-mail é a Resend (`worker/src/lib/mail.js`): `RESEND_API_KEY` no
painel, `EMAIL_FROM` no `wrangler.toml`, e os dois precisam existir -
`/api/health` reporta `email`. **Sem eles o site funciona inteiro e ninguém
recupera senha sozinho**, então isso fica fora do `ok` da saúde e aparece como
aviso no `e2e.sh`. Como conseguir a chave está em `.env.example`.

"A chave existe" e "o e-mail chega" são **duas perguntas**, e a saúde responde
as duas: `email` (configurado) e `emailEntregue` (o último envio foi aceito).
A distância entre elas é real - a Resend recusa com 403 enquanto o domínio do
remetente não estiver verificado, e aí tudo *parece* funcionar. O motivo exato
que ela devolveu sai em Actions → Acesso → `envios`.

⚠ A checagem de `emailEntregue` no `e2e.sh` fica DEPOIS da seção "Senha", não
junto do resto da saúde. Medida antes dos envios daquela execução, ela só pode
responder sobre a anterior - e acusou uma recusa inexistente na primeira
publicação depois de a chave entrar, mandando conferir DNS à toa.

Provado em três alturas: `app/tests/senha.test.ts` (o ciclo inteiro contra um
SQLite de verdade carregado com o `schema.sql` de produção, e-mail interceptado
na saída - ver `app/tests/ajuda/d1.ts`), `worker/e2e.sh` (as rotas contra o que
está publicado, inclusive a igualdade das duas respostas de `forgot`) e
`npm run senha` (o caminho da pessoa, num navegador, a 390px).

### Confirmação de e-mail (24/09/2026)
O cadastro manda um link "Confirme seu e-mail" (`mensagemDeConfirmacao` em
`worker/src/lib/mail.js`), e `/api/me` devolve `account.emailVerified`.
**Confirmar não bloqueia nada** - a conta e a compra funcionam sem isso
(decisão do dono). O que a confirmação resolve é a conta criada com o endereço
de outra pessoa: o e-mail chega à dona do endereço e diz como tomar a conta de
volta (recuperar a senha, que confirma o e-mail e derruba a sessão de quem a
criou).

- **O link só confirma com a sessão da conta que o pediu** (`verify` em
  `api/auth.js`; `/confirmar-email` pede login se não houver). Se o clique
  bastasse, a dona do endereço confirmaria, por reflexo, a conta do impostor.
  `tests/auditoria.test.ts` trava isso; o ciclo inteiro está em
  `tests/confirmacao.test.ts`.
- **A tabela `email_verifications` não é criada pela publicação.** Rodar uma
  vez `npx wrangler d1 execute hebraico-fluente --file=worker/schema.sql --remote`.
  Sem ela tudo funciona e ninguém confirma nada: `emailVerified` vem `null`, a
  tela não pede, e `/api/health` diz `verificacao: false` (o `e2e.sh` acusa).
- Endereço `.invalid` não recebe o link: é o das contas de teste da publicação.

### O cookie de sessão
Chama-se `__Host-hf_session` desde 24/09/2026: o prefixo faz o navegador
recusar esse nome vindo de qualquer lugar que não seja este host, com Secure,
Path=/ e sem Domain. O nome antigo, `hf_session`, é aceito até `LEGADO_ATE`
(`worker/src/lib/session.js`, 15/10/2026) e trocado pelo novo na primeira
chamada a `/api/me` - ninguém é deslogado pela troca. Passada a data, a
constante e o ramo que a usa podem sair.

## Camada de confiança (Brasil)
`data/empresa.json` é a FONTE ÚNICA da identificação do fornecedor: razão social,
CNPJ, endereço, canais de atendimento e os prazos das políticas. O rodapé,
/termos, /privacidade, /reembolso, /suporte e o checkout leem todos de lá, via
`app/src/lib/empresa.ts`.

**A regra que não se quebra:** um campo em `null` é um campo que ainda não se
sabe, e ele SOME da tela - nunca vira travessão, "a definir" ou um CNPJ de
exemplo. Identificação de fornecedor inventada não é rascunho, é declaração
falsa num documento que existe para ser confiável. `npm run check-legal` cobra
o que falta e recusa CNPJ fora do formato, política não linkada na capa e
qualquer e-mail ou CNPJ escrito à mão fora de `data/empresa.json`.

As quatro rotas novas precisam estar em `PUBLIC_PREFIXES`
(`components/shell/Chrome.tsx`): uma Política de Privacidade atrás de login
informa o cliente, e não o visitante - que é justamente quem precisa dela.

### Consumidor e Marco Civil (24/09/2026)
Revisão contra a lei brasileira; o que o código cumpre e onde:

- **Desistência pelo site** (CDC art. 49; Decreto 7.962/2013 art. 5º):
  botão "Desistir da compra" em Sua conta → Compras, `POST /api/pay/desistir`,
  tabela `arrependimentos`. Vale até o fim do 7º dia depois do pagamento, em
  Brasília (`prazoDeDesistencia` em `api/pay.js`). A confirmação sai NA HORA
  por e-mail, e o dono recebe o aviso para estornar - o estorno continua
  manual, e o acesso fecha sozinho quando a Mercado Pago avisa.
- **Registro de acesso** (Marco Civil art. 15): tabela `registros_acesso`, IP
  inteiro + data/hora em cadastro, login e senha redefinida, 190 dias, apagado
  pela varredura. NÃO sai com a conta apagada (obrigação legal).
- **O contrato no e-mail** (Decreto 7.962 art. 4º, IV): o recibo de compra
  leva os links dos Termos e da Política de Reembolso com a versão
  (`politicas.atualizadoEm` em `data/empresa.json` - suba a data quando os
  textos mudarem).
- **18+**: artigo 3 dos Termos e a declaração junto do aceite no checkout.
- **LGPD art. 16, I** (obrigação legal) é o que ampara guardar pedidos e
  registros depois da exclusão - não o II, que é pesquisa.
- A autorização do autor de *Ba Li Ivrit* existe (o dono a tem por escrito).

`tests/consumidor.test.ts` guarda tudo isso.

### Enquadramento: serviço educacional, não produto digital (29/09/2026)
Regra do dono do curso para qualquer análise jurídica ou fiscal deste projeto.

- A empresa (Mhg Treinamentos e Idiomas) está enquadrada em ensino de idiomas
  (CNAE 8593-7/00). O que o consumidor compra é **acesso a um curso de
  hebraico** por um período. A internet e a plataforma são o MEIO de entrega
  do serviço educacional, não outra atividade.
- Não tratar o Hebraico Fluente como software, SaaS, e-commerce ou comércio
  de produto digital só porque há plataforma e pagamento online. Analisar o
  objeto efetivamente vendido, não a tecnologia.
- Outro CNAE ou enquadramento só entra em discussão diante de uma atividade
  **independente de fato**: venda separada de software ou licença da
  plataforma, SaaS para terceiros, venda avulsa de outros produtos digitais
  (e-book, apostila, pacote de áudio), material de natureza jurídica
  diferente do curso, anúncios ou afiliados. Nada disso existe hoje.
- O que existe e é parte do curso: exercícios, jogos da academia, leituras
  bônus, áudios, exame, certificado de conclusão (gratuito, não oficial), a
  "loja" (troca de XP, sem dinheiro), compra de presente e renovação (o mesmo
  curso). Os juros do parcelamento são da Mercado Pago, não receita nossa.
- **Uma mudança que crie atividade independente** (qualquer item da lista
  acima) tem de ser apontada ao dono ANTES de ser feita, com o motivo.
- Os textos seguem a mesma regra: "cursos online", "acesso a um curso",
  "oferece"; não "vende produto digital" (artigo 1 dos Termos).
- Em aberto com o contador: como sai a nota de serviço de cada venda, se
  Curitiba exige CPF do aluno na nota (o site não pede CPF hoje; pedir exige
  atualizar a Privacidade) e em nome de quem sai a nota na compra de presente.

## O endereço do site
`hebraicofluente.com.br`, declarado em `wrangler.toml` (`routes` com
`custom_domain = true`) e repetido em `SITE_ORIGIN`. O `*.workers.dev`
continua respondendo, de propósito: é a rede de segurança quando há dúvida
sobre DNS ou certificado - e é por isso que `workers_dev = true` está escrito
no arquivo. Sem essa linha, `routes` sozinho faz o wrangler desligar o
workers.dev, avisando num WARNING dentro de uma publicação bem-sucedida.

O `www` **não serve o site** - o Worker devolve 301 para o apex, e isso é a
primeira coisa que ele faz, antes da API e do portão. A ordem não é estética:
`origin` das URLs de retorno da Mercado Pago sai da REQUISIÇÃO
(`worker/src/api/pay.js`), então uma compra iniciada no www voltaria para o
www depois de pagar, com o cookie de sessão emitido para o outro host.
`app/tests/dominio.test.ts` trava isso.

Trocar de endereço é editar `SITE_ORIGIN` e as `routes`. Três lugares já
tentaram desfazer ou desmentir essa troca sozinhos, e foram consertados: o
passo 7 do `scripts/cloudflare-setup.sh` (que sobrescrevia com o
workers.dev), o `HF_BASE` do workflow (que tinha o endereço escrito à mão) e
o passo 6 do mesmo script, que decidia se a publicação tinha dado certo
procurando uma URL workers.dev na saída do wrangler - e chamou de falha a
publicação que estreou o domínio, depois de ela ter criado os dois domínios e
terminado em zero. Agora quem decide é o código de saída. Os três estão
travados em `app/tests/dominio.test.ts`.

## Progresso: onde mora
Três camadas, nesta ordem, e `createStore()` (`app/src/lib/state/store.tsx`)
escolhe:

1. **Worker + D1** (`NEXT_PUBLIC_PLATFORM_API=worker`, que é a build publicada).
   Tabela `progress`, uma linha por conta, o estado inteiro em JSON. O
   adaptador (`app/src/lib/state/worker.ts`) **embrulha** o localStorage em vez
   de substituí-lo: o curso continua funcionando sem sinal, e a sincronização
   é uma fusão nos dois sentidos.
2. **Supabase** - porta escrita e nunca ligada, só entra com as duas variáveis.
3. **localStorage** - o padrão do `npm run dev` e de qualquer export sem API.

A coluna `rev` é o que impede um aparelho de apagar o outro: toda escrita
declara a revisão que leu, o servidor recusa com 409 quem pisar numa revisão
vencida e devolve o estado atual junto, e o cliente funde e repete. `uid` volta
no GET para que um notebook compartilhado não funda o progresso de uma pessoa
na conta de outra.

**Rodadas de exercício** (`lib/rodadas.ts`): refazer um exercício traz
perguntas que o aluno ainda não viu. Cada categoria (`licao-pratica-bet`,
`checkpoint-3`, `revisao`...) guarda quantas rodadas concluiu e a impressão
das últimas 48 perguntas. Desde 27/09/2026 isso mora na CONTA
(`LearnerState.rodadas`, fundido por `fundirRegistro`: o lado com mais
rodadas vence, empate pelo conteúdo), com um espelho síncrono no aparelho
(`hf-rodadas-v1`) que as telas leem ao escolher a rodada. O store faz a
ponte: ao carregar, espelho e conta se fundem nos dois sentidos; o evento
`RODADAS_MUDOU` leva cada rodada concluída para o estado; sair da conta
limpa o espelho. `npm run sincronia` prova a travessia entre aparelhos.

## Missão de módulo

Cada módulo fecha com uma missão: uma situação de verdade (o mercado, a
padaria, a ficha da escola) em 3 ou 4 passos, em `/modulo/N/missao/`. O
cartão fica na página do módulo, e o checkpoint aprovado leva até ela. Passa
com 70%; cumprida, grava `firsts['missao-N']`. Não tranca nada.

- `data/missoes.json` só CITA o hebraico de cada passo e escreve a situação em
  português. O significado e a transliteração vêm do vocabulário do curso na
  hora de montar (`lib/engine/missao.ts`), para a missão nunca discordar da
  lição. Não escreva hebraico novo ali: copie o de uma palavra do curso.
- Passos: `ler` (hebraico no lugar → significado), `achar` (significado →
  qual palavra), `transliterar` (escrever como se lê). `semPontos` tira o
  nikud (módulo 6).
- `tests/missoes.test.ts` falha se uma palavra não for do curso, se usar letra
  que o aluno ainda não viu naquele módulo, ou se dois distratores tiverem o
  mesmo significado da certa.
- É conteúdo pago: vai por `/api/content` (os três lados do contrato e
  `OS_PAGOS` em `tests/conteudo.test.ts`), nunca no pacote público.

## Hebraico na rua (28/10/2026)

`/hebraico-na-rua` (no GATED e no PAGAS), linkado de Leituras: fotos reais de placas
(Wikimedia Commons, `data/hebraico-na-rua.json`) e a pergunta "esta placa tem uma palavra que
você já lê; qual?". Nada de hebraico novo: `palavra` e `naPlaca` citam palavras do curso, com a
grafia do curso, e nenhuma opção errada está na placa (`lib/engine/rua.ts`). A placa só aparece
com a palavra legível. Só sai do exportador com `aprovada: true`, e vai no `missoes.json` (pago),
chave `rua`. Imagens em `app/public/media/rua/`. Candidatas: Action "Fotos das missões"
(`tools/fotos-rua-pedido.json`); revisão em `HEBRAICO-NA-RUA-PARA-REVISAR.md`.
`tests/hebraico-na-rua.test.ts`.

## Lembrete para estudar (28/10/2026) - LIGADO desde 29/10/2026
Pedido do dono ("faz tudo", item 6). O dono aprovou o parágrafo da Privacidade em 29/10/2026 (versão das políticas 2026-10-29).
- **Uma chave só:** `privacidade.lembreteDeEstudo` em `data/empresa.json` (`lembreteLigado` no app e
  em `worker/src/api/lembrete.js`). Em `false` não existe nada: a caixa do perfil, o parágrafo do
  art. 4 da Privacidade, `PUT /api/lembrete` (404), o campo `lembrete` do `/api/me` e o envio.
  **Desligar** = `false`, subir `politicas.atualizadoEm` e publicar. Só `/api/lembrete/sair` funciona
  sempre: e-mail velho sempre sabe tirar a pessoa.
- Quem pede: a caixa em Sua conta, desmarcada, só com o curso. Tabela `lembretes_estudo` (a linha é o
  consentimento). Sai pela caixa, pelo link de todo lembrete (token `l<id>.<hmac 'lembrete:'>`, página
  /sair-da-lista) ou apagando a conta. Teto de 20 por hora por endereço.
- O envio (`worker/src/lembrete.js`, na varredura): a partir das 19h de Brasília, uma vez por dia por
  conta (`ultimo_dia`, UPDATE condicional = reserva), só se o progresso não tem estudo no dia, e no
  máximo 3 seguidos sem estudo (`seguidos`); estudar zera. Texto sem cobrança nem sequência perdida.
- `tests/lembrete.test.ts` e `tests/lembrete-desligado.test.ts` (chave forçada em false por mock).

## Blog (29/10/2026, pedido do dono)
`/blog` (lista) e `/blog/<slug>` (um por artigo), conteúdo aberto para a busca. Os artigos moram em
`data/blog.json`, em blocos (`h2`, `p`, `lista`, `palavras`, `veja`, `cta`), e nascem com
`revisado: false`: o exportador só leva o aprovado para `app/content/blog.json` (`HF_BLOG_RASCUNHOS=1`
mostra os rascunhos numa build LOCAL). O documento de revisão é `BLOG-PARA-REVISAR.md`.
- O hebraico só entre `{{...}}` e só de palavras, sílabas e letras que já estão no curso
  (`tests/blog.test.ts`); renderiza pelo `<He>` (`app/blog/BlocosDoArtigo.tsx`, componente de servidor).
- Sem artigo aprovado: a lista existe com `noindex` e fora do sitemap, o rodapé não linka
  (`content/blog-resumo.json`), e `/blog/_` é só o lugar vazio que o export estático exige (404, fora do
  sitemap: `TECNICAS` em seo.mjs). Artigo aprovado entra sozinho no sitemap e no rodapé.
- JSON-LD `Article` (autor e editora: Hebraico Fluente, sem assinatura de pessoa) e as migalhas.
- O blog é em português: a build em inglês sai sem artigos.

## Instalar no celular (28/10/2026)
Pedido do dono ("faz tudo", item 7). `app/src/app/manifest.ts` (vira `/manifest.webmanifest`): abre
`/meu-hebraico/` em tela cheia, ícones `public/icone-192.png`, `icone-512.png` e `icone-mascara-512.png`
(o ע do `icon.svg`, renderizado no Chromium com a Noto Serif Hebrew 600). `appleWebApp` no layout.
- **Sem service worker, de propósito:** ele guardaria aula e áudio no aparelho, fora do portão.
  `tests/instalar.test.ts` falha se alguém registrar um.
- `InstalarApp` (components/platform): botão do navegador quando há `beforeinstallprompt`
  (`lib/instalar.ts` o guarda ao carregar), os dois toques do Safari no iPhone, ou a linha do menu.
  No painel só no celular, depois da primeira letra, e "Agora não" some para sempre
  (`hf-instalar-dispensado`); em Sua conta, sempre.

## Vídeos do professor no "Me explica, Moshik" (28/10/2026)
Pedido do dono ("faz tudo", item 8). O dono põe `video/<letra>.mp4` (e, se quiser, `<letra>.vtt`)
na raiz, como o áudio; instruções em `video/README.md`. `tools/videos.mjs` (chamado pelo exportador)
copia para `app/public/video/` (gitignored) e gera `app/src/lib/video-manifest.ts`; nome que não é
letra, formato fora de mp4/vtt, legenda sem vídeo ou arquivo acima de 25 MiB param a build.
- `/video` está no GATED (gate.js) e no PAGAS (lib/seo.ts); o Worker serve com `comRange` (o Safari
  não toca vídeo sem 206). Sem YouTube nem serviço de fora: nada muda na Privacidade.
- `VideoDoMoshik` (components/learn): só com o arquivo, só no site em português, `preload="none"`, e a
  folha pausa ao fechar. `tests/video.test.ts`.

## Mini-textos de leitura corrida

Um texto curto por módulo, do 3 ao 7 (bilhete, mensagem de WhatsApp, cartão),
em `/modulo/N/texto/`, com transliteração e tradução a um toque (a linha ou o
texto todo), glossário das palavras novas e perguntas de compreensão
(`Compreensao`, sem nota). O do módulo 6 aparece sem nikud.

- São as únicas frases escritas PARA o curso. Cada texto em `data/textos.json`
  nasce com `revisado: false` e só aparece para o aluno com `true`
  (`textoDoModulo` filtra). Aprovar é trabalho de quem fala hebraico, e
  `TEXTOS-PARA-REVISAR.md` é o documento de revisão.
- `tests/textos.test.ts`: um por módulo 3 a 7, só letras já ensinadas no
  módulo, toda palavra pontuada (menos as com gerech), transliteração,
  tradução e porquê em tudo, e a trava da revisão.
- Conteúdo pago: vai por `/api/content`, como as missões.

## A rampa sem pontos, e as palavras dos textos no vocabulário

- Os checkpoints dos módulos 3, 4 e 5 (`MODULOS_COM_RAMPA`) terminam com 3
  palavras conhecidas sem nikud (`buildSemPontos`), com a forma pontuada na
  dica. Ficam FORA da nota: `CheckpointClient` recalcula o placar sem os ids
  `sempontos-` e mostra o resultado delas à parte. Só palavras que não viram
  outra sem os pontos (שֵׁם/שָׁם ficam de fora).
- Respondidas as perguntas de um mini-texto, grava-se `firsts['texto-N']`, e
  as `novas` do texto (menos prefixo solto e nome próprio) entram no
  vocabulário (`leituraDe`) e no "Palavras à mão" (`palavrasDosTextosLidos`).

## Gravar a própria leitura

`GravarLeitura` (components/learn) grava o aluno lendo em voz alta e toca de
volta: nas sílabas da lição e no mini-texto. O áudio fica num `Blob` local e
some ao sair da página; nada é enviado. O `Permissions-Policy` do Worker
libera `microphone=(self)` SÓ nas rotas do portão (`isGatedPath`); o site
público e a API seguem com `microphone=()` (teste em auditoria.test.ts). A
privacidade diz isso no art. 2.

## Painel de gravação (/admin/gravar)

O dono do curso grava as pronúncias pelo navegador (pensado para o Safari do
iPhone): escolhe o item, Gravar, Parar, ouve, Salvar ou Apagar e gravar de
novo; o painel pula para o próximo item sem áudio. Referência:
`worker/src/api/audio.js`.

- **O endereço não muda.** Tudo continua pedindo `/audio/<id>.mp3` (id =
  hash do hebraico). Depois do portão, o Worker serve a gravação do painel
  (tabela `gravacoes` do D1, schema.sql) e, sem ela, o arquivo do git. Gravar
  de novo substitui; remover devolve o arquivo do estúdio. Serve com `Range`
  (o Safari não toca mídia sem 206).
- **Formato:** `audio/mp4` (AAC) quando o `MediaRecorder` aceita; senão o
  painel grava WebM/Ogg e converte para WAV antes de enviar (WebM não toca em
  todo iPhone). O servidor confere os bytes, não o tipo declarado.
- **Corte:** o painel mede onde a voz está (`acharVoz`, lib/gravador.ts) e
  guarda `inicio_ms`/`fim_ms`; o curso toca só esse trecho (fragmento `#t=`
  + corte no `timeupdate`). O WAV já sai cortado e nivelado.
- **O curso fica sabendo na hora:** `lib/audio-registro.ts` junta o
  `AUDIO_MANIFEST` da build com `/api/audio/manifest` (público, só ids),
  carregado pelo AppShell e guardado no aparelho. `hasAudio`, `audioAvailable`
  e `gravado` leem daí. O `?v=` no endereço fura o cache quando uma gravação
  é substituída.
- **Nomes organizados** (`alef.mp4`, `a-ayin.mp4`) saem de
  `worker/src/lib/nomes-audio.js`, calculados do catálogo inteiro: só rótulo e
  nome de download, o arquivo continua guardado pelo id.
- **Quem pode:** as contas em `ADMIN_EMAILS` (vírgulas). `/admin` fica fora
  da casca do curso e do portão de compra (Chrome.tsx), com `noindex`, e com
  o microfone liberado pelo `Permissions-Policy`.
- `tests/gravacao-painel.test.ts` cobre tudo isso contra o SQLite com o
  schema de produção.

## Escuta de frase e a onda 4 (26/09/2026)

- **Onda 4 · Frases e textos** (`tools/gen-audio.mjs`): as 23 frases e cada
  linha dos mini-textos revisados, `kind: 'frase'`. Uma frase de uma palavra
  só que já é palavra do curso reaproveita o clipe dela. As linhas dos textos
  saem do exportador com `audioId`.
- **Gravar frases**: o roteiro por letra tem uma seção "frases" e uma por
  texto, com 2 s de pausa entre os itens. O `cortar-audio` entra sozinho no
  modo frase quando todos os itens são `frase` (pausa mínima 0,9 s, sem abrir
  peça longa) - o `--ensaiar` prova que a régua de palavra partiria a frase.
- **Frases com trava de revisão** (28/10/2026): frase em `data/sentences.json` com
  `"revisado": false` não sai do exportador nem entra no roteiro de gravação
  (`tests/frases-revisao.test.ts`); sem o campo, é das que já estavam no curso. As propostas
  para o dono aprovar ficam em `FRASES-PARA-REVISAR.md`.
- **Exercícios**: `exListenSentence` (ouça e ache a frase escrita,
  `audio-recognition`) e `exListenMeaning` (ouça, sem texto, e diga o sentido
  em português, tipo `listen-meaning`). Só com a frase gravada (`gravado`),
  só com frases que o aluno já lê; entram na lição, na escuta da academia e
  na parte "escuta" do exame. `tests/escuta-frases.test.ts`.
- **Mini-texto**: botão de ouvir por linha e "Ouvir o texto inteiro" (só
  com TODAS as linhas gravadas), acendendo a linha que toca.
- **Etapa 1 enxuta** a partir da letra 12 (`ENXUTA_DESDE` em LessonClient):
  à vista ficam a letra, como pronunciar (com o desenho), as leituras, "o
  que você precisa lembrar", as sílabas e as perguntas; o resto fica em
  "Ver a explicação completa".

## Comparar pronúncia e "Achei um erro" (26/09/2026)

- **`CompararPronuncia`** (components/learn): nas sílabas (etapa 1) e nas
  palavras (etapa 2), só com item gravado. O aluno ouve o modelo, grava o
  seu e vê as duas ondas na MESMA escala de tempo (`barrasDoTrecho`,
  lib/gravador.ts), cortadas no trecho da voz; "Ouvir os dois" toca modelo e
  a sua em sequência, por Web Audio. Sem nota automática, de propósito. A
  gravação não sai do aparelho.
- **Sílabas e pronúncia (27/09/2026).** Na etapa das sílabas (letra e som),
  `CompararPronuncia grade`: tocar na sílaba TOCA a gravação e mostra a dica, e
  o gravar-e-comparar fica logo abaixo, para a sílaba escolhida (eram três
  blocos repetidos). Nas PALAVRAS, `FalarECorrigir`: o reconhecimento de fala
  do navegador (he-IL) transcreve e `conferirFala` (lib/fala.ts) decide -
  sem pontos, sem forma final, e grafia cheia = defectiva (אומר = אֹמֵר).
  Não em sílaba solta. Some onde o navegador não transcreve (Firefox). A voz
  vai ao Google/Apple: o aviso fica ao lado do botão e a privacidade (art. 2)
  diz isso. `tests/fala.test.ts`.
- **"Achei um erro" foi DESLIGADO por inteiro** (27/09/2026, a pedido do dono
  do curso: não abrir canal de reclamação dentro do curso). Saíram o botão,
  `RelatarErro`, `lib/relato.ts`, a rota `POST /api/relatos`, as duas rotas
  do painel e a página `/admin/relatos`. A tabela `relatos` continua no
  schema só para não apagar em silêncio o que havia no banco de produção;
  nada lê nem grava nela. `tests/comparacao-pronuncia.test.ts` prova que as
  três rotas respondem 404.
- `lib/admin.js` (worker) tem `isAdmin`/`exigirAdmin`, usados pelo painel de
  gravação.

## Palavras à mão

Na academia, "Palavras à mão" (também em `/academia?treino=palavras-a-mao`,
que o vocabulário linka) dá rodadas de 5 palavras aprendidas para escrever
inteiras em cursiva, no mesmo `TraceBoard` das letras e do "meu nome": por
cima do modelo, modelo fraco, sem modelo. O modelo é a palavra sem nikud.

- O sorteio é `palavrasParaEscrever` (lib/engine/palavras.ts): só palavras do
  vocabulário acumulado (toda letra da grafia já ensinada, porque à mão o ו
  vogal vira letra), de 2 a 7 letras. `tests/palavras-a-mao.test.ts`.
- Corpo `display` para 3+ letras: medido, a mais larga cabe no quadro de um
  telefone de 360px. Mudar a fonte cursiva ou o limite de 7 letras pede medir
  de novo.

## Recompensas: trocar XP (27/09/2026)

`/loja` (atrás do portão; o XP do cabeçalho linka para lá). Regra que segura
tudo: **o XP total é conquista e nunca diminui; o que se gasta é o saldo** =
`xp - soma dos custos` (`lib/loja.ts`, nunca negativo na tela).

- Compras em `LearnerState.loja.compras`, por id: `folga:<ISO>`,
  `carta:<id da carta>`, `nome-decorado`. A fusão é a união (`fundirCompras`),
  então a mesma carta comprada em dois aparelhos cobra uma vez só.
  `comprasValidas` descarta custo que não é número ou é negativo: um custo
  forjado viraria saldo infinito.
- Itens: folga 100 (até 2 guardadas), carta de cultura antecipada 150, nome
  decorado 300 (pede o nome confirmado em "Meu nome"; a imagem é desenhada no
  navegador, `lib/nome-decorado.ts`).
- A folga: em `applyPractice`, se a meta é cumprida depois de dias perdidos e
  há folgas para TODOS eles, a sequência continua e cada folga fica com
  `usadaEm` = o dia coberto. Tudo ou nada. `displayStreak` usa a mesma conta.
- **Nunca trancar conteúdo principal atrás de XP**: o aluno já pagou.
- O XP é do cliente e pode ser forjado. Serve para prêmios digitais; qualquer
  coisa que valha dinheiro não entra na loja sem uma decisão à parte do dono,
  e com teto conferido no servidor.
- `/loja` está no `GATED` do portão e no `PAGAS` de lib/seo.ts.
- **XP por acerto (01/10/2026, pedido do dono):** cada acerto praticando letras
  (lição, revisão, academia e traçado aprovado) paga `XP.acerto` = 2, até
  `XP_ACERTOS_POR_DIA` = 100 por dia (`pagarAcerto`, contador `days[d].xpAcertos`,
  fundido pelo máximo). Erro não paga. O teto existe para que repetir o
  exercício mais fácil não vire o jeito de comprar as leituras bônus.
- **Leituras bônus** (texto bíblico, não reza - pedido do dono): `data/bonus.json` →
  export (com `after` e `audioId`) → `ConteudoPago.bonus` (pago, pelo
  `/api/content`; os três lugares: content.ts, content-servidor.ts,
  worker/src/api/content.js). Itens `texto-bonus` (200) e `bencao` (100), um
  por leitura (`<item>:<id>`). A loja só oferece com `mastered >= after`.
  Leitura em `/bonus?l=<id>` (no GATED), com `LinhasDeLeitura`, o mesmo
  componente do texto do módulo. Só `revisado: true` aparece e entra na
  onda 5 do roteiro. São hebraico bíblico, fora da regra de "só presente" -
  por serem recompensa, fora do caminho do curso.
- **O Nome nas gravações:** o dono do curso segue o costume de não dizer o Nome
  fora da reza. Onde está יְהוָה, a gravação diz «Hashém», e a transliteração
  diz o mesmo (nunca «Adonái»: o aluno ouviria outra palavra). A leitura que
  contém o Nome mostra o aviso "Por que a gravação diz «Hashém»", e o guia
  explica na seção `nome`. Elohím é dito normalmente.
- **Guia «O nikud da Bíblia»** (`guia` em data/bonus.json → `ConteudoPago.guiaNikud`):
  página à parte `/nikud-biblico` (no GATED), opcional, sem XP e sem nada que
  dependa dela - pedido do dono. Linkada das Leituras bônus e de Recompensas.
  Todo exemplo é recortado de uma linha já aprovada das leituras (o teste
  confere); gravações na onda 5.
- `tests/loja.test.ts`.

## Raízes Sefarditas (21-22/10/2026)
Produto INDIVIDUAL, comprado à parte, no mesmo site e com a mesma conta
(decisão do dono, 22/10/2026).
- **O conteúdo mora num repositório PRIVADO**, `Moshikgueta/hebraicofluente-raizes`
  (dados, fontes, matriz, documentos, gerador do mapa), clonado em `raizes/`
  (ignorado aqui), como o editorial. A publicação o busca com o segredo
  `RAIZES_TOKEN` (token fino, só leitura); sem ele, publica com um
  `raizes.json` vazio e avisa no resumo. Aqui fica só o CÓDIGO (telas, portão,
  rota, testes). Mudar o conteúdo lá NÃO publica sozinho: rodar o
  "Deploy platform to Cloudflare" à mão. Sem o clone, `tests/raizes.test.ts`
  pula os casos de conteúdo.
- Rotas `/raizes`, casca própria (`components/raizes/RaizesShell.tsx`, sem o
  menu nem o XP do curso de hebraico), direito `raizes-sefarditas` no portão,
  conteúdo por `GET /api/content/raizes`. Não paga XP.
- Dados em `raizes/data/`: `fontes.json` e `afirmacoes.json` seguem o
  protocolo do repositório editorial (níveis A-E, status, forma de acesso).
  Toda frase factual leva `[[R01-NNN]]`; só VERIFICADO e CONTESTADO vão ao
  texto, e CONTESTADO só como debate. `tests/raizes.test.ts` cobra.
- Estado: `LearnerState.raizes` (opcional), fusão em `state/raizes-estado.ts`.
  A reflexão livre e o Laboratório de Memórias Familiares (módulo 9, bloco `laboratorio`,
  `lib/raizes-laboratorio.ts`) ficam SÓ no aparelho: sem servidor, sem progresso, sem
  certificado e sem percentual; o resumo só conta fichas por tipo de evidência.
  `tests/raizes-laboratorio.test.ts` trava isso.
- NÃO está em `data/courses.json`: falta preço, o contador (CNAE de idiomas) e
  mudar o art. 1 dos Termos. Até lá o acesso só existe concedido à mão.
- Visual: a estética da coleção editorial (Israel Além do Óbvio), em
  `app/src/app/raizes/raizes.css` (classes `rz-*`, só debaixo de `.rz`) e no
  layout `app/src/app/raizes/layout.tsx`, que carrega a Literata SÓ em /raizes
  (o latin-ext numa segunda face, baixada só quando a página tem a letra).
  No mapa, o toque abre o ponto mais próximo do dedo (pontos a 20 px no
  celular); os botões dos pontos são para teclado e leitor de tela.
  Uma atividade de mapa pode ter `recorte` (graus) para aproximar uma região
  do mesmo desenho (Portugal, no módulo 3).
  E pode pedir outro desenho com `desenho` (o nome de `raizes/data/mapa-<nome>.json`,
  exportado em `mapas`): o Mediterrâneo (módulo 5) e o litoral do Brasil (módulo 6). Sem ele, a península.
- Os dez módulos prontos para revisão humana (22/10/2026). O certificado
  (`/raizes/certificado`, `certificadoRaizes` em lib/raizes.ts) só abre com os dez
  concluídos; sai em HTML para imprimir, com o nome guardado só no aparelho e a lista do
  que não certifica, sem código de verificação. **Modo de revisão** (22/10/2026, pedido do
  dono): conta de `ADMIN_EMAILS` recebe `account.revisor` no /api/me e vê todos os módulos
  abertos (`moduloAberto(e, n, revisor)`); o portão continua exigindo o direito
  `raizes-sefarditas` no banco, dado à mão em Actions → Acesso → `liberar`. Módulo novo:
  `MODULOS_COM_CONTEUDO` em `lib/raizes.ts`, e conteúdo de lá precisa de publicação
  manual (o deploy só roda sozinho com push no site).
  `npm run raizes` (em app, depois do build) percorre o módulo num Chromium.
- **Atlas, Lisboa e Minha História** (protótipo, 22/10/2026, pedido do dono): fora da
  jornada, sem XP, progresso nem certificado.
  - `/raizes/atlas` lê `atlas` (de `raizes/data/atlas.json`) e o desenho `atlantico`. Lugares
    por período e tipo; Caminhos do Exílio com linha do tempo. Três estilos de rota
    (`ESTILO_DA_EVIDENCIA` em AtlasMapa.tsx): documentado (só VERIFICADO), corredor e
    hipótese (cita um CONTESTADO). A curva é ligação desenhada, nunca estrada. Reinos são
    rótulos (`area`), sem fronteira. Lógica em `lib/raizes-atlas.ts`.
  - `/raizes/lugar/<id>` lê `lugares` (`raizes/data/lugares/<id>.json`); cidade nova também
    entra em `LUGARES_COM_PAGINA` (lib/raizes.ts). Foto só com autor e licença; sem elas, a
    página diz que falta. Afirmações próprias do Atlas usam o prefixo `A01`.
  - `/raizes/familia` (`lib/raizes-familia.ts`): a árvore fica SÓ no aparelho
    (`hf-raizes-familia-v1`). Cada pessoa e acontecimento tem tipo de evidência; linha no
    mapa só para mudança documentada; pessoa viva sai protegida das cópias (JSON e GEDCOM)
    por padrão; o exemplo é fictício. Nada calcula ascendência.
  - `tests/raizes-atlas.test.ts`; a auditoria do protótipo está em
    `raizes/docs/auditoria-prototipo-atlas.md`. Pendente antes de vender: uma linha sobre a
    árvore na Política de Privacidade.
- **O módulo é um capítulo de leitura contínua** (22/10/2026, decisão do dono: "parecido com o
  Israel Além do Óbvio"). As 8 partes do dado viram SEÇÕES da mesma página
  (`ModuloRaizesClient`), com sumário, "você está aqui", placar de atividades e o "onde parei" pela
  seção lida (`?etapa=` continua valendo). O que conclui o módulo não mudou (as atividades). O
  visual é o da coleção em todos os módulos; a identidade "O Arquivo Aberto" (protótipo do módulo
  3) foi descartada pelo dono, ficaram a folha do édito, a narrativa com o mapa e o "Leia o édito".
  Estratégia e diagnóstico: `raizes/docs/experiencia-premium-fase1-2.md`.
- **Jornada personalizada** (22/10/2026, master prompt de 50 etapas): a casa agrupa os 10 módulos
  em cinco mundos (`MUNDOS` em `lib/raizes-jornada.ts`), pergunta os interesses (opcional, só muda a
  ordem das sugestões; `recomendar` sempre diz o porquê) e mostra "Continue sua jornada". Páginas
  `/raizes/personagens` (`raizes/data/personagens.json`, toda frase com marca), `/raizes/busca`
  (local), `/raizes/glossario`, `/raizes/passaporte` (selos do que se explorou, nunca de origem) e
  `/raizes/colecao` ("Guardar na coleção", `components/raizes/Guardar.tsx`). Estado novo em
  `EstadoRaizes`: `descobertas` (a primeira vez), `colecao` (o gesto mais recente), `perfil` (o mais
  recente). O que falta: `raizes/docs/matriz-master-prompt-50-etapas.md`. `tests/raizes-jornada.test.ts`.
- **O objeto de cada unidade** (22/10/2026, pedido do dono; `components/raizes/Recipientes.tsx`):
  estante (1), baú de viagem (2), maço do arquivo (3), pasta (4), arca do navio (5), caixa de
  cartas (6), fichário (7), caderno (8), caixa de arquivo (9), caixa de memórias (10). No fim de
  cada seção, a folha do caderno de viagem (`FolhaDaSecao`, chave `secao:mNN:<etapa>`) voa para o
  objeto, que flutua no canto esquerdo e abre o que guarda (folhas, artefatos, documentos). A folha
  é anotação do aluno, nunca documento da época. **Mapa do capítulo** (`MapaDoCapitulo`): os
  lugares do Atlas que o texto do módulo NOMEIA (`lugaresDoModulo`), com ficha e carimbo; o mesmo
  `MiniMapa` mostra o mapa de viagem no passaporte e os lugares de cada personagem. Só pontos:
  linha entre lugares só no Atlas, com o nível de evidência.
- **Fotos históricas** (22/10/2026, pedido do dono): só do Wikimedia Commons, com domínio público,
  CC0, CC BY ou CC BY-SA, autor e página de origem. A Action "Fotos candidatas" do repositório
  privado (ramo `fotos`, `fotos/pedido.json`) busca e guarda as candidatas com a ficha; a revisão
  escolhe em `raizes/data/fotos.json` (`mostra` só diz o que a ficha do arquivo diz; `onde` = as
  chaves `lugar:`, `artefato:`, `modulo:`, `personagem:`). O exportador copia para
  `app/public/raizes/fotos/` (gitignored, atrás do portão de /raizes). `components/raizes/Foto.tsx`
  mostra o crédito SEMPRE junto da imagem. Retrato e cena imaginada (pintura do séc. XIX) não entram.
- **Peças do Israel Além do Óbvio** (`components/raizes/Pecas.tsx`): `palpite`, `vf`
  (verdadeiro ou falso), `curiosidades` e `artefatos` (vitrine com ficha). Nenhuma conta para a
  conclusão nem grava no servidor. Todo texto factual delas segue a regra das marcas
  (`textosMarcados` em tests/raizes.test.ts), e a frase a julgar do V/F NÃO leva marca.
  Gravuras em SVG no código (`components/raizes/ilustracoes/Gravuras.tsx`): objetos e lugares
  genéricos, nunca rosto, documento legível ou símbolo religioso; a peça que usa uma diz que é
  interpretativa. Cada seção tem a sua vinheta (`VINHETA_DA_SECAO`, ou `vinheta` no dado).
  `tests/raizes-experiencia.test.ts` exige artefatos, um jogo e curiosidades em todo módulo.

## Só o curso de alfabetização no site (27/10/2026, decisão do dono)
"Por enquanto deixa o site só com o curso de alfabetização." O portal da seção abaixo está
GUARDADO, não apagado:
- `/` monta a página do curso (`app/src/app/page.tsx` renderiza a de `/curso-de-hebraico`, que
  continua respondendo: campanhas, e-mails e portão levam para lá). Microfone liberado nas duas
  (`naVenda` em worker.js); JSON-LD com Course e FAQPage na capa (`checa-seo.mjs`); cartão do link
  do curso em todo o site (`ogDaRota`).
- `/aprender-hebraico`, `/descobrir-israel`, `/israel-alem-do-obvio`, `/raizes-sefarditas` e
  `/comece-aqui` continuam no build, fora do sitemap (`NAO_LISTADAS` nos dois lados), e o Worker
  responde 301 para `/` com a consulta junto. `/bio` vai direto ao curso (`PARA_O_COMECE_AQUI`
  vazio). `/previa`, `/israel/` e `/raizes/` não mudam. `worker/e2e.sh` ("Só o curso no site")
  confere.
- Cabeçalho sem o painel "Experiências" e rodapé sem a coluna (o código está no histórico, no
  commit que os tirou). Conta conectada SEM o curso vê "Minha conta" e "Começar o curso"
  (`/checkout/alfabetizacao`), e não só "Minha Biblioteca": foi aí que uma aluna travou.
- `/cursos` sem a vitrine do livro e do combo (`OpcoesDeCompra`). A biblioteca vazia diz a conta, o
  pagamento pendente, o acesso vencido ou o pago sem acesso, o botão do curso, o "outro e-mail" e o
  atendimento (`Vazia` em BibliotecaClient.tsx).
- **Para voltar:** tirar a regex das cinco páginas em worker.js, a linha delas em `NAO_LISTADAS`
  (seo.ts e seo.mjs), devolver o PortalClient à `page.tsx`, o painel e a coluna ao PublicShell,
  `bio` ao `PARA_O_COMECE_AQUI`, a regra antiga da capa em `checa-seo.mjs`, e tirar
  `/curso-de-hebraico` de `ESPELHOS` (seo.ts e seo.mjs; ver "SEO de 31/10/2026").

## A capa é o portal das três jornadas (23/10/2026, master prompt "Hebraico Fluente 2.0")
Decisões do dono no mesmo dia: portal na capa; o e-book e o Raízes "Em breve", SEM preço nem
compra; medição só com o contador próprio.
- `/` é o portal (`app/src/app/PortalClient.tsx`): abertura, três jornadas, experiências, "Leia
  uma palavra agora" (שָׁלוֹם, com o sentido e a gravação do curso), quem faz (só o que /sobre
  afirma), como os caminhos se cruzam, o que se pode conferir, convite final.
- **A página de venda do curso mudou de endereço, não de conteúdo:** `/curso-de-hebraico`
  (`app/src/app/curso-de-hebraico/`). Os links de campanha (/sefarad, /bio, /stories, /dm) e o
  `/?parceria=` antigo levam para lá (`PAGINA_DE_VENDA` em worker.js). O microfone do "Ouça e
  fale" abre SÓ lá (`naVenda` em `blindar`); a capa voltou a `microphone=()`. JSON-LD: Course e
  FAQPage na página do curso (`grafoDoCurso`), Organization, WebSite e Person na capa.
  `checa-seo.mjs`, `check-legal.mjs`, `clique.mjs`, `capa.mjs`, `ctas.mjs` e `worker/browser-check.mjs`
  olham o endereço novo.
- **Jornadas e produtos num lugar só:** `app/src/lib/ecossistema.ts`. O status sai do catálogo
  (`statusDoCatalogo`): à venda = Disponível; `status: soon` = Em desenvolvimento; `aVenda: false`
  ou fora do catálogo (Raízes) = Em breve. Produto novo entra ali. Os produtos 4 a 6 do prompt
  (Sobrevivência, Antes de Embarcar, Biblioteca) NÃO existem e não aparecem.
- Páginas: `/aprender-hebraico`, `/descobrir-israel`, `/israel-alem-do-obvio` e
  `/raizes-sefarditas` (peças em `components/portal/Jornada.tsx`). As duas "Em breve" não têm
  preço, checkout nem botão de compra (`tests/portal.test.ts` confere no código, sem os
  comentários); o botão delas leva ao curso. `/contato` → /suporte e `/minha-conta` → /meu-hebraico
  (301, worker.js). Não há `/biblioteca` nem blog: não existe conteúdo para eles.
- **Contador do portal:** `POST /api/portal {evento}` (api/estatisticas.js, `EVENTOS_DO_PORTAL`,
  lista fechada, chave `p|<evento>`, robô fora, 40 por hora por IP) e `lib/funil-portal.ts` (uma
  vez por visita). Sem cookie, conta nem IP guardado; Privacidade art. 4 diz isso (versão
  2026-10-23). `/admin/estatisticas` recebe `portal` na resposta (a tela ainda não o mostra).
- Ilustrações em código (`components/portal/Emblemas.tsx`): caderno, carta náutica sem contorno de
  país, maço de arquivo. Sem hebraico dentro do SVG.
- Cuidado já pago uma vez: `h1-h4` têm `color: var(--ink)` no globals.css, então título dentro de
  bloco navy precisa de `text-white` explícito (a herança do bloco não vale).
- **Rodada "nota 100" (23/10/2026, decisões do dono):** abertura B ("Aprenda a ler hebraico. Depois,
  descubra Israel e as raízes sefarditas."); no telefone a mesa de folhas sai e as três jornadas
  (`Atalhos`) ficam na primeira tela de 390 x 844. **Uma página de venda só:** `/cursos/alfabetizacao`
  (e o `index.txt` dela) responde 301 para `/curso-de-hebraico/` com a consulta junto (worker.js), o
  portão manda direto para lá, e todo link interno passa por `paginaDeVenda(slug)` (lib/catalog.ts);
  fora do sitemap. O menu tem o painel "Experiências" (jornadas com `resumo` e status) e o rodapé tem
  Experiências, Aprender, Ajuda e Legal. `/metodo`, `/biblia`, `/cursos` e `/faq` têm migalhas
  (`PageHead trilha`, `TrilhaNoTopo`). `BotaoDoCurso` troca a oferta por "Continuar" para quem já é aluno.
  O que o preço compra mora em `lib/inclui.ts` (capa e caixa de preço). O painel `/admin/estatisticas`
  mostra o funil do portal. `npm run alcance` prova que toda página do sitemap está a 2 cliques da capa.
  Sistema visual: `components/portal/README.md` e a amostra `/admin/sistema`. Roteiros dos testes com
  pessoas e a auditoria de persuasão: `audit/portal/`.
- **Ficha comum dos produtos** (`components/portal/FichaDoProduto.tsx`, 23/10/2026, pedido do dono):
  os mesmos cinco campos (para quem é, o que você passa a conseguir, formato, quanto tempo, situação)
  em /aprender-hebraico, /israel-alem-do-obvio e /raizes-sefarditas, lidos de `Produto.ficha`
  (lib/ecossistema.ts; catálogo quando ele tem). Preço só no produto à venda; "Em breve" sem preço
  nem data (`tests/portal.test.ts`). Nunca as três lado a lado como tabela de planos.

## Velocidade no celular: o código do curso fora das páginas públicas (23/10/2026, pedido do dono)
- O `ProgressProvider` saiu do JavaScript das páginas públicas: o layout raiz usa
  `ProgressoQuandoPrecisa` (components/shell), que não monta o provider nas `ROTAS_LEVES`
  (lib/rotas.ts) e o carrega sob demanda nas outras. Uma vez montado, não desmonta (a fila de
  gravação e o "sair da conta" não se perdem). Página nova em `ROTAS_LEVES` não pode chegar a
  `lib/state/store.tsx` pelos imports: `tests/rotas-leves.test.ts` segue a árvore e falha.
- `AppShell` e `CourseGate` são `next/dynamic` no Chrome.tsx; `EXAM_PASS` mora em
  `lib/engine/nota-do-exame.ts` (importar de exam.ts puxava o motor de exercícios para todo lado).
- A entrada do Hero da página de venda é CSS (`hero-entra`), sem esperar o React: o texto aparece
  na primeira pintura e só sobe 12 px.
- **O pedaço `base`** (`next.config.ts`, `BASE`): o webpack COPIAVA para o pedaço do layout e para o
  da página os módulos pequenos que os dois usam (catálogo, resumo do curso, conta, hebraico), e a
  página baixava os dois. Agora vão num pedaço só. Só entra em `BASE` o que o layout raiz já importa
  (`tests/rotas-leves.test.ts` confere); a regra geral "todo src/lib compartilhado" foi medida e
  descartada: 3 KB a menos, o dobro de arquivos.
- Medida (Lighthouse celular simulado, mediana de 5): JS da capa 209 → 158 KB (gzip), da página de
  venda 228 → 176 KB; LCP de /aprender-hebraico 2,65 → 2,32 s.
- **A capa é componente de servidor** (26/10/2026, pedido do dono): `PortalClient.tsx` não tem mais
  `'use client'`; o texto sai pronto do HTML e só três ilhas vão ao navegador: `ContadorDoPortal`
  (o "visto" e os cliques, por delegação: todo link contado leva `data-portal-evento="<evento>"`),
  `ParaQuem`/`BotaoContinuar` (o que muda para quem já é aluno) e `EssencialDoCurso` (a lista do
  cartão pergunta se há áudio gravado, que só se sabe no aparelho). A entrada da abertura é CSS
  (`portal-entra` em globals.css, com `data-entrada` para sem JavaScript e "reduzir movimento") e
  roda a cada visita. Medida: tempo de bloqueio da capa 216 → 104 ms; o LCP não mudou (2,96 → 2,93 s).
  O que pesa no LCP agora são os três pesos da Instrument Sans, pré-carregados juntos (52 KB antes
  da pintura). Pré-carregar só o 400 não ajuda: o 500 e o 600 estão na primeira tela e o navegador
  os pede antes de pintar. **O 500 saiu do site** (decisão do dono, 27/10/2026): o texto em 500 usa
  o arquivo do 400 (layout.tsx). Capa 2,93 → 2,76 s, /aprender-hebraico 2,60 → 2,47 s.
- **A capa carrega um peso só de cada fonte de exibição** (23/10/2026, decisão do dono): Bricolage
  600 e Noto Serif Hebrew 400. A segunda linha do título passou de 500 para semibold, a citação da
  aluna foi para a fonte do texto corrido (`font-ui`) e a letra do `Rubrica` (components/landing/
  base.tsx, em todo o site) de 500 para 400. Eram 3 arquivos de fonte a mais antes da primeira
  pintura. LCP da capa 3,16 → 2,90 s, FCP 1,66 → 1,35 s. Um peso novo na capa é um arquivo novo:
  medir antes. Na página de venda saíram o 700 (o nome "Álef" da demo) e o 400 (as aspas do
  depoimento), os dois agora semibold: 41 KB a menos antes da primeira pintura, FCP 1,81 → 1,50 s.
  Fica o 500, o estilo das frases de abertura (Hero e 8 seções): trocá-lo muda o tom da página,
  decisão do dono. O LCP dessa página no Lighthouse local é bimodal (2,9 ou 3,7 s, conforme a
  primeira pintura sai em 0,3 ou 1,3 s): compare o peso baixado antes da pintura, não a mediana.
- `app/responder.mjs`: a resposta a cada tela de exercício, usada por `portao.mjs` e `exame.mjs`
  (escolha, "Monte a palavra", campo de escrever, "Ligue cada"). Os dois saem com código 1 quando
  algo falha. Tipo novo de exercício entra ali.

## O cartão do link no WhatsApp e no Instagram (23/10/2026, pedido do dono)
- Um cartão por porta de entrada, gerados por `tools/og.mjs` (num Chromium, com as fontes e as
  cores do site; o hebraico é só o שָׁלוֹם do curso): `og-portal.jpg` (a capa e o resto do site),
  `og-curso.jpg` (curso, /aprender-hebraico, /metodo, /checkout, /biblia), `og-livro.jpg`
  (/israel-alem-do-obvio e /descobrir-israel, "Em breve", sem preço) e `og-previa.jpg` (/previa, que
  o editorial monta com `og:image` absoluto). Qual vai em qual rota: `ogDaRota` em lib/seo.ts.
- **Nome novo a cada cartão novo:** `/media` sai com cache de um ano e o WhatsApp e o Instagram
  guardam a imagem pelo endereço. O `og.jpg` antigo fica para os links já compartilhados.
  `tests/cartao-do-link.test.ts` confere as rotas, o 1200x630 e o peso (menos de 300 KB).

## Fontes: preload só do texto corrido (23/10/2026, pedido do dono)
- `app/src/app/layout.tsx`: só a Instrument Sans (texto corrido, o elemento da maior pintura) tem
  `<link rel=preload>`; Bricolage (títulos), Noto Serif Hebrew e a cursiva carregam quando o CSS
  as usa. Eram 10 preloads (165 KB) em toda página.
- O hebraico usa `display: 'block'`: espera a fonte certa (até uns 3 s) em vez de pintar numa reserva
  com o nikud fora do lugar. Nunca voltar a `swap` sem preload.
- Medida (Lighthouse celular simulado, mediana de 5): LCP da capa 3,75 → 3,16 s, da página de venda
  3,47 → 3,01 s, de /aprender-hebraico 3,74 → 2,63 s. FCP da capa 1,21 → 1,66 s (ainda abaixo de 1,8).
- Os "13 problemas do tema escuro" eram do teste, não do tema (23/10/2026): `npm run escuro` rodado
  sobre o build publicado (`NEXT_PUBLIC_PLATFORM_API=worker`), em que a casca do curso pede a sessão
  ao Worker e não monta no servidor estático. No build local o escuro passa inteiro (menor contraste
  5,33:1). O script agora para e avisa quando a casca não monta. `npm run varrer` e `npm run escuro`
  medem o build LOCAL (`npm run build`, sem a variável).

## SEO de 31/10/2026 (auditoria, `audit/2026-10-31-seo/RELATORIO.md`)
- **Espelho:** enquanto a capa for a página do curso, `/curso-de-hebraico` repete a capa palavra por
  palavra. Fica no ar (campanhas, e-mails e portão), fora do sitemap, com o canonical na capa e SEM
  `noindex` (`ESPELHOS` em lib/seo.ts e seo.mjs; `canonicaDe`). O `Course` do JSON-LD aponta a capa.
- **O `Course`** leva o que o resultado de curso do Google pede, tudo tirado do que a página já diz:
  `hasCourseInstance` online com o ritmo da FAQ (10 min por dia, uma lição por vez, `repeatCount` =
  letras + lições de som), o nível, o "do zero", o que ensina (a Promessa) e um `syllabusSections`
  por módulo. Nunca `aggregateRating` nem `review` sem avaliações reais (`checa-seo.mjs` recusa).
- **Description acima de 155 caracteres reprova em toda página anunciável**, não só na capa.
- O fundo do hero (AtmosferaFundo) saiu de `fetchPriority="low"`: no celular é ele a maior pintura.

## Antes de commitar
```sh
cd app && npm test        # 302 testes
cd app && npm run build   # export estático
npm run validate          # ordem das letras, nikud, palavras
```

Verificações em navegador de verdade (a 390px, com `HF_CHROMIUM` apontando
para o Chromium já instalado - nunca `playwright install`):

```sh
cd app && npm run varrer      # rolagem lateral e erros de console em todas as rotas
cd app && npm run ctas        # visitante vs aluno: quem já comprou não vê checkout
cd app && npm run trancado    # o cadeado do teste final nos três estados
cd app && npm run portao      # o portão de domínio da lição não tranca ninguém
cd app && npm run exame       # o exame final abre e responde (para nos pareamentos)
cd app && npm run check-legal # identificação do fornecedor, políticas e checkout
cd app && npm run senha       # esquecer, redefinir e trocar a senha, de ponta a ponta

# a sincronia precisa do Worker no ar, com o D1 local:
npm run db:init:local
SESSION_SECRET=qualquer-coisa npx wrangler dev --port 8788 --local
cd app && npm run sincronia   # dois aparelhos, uma conta, ninguém perde trabalho
```

## Teste A/B do hero da capa (28/09/2026) - ENCERRADO e desmontado em 01/10/2026

Ficou a versão A. Saíram `lib/ab.ts`, as chamadas no checkout e no obrigado, a rota `POST /api/ab`,
o workflow e `tools/relatorio-ab.mjs`. Ficam as tabelas e `abComprasPurge` (api/ab.js), que apaga
`ab_compras` em 60 dias. O texto abaixo é histórico.

`hero-2026-09`: A = híbrido ("Ler e escrever hebraico, do zero." com os três
desejos como selos); B = as perguntas (Israel, "as letras da Bíblia"). O botão
é o mesmo nas duas ("Comece do zero…"): o teste compara só a mensagem. Cada navegador sorteia uma vez (`lib/ab.ts`, localStorage).
O HTML estático sai com B; o texto do hero nasce invisível, então A não pisca.

- Contagem: `POST /api/ab` (worker/src/api/ab.js) soma totais diários em
  `ab_contagens` (visto, clique, checkout, compra). Sem cookie, conta ou IP.
  O site continua sem analítica: é o único contador.
- Relatório: Action "Relatório do teste A/B" (`tools/relatorio-ab.mjs`), com
  taxas e teste de duas proporções. O resumo é público (repositório público).
- A privacidade (art. 4) descreve o teste.
- **Para encerrar:** fixar a versão vencedora no Hero, apagar `lib/ab.ts`, as
  chamadas `contarAB`, a rota `/api/ab` e o workflow; a tabela pode ficar.
- **Encerrado em 01/10/2026 (auditoria CONV-009), por clareza:** com o volume do
  pré-lançamento o teste não chegaria a significância antes de 31/10. Ficou a A
  ("Ler e escrever hebraico, do zero."), única no Hero; a B saiu. O botão passou a
  dizer o que vem: "Começar o curso · R$ 147" (preço de `lib/vitrine.ts`, o mesmo da
  caixa de preço). `contarAB` virou função vazia e o Hero não sorteia mais. Falta o
  resto do desmonte, fora da frente da capa: as chamadas em CheckoutClient e
  ObrigadoClient, `lib/ab.ts`, `worker/src/api/ab.js`, o workflow do relatório e a
  menção ao teste no art. 4 da Privacidade. `ab_contagens` fica com os números.

## Módulo 5: cada lado na sua lição, contraste na lição 20 (29/09/2026, pedido do dono)
- Bet, Kaf e Pe ensinam só o lado COM o ponto: `soOLadoDoPonto` (lib/sons.ts) tira da tela
  da letra as variantes sem daguesh (sem o quadro "As leituras", sem exercício de variante) e
  o `sound` vira só /b/, /k/, /p/. Os dados em letters.json continuam com as variantes
  (revisões e módulo 6 as usam). Os textos dessas três letras só dizem, numa frase, que o outro
  som tem lição própria. O Shin NÃO muda.
- Vet, Chaf e Fe ensinam só o lado SEM o ponto: a etapa 3 é "Ler" (não "Contraste") e o
  banco (`exerciciosDoSomSuave`) nunca põe o par nas opções. O Sin e os sons do módulo 7
  continuam com o contraste.
- A lição 20 é o contraste dos três pares: `{ som: "contraste" }` em modules.json, rota
  `/som/contraste` (ContrasteClient), id de progresso `som-contraste`. Anda pelo caminho como
  uma lição de som: entra na ordem de ensino, na trava (Tch só abre depois dela) e na
  porcentagem. Exercícios em `bancoDoContraste`.
- Estúdio: as palavras das frases (`sentences.json` → `words`) entraram no catálogo de áudio
  (onda 4); 13 eram novas, números 576-588. הָאָרֶץ já estava (573), só falta gravar.

## Depoimentos (29/09/2026, pedido do dono)
- `/depoimento` (atrás do portão): o aluno com o curso liberado escreve um depoimento
  (20 a 1200 caracteres), escolhe como assinar (nome e cidade, iniciais ou "Aluno do curso") e
  marca, à parte, a autorização para publicar (começa desmarcada). Um por conta; editar volta o
  estado para "novo". Retirar apaga a linha (sem freio); apagar a conta também.
- `/admin/depoimentos`: o dono lê e aprova ou recusa; aprovar exige a autorização do aluno.
  Aprovar NÃO publica nada: pôr um depoimento na vitrine é passo manual do dono.
- Tabela `depoimentos` em schema.sql; API em worker/src/api/depoimentos.js; aviso diário ao
  dono em alertas.js (só a contagem). Link discreto no painel depois de 6 lições.
  Nunca dar XP, desconto ou brinde em troca de depoimento.
- Vocabulário: a forma "À mão" aparece para toda palavra legível, inclusive as com o ו de
  vogal antes da lição do Vav (יוֹם, שָׁלוֹם, תּוֹדָה, הוּא...). A escrita de palavras e os
  exercícios de cursiva continuam com a régua estrita.

## Lições de prática (29/09/2026, pedido do dono)
- As lições 3, 7, 10, 13, 23 e 27 (`kind: "practice"` em modules.json) eram só uma frase na
  página do módulo. Agora são `/modulo/N/pratica` (PraticaClient), montadas SÓ com conteúdo que
  já existe (lib/engine/pratica.ts):
  - correção: os erros do aluno nas letras do módulo (weakLetters filtrada), ou as letras do
    módulo; nos módulos 6 e 7, buildDageshQuiz / buildGerechQuiz. Com `repetirErros`;
  - letras parecidas: o primeiro par `confusableWith` do módulo (buildConfusionDrill);
  - ler em voz alta: as palavras do módulo, com CompararPronuncia e GravarLeitura;
  - portas para texto, missão, checkpoint e Academia.
- Não tranca nada e não entra na porcentagem. Terminar a correção grava `pratica-N` em
  `firsts`, que a página do módulo mostra com ✓. O módulo 5 não tem lição de prática (a 20
  é o contraste).

## Aceite dos Termos no cadastro (30/09/2026, pedido do dono)
- O cadastro (AuthForm, também no checkout) tem a caixa "Li e aceito os Termos de Uso",
  desmarcada, com o link abrindo em outra aba. A Privacidade é só informada (a base legal dela
  não é aceite). Substitui a frase "Ao criar a conta você concorda...".
- O servidor exige `aceitouTermos: true` no POST /api/auth/signup (erro `termos`) e grava na
  tabela `aceites` a data e a versão (`politicas.atualizadoEm` de data/empresa.json). Falha ao
  gravar não derruba o cadastro. Apagar a conta apaga o aceite. Todo script ou teste que cria
  conta pela API manda `aceitouTermos: true`.
- Quando os Termos mudarem, subir `politicas.atualizadoEm`: os aceites novos saem com a versão nova.

## Lição 21, fecho dos módulos 6/7 e estatísticas (30/09/2026, pedido do dono)
- Lição 21 (/extra/sem-o-ponto, etapa 1) ensina onde o ponto aparece (começo, depois de
  consoante, depois de vogal) e pratica a leitura com o ponto NÃO impresso. Motor em
  lib/engine/posicao-do-ponto.ts: analisa as palavras do curso e só usa as em que a regra
  acerta; as do ponto que dobra (אַבָּא, שַׁבָּת) vão para "Quando a regra não basta".
- 23 e 27 NÃO são lições de prática: são a leitura sem nikud e o fecho dos módulos 6 e 7.
  Prática (`kind: "practice"`) só em 3, 7, 10 e 13.
- Estatísticas: o app (lib/estatisticas.ts, ligado por EnvioDeEstatisticas só com sessão)
  manda em lote respostas (tipo, lição, certa/errada) e etapas concluídas pela primeira vez.
  O servidor (api/estatisticas.js) soma em `estatisticas (dia, chave, n)`, sem conta, e-mail,
  IP nem horário; apaga depois de 365 dias. O dono lê em /admin/estatisticas.
- **Tempo por letra** (28/10/2026, decisão do dono): a lição mede o tempo ATIVO de cada etapa
  (`useTempoAtivo` em lib/tempo-de-etapa.ts: página à vista e gesto no último minuto) e, na
  primeira conclusão, o lote leva só a FAIXA (0 a 6, "menos de 1 min" a "20 min ou mais"),
  nunca os segundos. O servidor soma `t|<lição>|<etapa>|<faixa>`; /admin/estatisticas mostra a
  faixa mediana por etapa e a estimativa por letra (`tempoPorLetra`). É o que confere o "cerca de
  dez minutos por letra" do site. Privacidade art. 4 diz isso (versão 2026-10-28).
- LinkButton para rota paga não pré-carrega (evita 403 para quem não comprou). Conta criada
  há menos de 24 h vê o preço antes do aviso "já pagou com outro e-mail?".

## Etapa 1 da lição em passos (28/10/2026, decisão do dono)
- `StageConhecer` (LessonClient) mostra um bloco por tela: Descobrir, Ouvir, Entender, Praticar e
  Conferir (sem `checagem`, quatro passos). Voltar e Próximo sempre andam; o último botão é
  "Continuar para as palavras". O conteúdo de cada bloco é o mesmo de antes (a etapa enxuta e o
  "Ver mais sobre esta letra" continuam valendo dentro de "Entender").

## Etapa 1 da lição mais curta (30/09/2026)
- Em toda letra, `Ensinamento` mostra à vista só "O que esta letra faz" e "O que você precisa
  lembrar" (e o detalhe, quando a letra tem forma final). Detalhe, nota para brasileiro,
  padrão e dica de leitura ficam atrás de "Ver mais sobre esta letra (N quadros)". Álef no
  celular: 5172px → 4350px. A partir da letra 12 continua valendo a etapa enxuta (ENXUTA_DESDE).

## Segundo fator do administrador (30/09/2026, pedido do dono)
- Toda rota de administrador (`exigirAdmin` em lib/admin.js) pede, além da sessão de uma conta de
  ADMIN_EMAILS, o cookie `__Host-hf_admin`, que só nasce depois do código de 6 dígitos mandado ao
  e-mail da conta (POST /api/admin/codigo e /api/admin/codigo/conferir, api/admin-codigo.js).
  Código: só o hash em `admin_codigos`, 10 min, 5 tentativas, 5 pedidos por hora.
- O cookie vale 12 h e fica preso à sessão: mesma conta, mesma `session_version` e mesmo aparelho
  (`ap`). Sair apaga; trocar a senha derruba. Sem ele: 403 `admin-codigo`, que os 4 painéis tratam
  mostrando CodigoDoAdmin.
- Depende do envio de e-mail (Resend). Sem ele, os painéis não abrem (erro `sem-email`).
- Testes: `comoAdmin(env, cookie)` em tests/ajuda/d1.ts dá o segundo fator a um administrador.

## Idade no cadastro e pagamento único no checkout (30/09/2026, pedido do dono)
- A declaração de idade mora SÓ nos Termos, art. 3 (pedido do dono): "Ao aceitar estes Termos no
  cadastro, e ao comprar, você declara ter 18 anos ou mais, ou ser o responsável legal". O cadastro
  tem uma caixa só, "Li e aceito os Termos de Uso", e o checkout diz "Ao continuar você concorda com
  os Termos de Uso": nenhum dos dois repete a idade. Versão das políticas 2026-09-30. O formulário
  manda `declarouIdade` igual a `aceitouTermos`. O servidor exige `declarouIdade: true` (erro
  `idade`) e grava em `aceites` também o documento `idade`, com a versão dos Termos. Todo teste
  ou script que cria conta manda `aceitouTermos: true, declarouIdade: true`.
- "Condições desta compra" no checkout diz: pagamento único, sem assinatura nem renovação
  automática (CDC, art. 6º, III).

## Leituras bônus: troca livre, leitura sozinha depois (30/09/2026, pedido do dono)
- O dono não conseguia trocar XP pelos textos bíblicos: cada leitura só abria com as letras dela
  DOMINADAS (`after`, 20 a 22; dominar = concluir e ter 6 de 8 na fixação). Decisão dele: a
  troca é LIVRE a qualquer momento (o botão só se desliga por saldo), e a tela explica a lógica.
- Em Recompensas, acima das leituras: pode trocar agora, ela fica guardada, já dá para ouvir e
  acompanhar pela transliteração; ler sozinho vem quando dominar as letras. "Você domina X de 22",
  a regra do domínio e, se houver, quantas lições concluídas ficaram abaixo de 6 de 8
  (`concluidasSemDominio` em lib/state/rules.ts), com link para o mapa. Cada leitura diz, numa
  linha própria abaixo do botão, quantas letras pede e quantas faltam.
- Na leitura (/bonus?l=), antes de dominar as letras, um cartão "Este texto ainda está à sua frente".
- Preço: 200 XP por leitura, trecho ou versículo (o versículo custava 100). A compra guarda o custo
  que pagou, então quem já trocou não perde saldo.

## Estornos que dependem do dono: /admin/estornos (30/09/2026)
- Estorno "manual" (PIX direto, liberação à mão) ou "erro" (8 recusas da Mercado Pago) não tinha
  como ser dado por feito: o acesso continuava aberto e o lembrete diário não parava. Agora
  `/admin/estornos` (com o segundo fator) lista os mesmos do lembrete e tem "Já devolvi o
  dinheiro" (com confirmação): `POST /api/admin/estornos/feito` roda `refundOrder` (pedido
  `refunded`, meses fora do acesso), marca o estorno `concluido` e grava `estorno-manual-feito`
  na trilha. Estorno automático em andamento (`pendente`/`pedido`) dá 409: quem confirma é a MP.
- `estornosAbertos` ignora pedido já `refunded`: devolver pelo painel da MP um estorno "manual" ou
  "erro" fecha o pedido pelo aviso dela, e antes a linha do estorno ficava aberta para sempre.
- O lembrete diário (alertas.js) aponta para /admin/estornos no caso do PIX direto.

## Funil do teste grátis da capa (03/10/2026)
- `POST /api/demo {etapa}` (sem sessão, sempre 204) soma `d|<etapa>` em `estatisticas`. Etapas válidas em
  `ETAPAS_DA_DEMO` (api/estatisticas.js): visto, reconhecer, comparar, vogais, escrever, achar, ler, pronto, cta.
  Robô não conta; freio de 40 por hora por IP (`demo-ip:`). O app (lib/funil-demo.ts) manda cada etapa uma vez
  por visita; `visto` vem de um IntersectionObserver na seção. Painel: /admin/estatisticas, "Teste grátis da capa".
  A Política de Privacidade (art. 4) tem um parágrafo sobre isso.

## Links de campanha e preço dos links (04/10/2026, decisão do dono)
- `LINKS_DE_CAMPANHA` (api/estatisticas.js): /sefarad, /bio, /stories, /dm. Cada um conta a visita e leva a
  `/?parceria=<nome>#experimente`. Os quatro estão em `PARCERIAS` (worker/src/lib/catalog.js e lib/parceria.ts):
  mesmo preço `price.parceriaBrl` (R$ 147), e o pedido guarda o nome (orders.parceria, /admin/vendas).
- O preço dos links vale até `price.parceriaAte` = 2026-11-30, fim do dia em Brasília (`parceriaVigente`, nos
  dois lados). Depois, os links levam ao preço do dia. A capa e o checkout dizem "até 30/11".
- **Desde 23/10/2026 o catálogo não tem `parceriaBrl` nem `parceriaAte`** (decisão do dono, preços sem data):
  os links cobram o preço do dia e continuam guardando o nome no pedido. O código da parceria fica, testado com
  dados de exemplo (tests/parceria.test.ts), para o dia em que houver preço de link de novo.
- O @ certo da associação é @adsefarditas.

## A segunda letra por e-mail, no fim do teste (03/10/2026)
- `POST /api/segunda-letra {email}` manda UM e-mail com o Mem (a 2ª letra do curso) e nada mais: o endereço não
  é gravado nem entra em lista. Freio: 5/hora por IP e 1/dia por sha256 do endereço (repetido responde ok igual,
  sem oráculo). Conteúdo em `SEGUNDA_LETRA` (lib/mail.js), conferido contra data/letters.json pelo
  segunda-letra.test.ts. Sem preço no e-mail. O envio soma `d|segunda-letra` no funil (só o servidor conta).
  A Política de Privacidade (art. 4) tem um parágrafo sobre isso.

## Quem comprou: /admin/vendas (02/10/2026)
- `GET /api/admin/vendas` (com o segundo fator, só leitura) lista as últimas 200 compras `paid` ou
  `refunded`: nome, e-mail, valor, meio, parcelas, data e `parceria`. Pendentes, vencidas e recusadas
  ficam de fora. A página /admin/vendas mostra o total pago e quantas vieram pelo link de campanha.
- `orders.parceria` (migração 0002) guarda o nome da parceria válida que o checkout mandou
  (`sefarad`); `createOrder` grava, pay.js passa. Pedidos anteriores ficam NULL.

## Capa mais curta (30/09/2026, decisão do dono)
- Saíram 7 seções que repetiam outra: Transformação, Problema (`#como`), Demonstração (`#curso`),
  Recursos, AulaAmostra (`#aula`), Jornada e AlemDoAlfabeto (`#alem`). No celular, de 19 seções
  e 22.650 px para 12 e cerca de 14.500 px; o preço sobe de ~17.000 px para ~11.500 px de rolagem.
- Os componentes ficam em components/landing/ (sem uso na capa). O menu "Como funciona" aponta
  para `/#decisoes`. A página /biblia continua ligada pela FAQ da capa.
- A conferência `app/clique.mjs` (roda ANTES de publicar) abre `/#experimente`, `/#decisoes` e
  `/#duvidas` direto pelo link. Tirar uma seção da capa pede tirar a âncora dela dali também, ou a
  publicação é barrada (foi o que aconteceu com `/#curso` no #83).

## Encarregado de dados: ME dispensada (01/10/2026)
- O contador confirmou: a empresa é ME, e o enquadramento (CNAE 8593-7/00) não muda.
  `data/empresa.json` → `privacidade.agentePequenoPorte: true`. Sem `encarregadoNome`, a Política
  de Privacidade (art. 1) diz que o controlador é agente de pequeno porte, dispensado de indicar
  encarregado (Resolução CD/ANPD nº 2/2022, art. 11), e que o canal é o e-mail do item 6. O
  `check-legal` e `pendenciasDaEmpresa` param de apontar o encarregado como pendência.
- Versão das políticas: 2026-10-01. Falta o advogado confirmar que nenhum tratamento é de alto
  risco (o alto risco tira a dispensa).

## Crédito ao Damián: o que é do método e o que é adaptação (01/10/2026, palavras do dono)
- A ordem em que as letras entram vem do método do Dr. Damián Dzienciarsky (não é adaptação).
  São adaptação do Moshik: os exercícios, as explicações para quem fala português e a escrita
  cursiva. A frase mora em `METODO_ORIGINAL.adaptacoesPt` (lib/credito.ts), em primeira pessoa,
  e é lida pela capa (Professor) e por /sobre ("De onde vem o método").

## Capa, "Ouça e descubra a letra": o nome da letra (01/10/2026, pedido do dono)
- O botão tocava a sílaba («sha») onde se esperava o NOME da letra. Agora toca o nome gravado
  (Shin, Mem, Lámed: `shin`/`mem`/`lamed` em AMOSTRA_AUDIO, lib/amostra-audio.ts e
  tools/export-content.mjs, que copiam de audio/), pergunta "Qual é esta letra?", e depois do
  acerto oferece "Ouvir «sha»" junto da explicação do risquinho.

## Ativos fora do Worker, cache imutável e Range (01/10/2026, auditoria PERF-001/002, LEGAL-101, SEC-A-004)
- `run_worker_first` no `wrangler.toml` é uma LISTA: `"/*"` manda tudo ao Worker e as regras
  `"!..."` são o que o servidor de ativos responde sozinho, sem invocação (não conta na cota do
  Free): `/_next/static/*`, `/fonts/*`, `/media/*`, `/tracado-amostra/*`.
  Só o que é público E imutável. `/amostra-audio` fica no Worker de propósito (Range). `/audio` e `/stroke-order` são pagos e NUNCA entram na lista.
- O que sai sem Worker não passa por `blindar`: os cabeçalhos (nosniff, HSTS, `Cache-Control:
  public, max-age=31536000, immutable`) vêm de `app/public/_headers`, que o Next copia para
  `app/out/_headers` na build. Mudou a lista do toml, mude o `_headers` junto; o teste
  `app/tests/cache-e-range.test.ts` confere os dois contra `gate.js`.
- `blindar` também põe `immutable` em `/_next/static/` (vale no `wrangler dev` e no dia em que a
  lista mudar); rota paga continua `private, no-store`, a regra do portão vem depois e vence.
- `worker/src/lib/range.js`: `intervalo`, `responderRange` e `comRange`. O Safari exige 206 a
  `Range: bytes=0-1`; o `wrangler dev` devolve 200 inteiro. `audio.servir` (D1) e os mp3 do git
  em `/audio/*` usam o helper; um 206 que já veio pronto do servidor de ativos passa intocado.
  Os clipes de `/amostra-audio` também passam por `comRange`; `worker/e2e.sh` confere o 206.
- `sendMail` manda `reply_to: SUPPORT_EMAIL` à Resend ("responda este e-mail" cai na caixa de
  suporte, não em `contato@`). `deploy-app.yml` (prévia no GitHub Pages sem portão) foi apagado.

## Backup e a tabela gravacoes (01/10/2026, SEC-A-001)
- `gravacoes` (os áudios do painel, BLOB de até 1,5 MB) fica FORA do backup diário:
  o `d1 export` escreve cada linha como um INSERT em hexadecimal, acima do teto de 1 MB por
  comando do SQLite, e a cópia não restaurava em lugar nenhum. `sem_gravacoes` em
  `scripts/backup-nuvem.sh` tira só os INSERTs; o CREATE TABLE fica e a prova continua
  (gravacoes sai 0, volta 0). Nada se perde: a casa delas é `audio/<id>.mp3` no git
  (`exportar_gravacoes` no deploy-worker.yml) e o Worker serve do git quando não há linha.
- O resumo diário diz quantas linhas ficaram fora e quais ainda não estão no git. Prova
  local, sem nuvem: `bash scripts/backup-nuvem.sh provar-gravacoes` (cru estoura, filtrado restaura).

## Desistência na vitrine, tinta do escuro e a data do pré-lançamento (01/10/2026, auditoria CONV-001, VIS-001, PAY-B-001)
- A frase "N dias para desistir e receber 100% de volta, sem justificar." (N =
  `empresa.politicas.arrependimentoDias`) está na caixa de preço da capa (`Preco`, Fecho.tsx),
  na da página do curso (`BuyBox`, CourseClient.tsx) e, curta, na `BarraFixa`. O cartão
  "E se não for para mim?" e a FAQ da capa ("E se eu não gostar?") respondem com ela.
  `app/check-legal.mjs` confere a frase no HTML de `/` e de `/cursos/alfabetizacao/`. Nunca
  chamar de "garantia": é o direito do CDC, contado da liberação do acesso como em /reembolso.
- Tema escuro: `--accent` é TINTA e `--accent-bg` é FUNDO com texto branco. No claro os dois
  são o navy; no escuro `--accent` vira `--teal-ink` (#7FDACA) e `--accent-bg` fica no navy
  (#1D545E). Fundo sólido com texto branco usa `bg-[var(--accent-bg)]`; barra de progresso,
  borda, ring e texto continuam em `--accent`. `app/escuro.mjs` mede o contraste de TODO
  texto visível de `/licao/alef/` e falha abaixo de 4,5:1.
- `preLancamentoAte` + `listBrl`: `src/lib/pre-lancamento.ts` (`estadoDoPreLancamento`) diz
  `ok`, `avisa` (10 dias ou menos) ou `vencido`; `check-legal.mjs` carrega uma cópia entre os
  marcadores `inicio/fim estadoDoPreLancamento`, avisa perto do fim e FALHA com a data vencida.
  A regra de preço não muda sozinha: a decisão de 01/11 é do dono (PAY-B-001).

## Fase 1 de segurança da auditoria de 01/10/2026 (SEC-A-002/003/005/007/008/009, PERF-007)
- **Freio de erro reserva antes de verificar** (`reservarVaga` em lib/db.js): o login toma a vaga
  dos três tetos de erro com a escrita atômica antes do PBKDF2 e quem acerta a devolve. O código
  do administrador gasta a tentativa num UPDATE condicional antes de comparar. Ler o contador e
  gastar depois deixava 40 tentativas paralelas serem todas avaliadas.
- **Nome do cadastro** passa por `nomeSeguro` (lib/nome.js) no cadastro e em todo "Oi, <nome>."
  dos e-mails; a confirmação de e-mail nunca leva o nome, e a senha nova só com o e-mail confirmado.
- **/api/health público = `{ok, monitor}`**; os detalhes com `Authorization: Bearer <ADMIN_TOKEN>`
  (a publicação gera um novo a cada vez e o entrega ao e2e em `HF_ADMIN_TOKEN`) ou com sessão de
  administrador com o segundo fator.
- **Alerta diário de saúde** (`alertaDeSaude`): carimbo `backup` em `batimentos` (gravado por
  scripts/backup-nuvem.sh) com mais de 36 h, ou 10+ respostas 5xx em 24 h (`respostas_5xx`, uma linha
  por hora, contada em worker.js). Monitor externo: INCIDENTES.md, "Monitor externo" (ação do dono).
- **Estatísticas só de aluno**; A/B com teto diário por endereço (HMAC do IP) e `compra` só com
  pedido pago da própria sessão, uma vez por pedido (`ab_compras`).
- **wrangler pelo lockfile da raiz** (`npm ci --ignore-scripts` + node_modules/.bin/wrangler) e
  actions fixadas por SHA. Subir o wrangler = editar package.json, o lockfile e o fallback
  `wrangler@4.146.0` dos scripts juntos.
- **/api/me sem sessão**: 200 `{signedIn:false}` só com `X-HF-Sessao: opcional` (o app manda); sem o
  cabeçalho, 401 (pacote antigo numa aba aberta). O progresso não chama /api/progress sem sessão.

## Capa, /sobre, /metodo, /biblia e SEO: fase 1 da auditoria de 01/10/2026
- **Ordem das letras (CONV-004):** só como do método do Damián, pela frase de
  `lib/credito.ts`. `app/promessas.mjs` reprova "sequência/ordem das letras" em string
  de `app/src` ou `data/` (fora de credito.ts e das notas `_`/`note`) e qualquer frase
  publicada sobre a ordem que não diga "vem do método".
- **Credencial:** "CELTA · Letras em andamento" na capa; "CELTA e Letras em andamento"
  em /sobre (Letras - Inglês, UNINTER, em curso).
- **/biblia:** "letra N das 22 (lição M das 27)", com M de `licaoDaLetra` (content-publico)
  e 27 de `totalLicoes()`. `numeros.mjs` confere "letra/lição N das M" e o par letra→lição.
- **O método numa lista só (CONV-010):** `lib/etapas-da-licao.ts` = as abas da lição
  (Conhecer, Palavras, Escrever, Praticar, Fixação). A capa (`PASSOS`) e /metodo leem
  dela; `tests/etapas.test.ts` confere contra `STAGES` do LessonClient.
- **Caixa de preço:** a lista "inclui" é concreta (Aula 0, N lições, cursiva, áudio do
  professor se houver manifesto, jogos da Academia, exame final e certificado não oficial).
- **SEO:** JSON-LD da capa (`lib/jsonld.ts`: Organization com CNPJ, Course com o preço de
  `lib/vitrine.ts` e `priceValidUntil` = `preLancamentoAte`, FAQPage das perguntas de
  `components/landing/faq-capa.ts`, Person só com o que /sobre afirma); `checa-seo.mjs`
  confere tudo isso e a description da capa (até 155). Ícones: `app/src/app/apple-icon.png`
  (link do Next), `app/public/apple-touch-icon.png` e `app/public/favicon.ico` (PNG 32 em
  ICO), renderizados do `icon.svg` com a Noto Serif Hebrew no Chromium. O 404 tem título
  próprio; /cursos tem h1.
- **Worker:** o 307 da barra final vem do servidor de ativos (auto-trailing-slash); `permanente`
  em worker.js troca por 308 com o mesmo destino. `.txt` (payload RSC) sai com
  `X-Robots-Tag: noindex`, menos robots.txt e llms.txt. `tests/barra-e-txt.test.ts`.
- **Sem JavaScript (UXQA-001):** saiu o `app/src/app/loading.tsx` da raiz (o conteúdo ia
  para um `div hidden` do streaming). As rotas pagas já têm esqueleto próprio (CourseGate).
  `@media (scripting: none)` em globals.css mostra `.reveal` e a entrada do hero
  (`data-entrada`).
- **Botão de acessibilidade (VIS-016, UXQA-014, CONV-021):** `useDesvio` em
  BotaoAcessibilidade sai de cima do que está marcado com `data-a11y-desvia` (mockup do
  hero, formas de pagamento do checkout), do `#teclado-hebraico` e de tudo que é
  `position: fixed` (folha de retorno): sobe acima, ou vai para a esquerda, ou fica. O
  aviso de conquista vai para o alto quando o teclado da tela está aberto.

## Auditoria de 01/10/2026, parte do curso (audit/2026-10-01, G/F/E/D)
- **Dt 6:9 voltou ao massorético.** A correção PED-015 de 28/09 (commit 8410a28) trocou
  `מְזֻזֹת` por `מְזוּזֹת` no Shemá de `data/bonus.json`; foi revertida (CONT-004): o
  Códice de Leningrado traz `וּכְתַבְתָּם עַל־מְזֻזֹת בֵּיתֶךָ וּבִשְׁעָרֶיךָ` (qubuts, sem
  vav); `מְזוּזוֹת` é a grafia de Dt 11:20. A pronúncia não muda, então a gravação é a mesma:
  `audio/he-05cb039a.mp3` voltou de `audio/arquivo/` e `he-8b9dc73a.mp3` foi para lá (o id
  sai do hebraico). Se o painel /admin/gravar tiver regravado `he-8b9dc73a`, regravar no id novo.
- **Som da letra em português** (`lib/som-pt.ts`, CONT-003): `somPt(sound)` é o rótulo da
  tela (cabeçalho da lição, página do módulo, painel, ligar letra e som, baralho da Academia);
  o IPA de `data/letters.json` fica como detalhe. `fonemasDe`/`somEmComum` dizem quando dois
  sons são o mesmo (Tav/Tet, Álef/Áyin, Kaf/Qof): o ligar da lição (CONT-001) e o baralho
  (`chavesDe` em deck.ts, CONT-005) nunca põem dois iguais na mesa.
- **Domínio com os números das constantes** (UXQA-005): `FIXACAO_ITENS` (10),
  `acertosPara`, `REGRA_DO_DOMINIO` e `REGRA_DO_DOMINIO_CURTA` ("8 de 10") em
  lib/state/rules.ts. Nenhuma tela escreve "6 de 8" à mão; "dominada" é sempre
  `isLessonMastered` (checkpoint, /concluido, /certificado, exame). A nota de 30/09 acima
  que diz "6 de 8" descreve a régua antiga.
- **Exame e módulos 6/7** (CONT-010): o exame abre com as 22 letras dominadas (a regra do
  certificado). "Sem os pontos" só entra para quem fez o módulo 6, e "Os sons de fora" para
  quem fez o 7 (`semPontos` e `extras` em `buildExam`).
- **Aula 0 primeiro** (CONV-020): abrir /inicio grava `firsts['aula-0']`; até isso, sem
  nenhuma lição começada, o painel oferece a Aula 0 como botão principal.
- **Lição trancada** (UXQA-002): fixação abaixo de `LIBERA_MARK` troca o botão principal por
  "Refazer a fixação (precisa de 80%)" e o painel aponta "Terminar <letra>".
- Testes: `app/tests/auditoria-curso-1001.test.ts`. `npm run validate` ganhou V27 (todo
  hebraico do dado-fonte em NFC).

## Fim do pré-lançamento e e-mail do domínio (01/10/2026)
- **SUBSTITUÍDO em 23/10/2026: o preço NÃO sobe sozinho.** Ver "Preços, combo único e Minha Biblioteca"
  abaixo. O texto que segue é histórico.
- **O preço sobe sozinho** (decisão do dono): `tools/virar-preco.mjs` troca, em `data/courses.json`, o
  `brl` pelo `listBrl` e tira `listBrl`/`preLancamentoAte` quando o fim do dia `preLancamentoAte` em
  Brasília passa. Quem roda é `.github/workflows/virar-preco.yml`, agendado para 01/12 03:05 UTC (o pré-lançamento foi estendido até 30/11): aplica,
  roda a build (os Termos citam o preço, então nasce versão nova do contrato em
  `data/politicas-versoes/`), commita em main e dispara `deploy-worker.yml`. Rodar à mão é seguro.
  Testes de cobrança e `worker/e2e.sh` leem o preço do catálogo (`tests/ajuda/preco.ts`), nunca 147 fixo.
- **contato@hebraicofluente.com.br** é o e-mail do site (empresa.json e `SUPPORT_EMAIL`): Email Routing da
  Cloudflare encaminha ao Gmail do dono. Mudar o e-mail nas políticas gera versão nova: commitar as cópias
  que a build escreve em `data/politicas-versoes/`.
- `.gitignore` usa `node_modules` sem barra: um link simbólico `app/node_modules` foi commitado por engano
  e, no checkout, substituiu a pasta de dependências.

## Bloco A da auditoria, fim (01/10/2026)
- **Baixar meus dados** (`GET /api/account/dados`, api/meus-dados.js; botão em /perfil): JSON como anexo,
  sem senha, sessões, aparelhos, marca anticópia, código PIX e link de pagamento. 10 por hora.
- **mover-compra** (Actions → Acesso): acesso, pedido e desistência de uma conta para outra; para se a
  de destino já tiver o curso. O progresso não muda de conta.
- **a11y-pago.mjs**: entra com conta de aluno num wrangler dev e confere 9 telas pagas a 360/390 px com o
  texto em 100% e 150% (sem HF_EMAIL, cria a conta e libera o curso no D1 LOCAL; recusa base remota sem
  HF_EMAIL). Achou o 150% estourando painel, lição, perfil e mapa: `min-width: 0` e `overflow-wrap:
  anywhere` dentro do <main> ampliado (globals.css) resolveram.
- Conteúdo baixado vai para a trilha (`registrarConteudo`, uma linha por conta por dia) e o e-mail de
  desistência ao dono diz em quantos dias foi aberto (não muda o direito de desistir).
- A fala aceita ו/י a mais, nunca letra a menos (`grafiaCheiaDe`). Ícones de traço em NavIcons.tsx no
  lugar de emojis coloridos; selos da lição ficam.
- **Marca d'água visível (decisão do dono, 01/10/2026): fica**, em todas as contas, inclusive as de
  quem comprou antes de 29/09 (VIS-011 encerrado). Exceção possível, se um comprador antigo pedir: mais
  aparelhos na conta dele, nunca tirar a marca.
- **Quem já sabe ler um pouco NÃO pula etapas** (decisão do dono, 01/10/2026; UXQA-022 encerrado): todo
  aluno passa pelas 27 lições e pela fixação de 80% em ordem, sem nivelamento nem "já sei esta letra".

## contato@ passa pelo Worker (01/10/2026, LEGAL-109)
`worker/src/email.js` (o `email()` do Worker): o Email Routing manda
`contato@` para o Worker, que encaminha tudo a `CONTATO_DESTINO` (wrangler.toml
[vars]; precisa ser destino verificado no Email Routing) e confirma na hora,
pela Resend, os assuntos de desistência/reembolso. Não responde a robôs,
listas, ao próprio domínio, nem ao mesmo remetente mais de uma vez por hora.
Encaminhar vem primeiro e falha alto (a Cloudflare devolve ao remetente).
O "Enviar modelo" do Gmail não serve para isto: responde ao envelope SRS.

## Backup também no Google Drive, cifrado (01/10/2026)
`copiar_drive` em scripts/backup-nuvem.sh, depois do R2 e do carimbo: cifra o
.sql.gz com `openssl enc -aes-256-cbc -pbkdf2 -iter 600000` (senha no segredo
BACKUP_SENHA), prova que decifra igual, envia com rclone (segredo
RCLONE_DRIVE_TOKEN, remote por variáveis de ambiente) para
`hebraico-fluente-backups/` e apaga as de mais de 90 dias. Sem os dois segredos
o passo só avisa no resumo. Nunca em claro fora da Cloudflare. Prova local:
`bash scripts/backup-nuvem.sh provar-cifra`. Ligar e restaurar:
RUNBOOK-ATENDIMENTO.md. A Política de Privacidade cita a cópia cifrada no Drive.

## Ordem das letras: Álef, Mem, Tav fica (decisão do dono, 02/10/2026)
O dono considerou voltar à ordem do método de origem (Mem, Tav, Álef) e
decidiu manter Álef primeiro: com Mem e Tav sozinhas não há palavra útil
(אִמָּא e אֵם precisam do Álef), e a ordem atual dá a primeira palavra real já
na lição 2. Rever só se alunos reais disserem que a lição do Álef (letra
muda) confunde.

## E-book Israel Além do Óbvio (21/10/2026, decisão do dono) - NO AR SÓ PARA O DONO
**Nome novo desde 23/10/2026** (pedido do dono): "Israel Além do Óbvio", subtítulo "O país pelos
olhos de quem nasceu lá", descrição "Uma jornada interativa pela história, cultura e lugares de
Israel.", autor Moshik Gueta (`titlePt`, `taglinePt`, `descricaoPt`, `autorPt` em data/courses.json;
`livro.json` no editorial). O que NÃO mudou de propósito: o slug `israel-alem-do-roteiro` (direito de
acesso no banco, pedidos, `NAO_CURSOS`), `/israel/`, a pasta do editorial e o caminho do PDF em
`/israel/`. O PDF baixa com o nome `israel-alem-do-obvio.pdf` (Content-Disposition em api/livro.js),
e a página do portal mudou para `/israel-alem-do-obvio` (301 do endereço antigo, worker.js).
Vendido à parte: é a "venda avulsa de produto digital" do Enquadramento acima. O dono
decidiu **só abrir a venda depois de o contador confirmar o enquadramento (CNAE, nota)
e de o advogado ler os parágrafos dos Termos e do Reembolso**.
- **No ar sem venda** (22/10/2026, decisão do dono, como o Raízes Sefarditas): o e-book e
  o pacote têm `"aVenda": false` em `data/courses.json`. Com isso não há página de venda,
  checkout (`isSellable` recusa com 404), link no rodapé nem em /cursos, e os parágrafos
  do e-book somem dos Termos e do Reembolso (as políticas ficam na versão de antes).
  `/israel/` vai ao ar atrás do portão e só abre com o direito `israel-alem-do-roteiro`,
  dado à mão em Actions → Acesso → `liberar`; quem não o tem vai para /cursos/.
  **Abrir a venda** = tirar as duas linhas `aVenda`, subir `politicas.atualizadoEm` e
  publicar (nasce versão nova dos Termos e do Reembolso).
- **O editorial é PRIVADO** (21/10/2026): manuscrito, fontes, ilustrações, fotos e
  ferramentas moram em `Moshikgueta/hebraicofluente-editorial`, nunca neste repositório
  (público). `editorial/` está no `.gitignore`: para trabalhar, clone o privado aí. A
  publicação faz o checkout dele com o segredo `EDITORIAL_TOKEN` (token fino, só leitura,
  só daquele repositório) e para com erro se o segredo faltar. A Action "Fotos do livro"
  foi junto. O histórico do ramo `claude/wonderful-mayer-n4sc1n` (e da PR #193) ainda
  contém o editorial: nunca fundir esses commits na `main` sem tirar o editorial deles.
- **Catálogo:** `data/courses.json` ganhou `tipo` (sem ele, é curso). `israel-alem-do-roteiro`
  (`livro`) e `alfabetizacao-e-israel` (`pacote`, o combo, `componentes` = curso + livro). Preços desde
  23/10/2026 em "Preços, combo único e Minha Biblioteca" abaixo. `allCourses()` (app) só devolve cursos;
  `allProducts()` devolve tudo (checkout, páginas de venda).
- **Pedido de pacote:** `itensDoPedido` (worker/src/lib/catalog.js) diz o que um pedido
  abre. `applyPayment` concede cada item; `refundOrder` aceita `itens` e recua todos na MESMA
  transação. Quem já tem um componente recebe 409 `ja-tem-parte`. `liberar` (Actions) passa
  os componentes a `scripts/sql-liberar-pedido.sh`.
- **Portão:** `/israel` no GATED e no PAGAS, `cursoDaRota` → `israel-alem-do-roteiro`.
  `NAO_CURSOS` (gate.js) diz quais direitos não são de curso: o e-book não abre /audio, não
  grava progresso nem estatística. A lista é conferida contra o catálogo em
  `tests/ebook-produto.test.ts`.
- **Sem PDF para baixar** (23/10/2026, decisão do dono): o livro é só a versão interativa.
  `scripts/ebook-no-site.sh` monta a versão web (`--producao`, sem arquivo: sem o botão "Baixar o
  PDF") em `app/public/israel/` (gitignored), e não monta nem publica o PDF; o passo "E-book no site"
  do `deploy-worker.yml` roda antes do build. Venda, checkout, Termos, Reembolso, e-mail e a nota
  metodológica não falam em PDF (`tests/ebook-produto.test.ts`, "o e-book não tem PDF para
  baixar"). O código da marca d'água no PDF (abaixo) fica dormente: sem o arquivo, a rota dá 404.
  Para o PDF voltar: `--producao=<arquivo.pdf>`, o `revista.mjs` e o `pdf-marca.mjs` no script.
- **No portal** (23/10/2026, decisão do dono): o livro aparece "Em breve" em /descobrir-israel e
  /israel-alem-do-obvio, SEM preço nem compra, e o rodapé leva a /descobrir-israel. A página de
  VENDA (/cursos/israel-alem-do-roteiro) continua só existindo com o livro à venda.
- **Prévia grátis em /previa** (23/10/2026, pedido do dono): o link que o ManyChat manda no
  direct a quem comenta EBOOK no Instagram. Pública, sem conta, FORA do portão, `noindex` (meta e
  `X-Robots-Tag` em worker.js) e fora do sitemap (`NAO_LISTADAS` em seo.mjs e lib/seo.ts). É o app
  do livro em modo prévia (`web.mjs --previa`, do editorial), montado por `scripts/ebook-no-site.sh`
  em `app/public/previa/` (gitignored): SÓ os blocos de `editorial/<livro>/previa.json` (decisão do
  dono: a mochila do cap. 8, o monte a sua comida do cap. 6 À VONTADE (`livre`: pita ou prato, sem
  recusa nem limite, e "Servir" diz se virou um prato do capítulo), a roleta com 5 curiosidades do cap. 9
  e duas páginas do diário), e a publicação para se algum faltar. Sem preço nem compra do livro
  (que segue `aVenda: false`); o botão do fecho vai ao curso com `utm_content=previa-ebook`.
  Contador: os eventos `previa-*` em `EVENTOS_DO_PORTAL` (POST /api/portal), um por visita; tabela
  própria em /admin/estatisticas (`funilDaPrevia`); Privacidade art. 4 diz isso.
  `tests/previa.test.ts` e o bloco "A prévia do e-book" do `worker/e2e.sh` travam tudo isso.
- **Sem aba no curso** (22/10/2026, decisão do dono): a aba "Seus livros" (sidebar e ícone no
  cabeçalho, #204) saiu no mesmo dia. O curso de alfabetização não mostra o livro; quem tem o
  direito abre `/israel/` direto.
- **Texto protegido contra cópia** na versão web (editorial, `templates/web-app.js` e `web.css`):
  sem seleção, copiar, recortar, arrastar nem menu do botão direito; campos, links e fotos (CC)
  ficam livres. O PDF baixado continua copiável (mas leva a marca, abaixo).
- **Marca d'água do livro** (22/10/2026): a versão web pede `GET /api/livro/licenca`
  (worker/src/api/livro.js, só com o direito do livro) e mostra na margem o e-mail escondido e o
  número da cópia, o mesmo da marca do curso (`marcas`), que o /admin/marca reconhece.
- **Marca d'água no PDF** (22/10/2026, pedido do dono): o PDF baixado sai com a mesma linha em pé
  na margem de TODA página e no Assunto dos metadados. Refazer 380 páginas por pedido não cabe nos
  10 ms de CPU; por isso `scripts/pdf-marca.mjs` (no `ebook-no-site.sh`) monta na publicação uma
  ATUALIZAÇÃO INCREMENTAL (`<pdf>.cauda` + `.cauda.json`): as páginas reescritas no fim do arquivo
  com o texto num campo de largura fixa, para a xref não mudar. Por pedido, `pdfMarcado`
  (api/livro.js, depois do portão) escreve o texto da conta no campo e manda o original, sem ler,
  seguido da cauda (`FixedLengthStream`). Sem cauda, cauda de outro PDF ou banco fora: o PDF sai
  sem marca, nunca sem livro. O gerador só aceita a forma que o Chromium escreve (xref clássica,
  /Resources na página) e para a publicação em qualquer outra. Provado com `wrangler dev`
  (com `--var SESSION_SECRET:...`; a variável de ambiente sozinha não chega ao Worker).
- **Páginas:** `/cursos/<slug>` usa `ProdutoClient` para livro e pacote; rodapé e /cursos
  linkam o e-book. Termos (art. 1) e Reembolso (art. 4) têm um parágrafo marcado TEXTO PARA
  APROVAÇÃO; políticas na versão 2026-10-21.

## Preços, combo único e Minha Biblioteca (23/10/2026, decisões do dono)
- **Dois produtos e um combo só**, sem edições. Pré-lançamento (`brl`, o cobrado) e oficial (`listBrl`):
  Alfabetização R$ 147 / R$ 197; Israel Além do Óbvio R$ 197 / R$ 297; combo "Descubra Israel + Aprenda
  Hebraico" (`alfabetizacao-e-israel`) R$ 297 / R$ 397. Separados no pré-lançamento, R$ 344: a economia de R$ 47
  é calculada na tela (`economiaDoCombo`), nunca escrita. Não criar outro combo.
- **SUBSTITUÍDO em 31/10/2026 (decisão do dono): a alfabetização tem pré-lançamento ATÉ 30/11 e o preço sobe
  sozinho.** `preLancamentoAte: "2026-11-30"` no catálogo; R$ 147 no cartão, R$ 132,30 no PIX (10%). A Action
  "Virar o preço" roda agendada em 01/12 03:05 UTC com `--vencidos` (só vira o que tem data passada, em
  Brasília) e publica: o curso vai a R$ 297 e a faixa da promoção (`components/landing/FaixaDaPromocao.tsx`,
  logo abaixo do hero) some sozinha. O selo é "7 dias para desistir", nunca "garantia". O item abaixo é histórico.
- **O preço oficial NÃO vira sozinho.** O catálogo não tem `preLancamentoAte` nem `parceriaAte`; as telas dizem
  "Preço de pré-lançamento. Depois, R$ X." sem data (data sem virada seria escassez falsa). Virar é à mão:
  Actions → "Virar o preço" → escrever `virar` (e, se quiser, só alguns slugs). `tools/virar-preco.mjs` sem
  `--aplicar` só mostra. Curso com `status: soon` nunca vira. `tests/virar-preco.test.ts` trava a falta de agendamento.
- **Livro e combo prontos e DESLIGADOS** (`aVenda: false`) até o contador e o advogado (seção E-book). Nome na
  vitrine: "Israel Além do Óbvio: O Olhar de um Israelense" (`titlePt` + `taglinePt`, `nomeNaVitrine`); o livro é
  apresentado como experiência digital interativa, não "e-book", nas telas e nos e-mails ao cliente (o slug e
  os nomes internos ficam).
- **Vitrine:** `components/portal/OpcoesDeCompra.tsx`, em /cursos (três opções, combo em destaque). Fora de
  venda: "Em breve", sem preço. Quem tem uma parte do combo não recebe a oferta dele (o servidor daria 409).
- **Minha Biblioteca:** `/minha-biblioteca`, casca PÚBLICA (quem tem só o livro não tem o curso), pede o login
  ela mesma, fora do portão e da busca. Lista os direitos válidos (curso, livro, A1, Raízes) com "Abrir" e a
  data do fim. O combo pago leva a ela (`abre`); o perfil e o botão do cabeçalho (conta sem curso) também.
- **Pagamento:** nada novo no Worker; os três fluxos estão provados em `tests/ebook-produto.test.ts` ("os três
  fluxos"): preço do catálogo, valor do navegador ignorado, combo pago a menos sem liberar, pendente e recusado
  sem liberar, aviso sem assinatura recusado, aviso repetido concede uma vez. O teste com a Mercado Pago de
  verdade, no modo de teste, é o roteiro `TESTE-DE-PAGAMENTO.md` (na máquina do dono, com token `TEST-`).

## A landing do Israel Além do Óbvio (23/10/2026, master prompt do dono)
- `LivroClient` (/cursos/israel-alem-do-roteiro), ainda desligada com o livro (`aVenda: false`). A página É a
  demonstração: abertura navy com o livro no computador e a mochila no celular, "Não é um e-book", galeria das
  aberturas de capítulo, a viagem em cinco passos (mochila, mapa ilustrado, roleta, monte a sua comida, diário),
  os três aparelhos, quem escreveu, as duas opções de compra (só o livro, ou o combo), o roteiro, perguntas e
  fecho; barra de compra fixa só no celular. O preço vem depois da demonstração. Nenhuma contagem de capítulos
  ou curiosidades vende o livro (pedido do dono), e nada de escassez.
- **As imagens são do próprio livro e nunca entram no git** (o livro mora no repositório privado):
  `scripts/vitrine-do-livro.mjs` roda na publicação, logo depois de `ebook-no-site.sh` (passo "E-book no site"),
  e escreve em `app/public/vitrine-livro/` (gitignored): as aberturas de capítulo SEM texto copiadas como SVG (num
  `<img>` o SVG não carrega fonte) e capturas do livro montado num Chromium, com a mochila e o monte em uso (o
  monte vem da PRÉVIA, a livre: no do livro, ingrediente errado fica vermelho). Seletor que sumir do livro para a
  publicação, com o nome dele. Texto alternativo de cada ilustração = o `aria-label` do próprio SVG.
- **A galeria também está na página "Em breve"** (/israel-alem-do-obvio, pedido do dono, 23/10/2026):
  `components/portal/GaleriaDoLivro.tsx` (+ `galeria-do-livro.css`) é a mesma nas duas páginas. Só ilustração,
  sem preço nem compra; as imagens de /vitrine-livro/ ficam fora do portão.
- Movimento: `livro.css`, só CSS, por cima de conteúdo já visível (linha do tempo da rolagem onde existe),
  parado com "reduzir movimento". Nada nasce escondido esperando JavaScript (ver `Reveal`).
- `tests/livro-venda.test.ts` confere: imagens só das listas do script, todas com `alt`, sem banco de imagens,
  sem preço nem contagem escritos à mão.
- **Pendente no editorial** (não muda daqui): a capa do livro ainda diz "O país pelos olhos de quem nasceu lá",
  e as contagens da capa (capítulos, curiosidades, exercícios) precisam bater com o catálogo.
