-- Hebraico Fluente - esquema D1.
--
-- Aplicar com:
--   npx wrangler d1 execute hebraico-fluente --file=worker/schema.sql --remote
--
-- Duas escolhas estruturais, e as duas são sobre crescer:
--
--  1. O direito de acesso é UMA LINHA POR CURSO (tabela `entitlements`), e não
--     um campo `pago_ate` na conta. Com um campo só, o dia em que o A1 sair
--     exige migrar todo mundo e reescrever cada consulta. Com uma linha por
--     curso, lançar um curso novo não toca em nada.
--
--  2. Todo pagamento que chega - webhook, verificação, varredura - é gravado
--     cru em `payment_events` ANTES de qualquer coisa acontecer. O UNIQUE em
--     event_id é o que torna a entrega repetida inofensiva: a Mercado Pago
--     reenvia o mesmo aviso várias vezes por desenho, e sem isso um pedido
--     poderia liberar acesso duas vezes ou registrar duas compras.
--
-- Datas são inteiros em milissegundos de época. Um TEXT com fuso horário
-- dentro é uma comparação errada esperando acontecer.

CREATE TABLE IF NOT EXISTS accounts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE,     -- sempre minúsculo, normalizado na entrada
  name          TEXT    NOT NULL DEFAULT '',
  pass_hash     TEXT    NOT NULL,
  pass_salt     TEXT    NOT NULL,
  -- Iterações do PBKDF2 usadas NESTA linha. É o que permite subir o custo
  -- depois sem invalidar a senha de ninguém.
  pass_iter     INTEGER NOT NULL DEFAULT 310000,
  -- Subir este número invalida todo cookie já emitido para a conta.
  session_version INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS entitlements (
  account_id  INTEGER NOT NULL REFERENCES accounts(id),
  course_slug TEXT    NOT NULL,              -- combina com data/courses.json
  granted_at  INTEGER NOT NULL,
  expires_at  INTEGER,                       -- NULL = sem prazo; nenhum curso vende isso hoje
  order_id    TEXT    NOT NULL,              -- por onde um estorno encontra o acesso
  -- Um acesso por conta e curso. Uma renovação ESTENDE a linha existente em
  -- vez de criar outra: duas linhas para o mesmo curso significam duas datas
  -- de validade, e alguma consulta vai escolher a errada.
  PRIMARY KEY (account_id, course_slug)
);

CREATE TABLE IF NOT EXISTS orders (
  id            TEXT    PRIMARY KEY,         -- mintado pelo servidor, nunca pelo cliente
  account_id    INTEGER NOT NULL REFERENCES accounts(id),
  course_slug   TEXT    NOT NULL,
  amount_cents  INTEGER NOT NULL,            -- centavos; dinheiro nunca em ponto flutuante
  currency      TEXT    NOT NULL DEFAULT 'BRL',
  method        TEXT    NOT NULL,            -- pix | card
  installments  INTEGER NOT NULL DEFAULT 1,
  -- pending | paid | failed | refunded | expired
  status        TEXT    NOT NULL DEFAULT 'pending',
  provider      TEXT    NOT NULL DEFAULT 'mercadopago',
  provider_ref  TEXT,                        -- id do pagamento ou da preferência
  pay_url       TEXT,                        -- checkout do cartão, reaproveitado num reclique
  pix_code      TEXT,                        -- copia e cola
  pix_expires_at INTEGER,
  created_at    INTEGER NOT NULL,
  paid_at       INTEGER,
  checked_at    INTEGER                      -- última vez que a varredura olhou
);

CREATE INDEX IF NOT EXISTS orders_account ON orders(account_id, created_at DESC);
-- A varredura procura exatamente por isto: pendentes, mais antigos primeiro.
CREATE INDEX IF NOT EXISTS orders_pending ON orders(status, created_at);
CREATE INDEX IF NOT EXISTS orders_provider_ref ON orders(provider_ref);

-- Tudo que o provedor disse, cru, antes de qualquer coisa ser acreditada.
CREATE TABLE IF NOT EXISTS payment_events (
  event_id   TEXT PRIMARY KEY,               -- id do pagamento na Mercado Pago
  order_id   TEXT,
  status     TEXT,
  raw        TEXT NOT NULL,
  source     TEXT NOT NULL,                  -- webhook | verify | reconcile
  created_at INTEGER NOT NULL
);

-- Freio de tentativa. Uma linha por (chave, janela); a janela é um minuto.
-- Sem isto, /auth/login é um teste de senhas com 310.000 iterações pagas pelo
-- servidor - caro para nós, barato para quem tenta.
CREATE TABLE IF NOT EXISTS throttle (
  key        TEXT    NOT NULL,
  window_at  INTEGER NOT NULL,
  hits       INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_at)
);

-- ── recuperação de senha ──────────────────────────────────────────────────
-- Um pedido de "esqueci minha senha", enquanto ele vale.
--
-- O que está GRAVADO é o sha256 do token, nunca o token. A diferença importa:
-- quem lê esta tabela - um vazamento de banco, um backup esquecido, uma
-- consulta de suporte - não consegue trocar a senha de ninguém com o que
-- encontra aqui. O token em claro existe em dois lugares: na URL que foi para
-- a caixa de entrada do dono da conta, e na memória do Worker durante a
-- requisição que o criou.
--
-- Por isso o hash é a CHAVE PRIMÁRIA: a busca é pelo hash do que chegou, e
-- não existe consulta que responda "me dê um token válido do fulano".
--
-- `used_at` é o consumo. A linha não é apagada ao ser usada porque a pergunta
-- "essa senha foi trocada por um link de recuperação, e quando?" é exatamente
-- a que se faz depois de uma conta invadida.
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT    PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at    INTEGER,
  -- De onde veio o PEDIDO. Serve para investigar, não para decidir nada: quem
  -- pede não precisa ser quem clica (pediu no computador, abriu o e-mail no
  -- celular - e esse é o caso comum, não a exceção).
  request_ip TEXT    NOT NULL DEFAULT ''
);

-- Para invalidar de uma vez os pedidos abertos de uma conta, que é o que
-- acontece assim que a senha dela muda, por qualquer caminho.
CREATE INDEX IF NOT EXISTS password_resets_abertos
  ON password_resets(account_id) WHERE used_at IS NULL;

-- ── confirmação de e-mail ─────────────────────────────────────────────────
-- Prova de que quem criou a conta recebe o e-mail dela.
--
-- Sem isto qualquer pessoa cria uma conta com o endereço de outra, e a dona
-- do endereço só descobre quando tenta se cadastrar e ouve "já existe uma
-- conta com esse e-mail". O e-mail de confirmação chega a ela - e é ele que
-- avisa, se não foi ela quem criou, como tomar a conta de volta.
--
-- Uma linha por link enviado. `confirmed_at` preenchido é a prova, e ela vale
-- para o par (conta, endereço): o dia em que o e-mail da conta mudar, a prova
-- antiga não confirma o endereço novo.
--
-- Como em `password_resets`, o que está gravado é o sha256 do token, e o hash
-- é a chave primária. Uma recuperação de senha concluída também prova a caixa
-- de entrada, e grava aqui uma linha já confirmada, com `reset:` na frente do
-- hash para não colidir com um link de confirmação.
--
-- Tabela nova (24/09/2026): aplicar com
--   npx wrangler d1 execute hebraico-fluente --file=worker/schema.sql --remote
-- Enquanto ela não existe, o site funciona igual e só não confirma ninguém -
-- `/api/health` reporta `verificacao: false`.
CREATE TABLE IF NOT EXISTS email_verifications (
  token_hash   TEXT    PRIMARY KEY,
  account_id   INTEGER NOT NULL REFERENCES accounts(id),
  email        TEXT    NOT NULL,
  created_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL,
  confirmed_at INTEGER
);

-- "Esta conta tem o e-mail confirmado?" é perguntado a cada /api/me.
CREATE INDEX IF NOT EXISTS email_verifications_conta
  ON email_verifications(account_id, email);

-- Trilha do que mexeu em acesso. É o que responde "por que essa pessoa perdeu
-- o curso?" três meses depois, quando ninguém lembra.
CREATE TABLE IF NOT EXISTS access_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER,
  action     TEXT NOT NULL,
  detail     TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

-- Para a pergunta "o último e-mail de senha saiu ou não?", que /api/health
-- responde. Sem o índice é uma varredura da trilha inteira, e a trilha só
-- cresce.
CREATE INDEX IF NOT EXISTS access_log_acao ON access_log(action, id DESC);

-- ── convites ──────────────────────────────────────────────────────────────
-- Acesso concedido a um E-MAIL antes de existir uma conta com ele.
--
-- Serve ao caso comum de presentear: cortesia para uma amiga, acesso para
-- quem pagou por fora, aluno convidado para testar. Sem isto, presentear
-- exige coordenação - a pessoa se cadastra, esbarra na tela de "você não tem
-- este curso", avisa, e só então alguém libera. Com isto, ela cria a conta e
-- o curso já está lá.
--
-- O convite é CONSUMIDO no cadastro (`used_at`), nunca apagado: quem deu o
-- presente precisa continuar podendo ver que deu, e quando foi usado.
CREATE TABLE IF NOT EXISTS invites (
  email       TEXT    NOT NULL,
  course_slug TEXT    NOT NULL,
  months      INTEGER NOT NULL DEFAULT 12,
  note        TEXT    NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL,
  used_at     INTEGER,
  PRIMARY KEY (email, course_slug)
);

CREATE INDEX IF NOT EXISTS invites_pendentes ON invites(email) WHERE used_at IS NULL;

-- ── progresso ─────────────────────────────────────────────────────────────
-- O estado de aprendizagem do aluno, do lado do servidor.
--
-- Um BLOB de JSON e não vinte tabelas normalizadas, por três motivos que
-- valem mais do que a elegância do modelo:
--
--  1. Ninguém consulta isto por dentro. O servidor nunca pergunta "quem
--     domina o Shin"; ele guarda e devolve. Normalizar pagaria o custo de um
--     esquema sem comprar nenhuma consulta.
--  2. A forma do estado muda com o curso, e ela já tem migração versionada no
--     app (lib/state/migrate.ts). Uma segunda migração, em SQL, que tem de
--     concordar com a primeira, é a garantia de que um dia elas discordam.
--  3. Uma linha por aluno é uma escrita por sincronização, e o plano gratuito
--     do Workers dá 10 ms de CPU por requisição.
--
-- `rev` é o que impede um aparelho de apagar o outro: toda escrita declara a
-- revisão que leu, e o servidor recusa (409) quem escreve por cima de uma
-- revisão que já mudou. Quem levou 409 funde e tenta de novo - a fusão é
-- monotônica, então repetir é seguro. Ver app/src/lib/state/merge.ts.
CREATE TABLE IF NOT EXISTS progress (
  account_id INTEGER PRIMARY KEY REFERENCES accounts(id),
  state      TEXT    NOT NULL,              -- LearnerState serializado
  version    INTEGER NOT NULL DEFAULT 2,    -- STATE_VERSION de quem gravou
  rev        INTEGER NOT NULL DEFAULT 1,    -- sobe a cada escrita aceita
  updated_at INTEGER NOT NULL
);

-- ── registros de acesso (Marco Civil da Internet, art. 15) ────────────────
-- O provedor de aplicação constituído como pessoa jurídica, com fins
-- econômicos, tem de guardar os registros de acesso à aplicação - data e
-- hora de uso a partir de um endereço IP - por SEIS MESES, em sigilo. É o
-- que uma ordem judicial pede quando alguém usa a conta de outra pessoa.
--
-- Uma linha por entrada na conta: cadastro, login e senha redefinida (que
-- também entra). O IP é o inteiro, como a Cloudflare o entrega - não o /64
-- dos freios. Fica 190 dias (seis meses mais uma folga) e a varredura de 5
-- em 5 min apaga o resto: guardar além do exigido seria dado pessoal sem
-- finalidade (LGPD, art. 6º, III).
--
-- NÃO é apagado quando a conta é apagada: é obrigação legal (LGPD, art. 16,
-- I), e a conta apagada é esvaziada, não removida, então a referência vale.
--
-- Sem AUTOINCREMENT de propósito: ele custa uma escrita a mais por linha
-- (a tabela sqlite_sequence), e aqui nada depende de ids nunca reusados.
CREATE TABLE IF NOT EXISTS registros_acesso (
  id         INTEGER PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  evento     TEXT    NOT NULL,              -- 'cadastro' | 'entrada' | 'senha-redefinida'
  ip         TEXT    NOT NULL,
  criado_em  INTEGER NOT NULL
);

-- Para a faxina, que apaga por idade.
CREATE INDEX IF NOT EXISTS registros_acesso_idade ON registros_acesso(criado_em);

-- ── desistência da compra (CDC, art. 49; Decreto 7.962/2013, art. 5º) ─────
-- O pedido de desistência feito pelo próprio site - "pela mesma ferramenta
-- utilizada para a contratação", como o decreto exige. Uma linha por pedido
-- de compra: pedir de novo não cria outra, e o momento do primeiro pedido é
-- o que conta para o prazo.
--
-- Desde 28/09/2026 o estorno é pedido à Mercado Pago pelo próprio site, na
-- hora (ver a tabela `estornos`, no fim deste arquivo); quando ela confirma,
-- `applyPayment` fecha o acesso sozinho. Esta tabela é a prova de QUANDO a
-- pessoa pediu - que é o que decide se estava dentro dos sete dias.
CREATE TABLE IF NOT EXISTS arrependimentos (
  order_id   TEXT    PRIMARY KEY REFERENCES orders(id),
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  pedido_em  INTEGER NOT NULL,
  ip         TEXT    NOT NULL DEFAULT ''
);

-- ── gravações do painel (/admin/gravar) ───────────────────────────────────
-- O áudio que o dono do curso grava pelo navegador. Uma linha por clipe, com
-- o id do catálogo (`he-xxxxxxxx`, data/audio.json) como chave: gravar de
-- novo SUBSTITUI. O Worker serve daqui antes do arquivo do git, no mesmo
-- endereço /audio/<id>.mp3 - ver worker/src/api/audio.js.
--
-- `dados` é o arquivo como o navegador gravou (audio/mp4 no Safari; WAV no
-- navegador que só grava WebM). `inicio_ms`/`fim_ms` é onde a voz começa e
-- termina dentro dele, medido pelo painel; o curso toca só esse trecho.
--
-- `autor` é o e-mail, e não uma chave para `accounts`, de propósito: a
-- gravação é conteúdo do curso, e não pode travar nem sumir quando uma conta
-- é apagada.
CREATE TABLE IF NOT EXISTS gravacoes (
  audio_id      TEXT    PRIMARY KEY,
  tipo          TEXT    NOT NULL,
  dados         BLOB    NOT NULL,
  tamanho       INTEGER NOT NULL,
  inicio_ms     INTEGER,
  fim_ms        INTEGER,
  duracao_ms    INTEGER,
  autor         TEXT    NOT NULL,
  atualizado_em INTEGER NOT NULL
);

-- ── relatos de erro (o botão "Achei um erro" dos exercícios) ─────────────
-- DESLIGADO em 27/09/2026, a pedido do dono do curso: o botão, a rota que
-- recebia (/api/relatos) e o painel saíram. A tabela fica só para não
-- apagar em silêncio o que já estava no banco de produção; nada mais lê
-- nem grava aqui. Apagá-la é um `DROP TABLE relatos` de propósito.
-- Uma linha por relato. `foto` é o exercício como o aluno o viu (JSON:
-- enunciado, hebraico, alternativas, a certa e a escolhida) - os exercícios
-- são sorteados, e sem a foto o relato não aponta para nada.
--
-- SEM conta, de propósito: o relato exige sessão, mas não guarda quem mandou.
-- Não é dado pessoal, não trava a exclusão de conta e não entra na limpeza
-- das contas de teste.
CREATE TABLE IF NOT EXISTS relatos (
  id           INTEGER PRIMARY KEY,
  exercicio    TEXT    NOT NULL,
  tipo         TEXT    NOT NULL DEFAULT '',
  letra        TEXT    NOT NULL DEFAULT '',
  rota         TEXT    NOT NULL DEFAULT '',
  motivo       TEXT    NOT NULL,              -- resposta | hebraico | audio | confuso | outro
  comentario   TEXT    NOT NULL DEFAULT '',
  foto         TEXT    NOT NULL,
  criado_em    INTEGER NOT NULL,
  resolvido_em INTEGER
);
CREATE INDEX IF NOT EXISTS relatos_abertos ON relatos (resolvido_em, criado_em);

-- O teste A/B da capa (28/09/2026). Só TOTAIS por dia e versão: quantos viram
-- o hero, clicaram no botão, chegaram ao checkout e compraram. Nenhuma coluna
-- identifica pessoa. Ver worker/src/api/ab.js.
CREATE TABLE IF NOT EXISTS ab_contagens (
  exp      TEXT    NOT NULL,
  variante TEXT    NOT NULL,
  evento   TEXT    NOT NULL,
  dia      TEXT    NOT NULL,
  n        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (exp, variante, evento, dia)
);

-- `ab_compras` (01/10/2026, SEC-A-008): os pedidos pagos que já viraram uma
-- `compra` no teste. Só o id do pedido, para contar cada um uma vez; a
-- versão vai só para o total em `ab_contagens`. Uma `compra` sem pedido pago
-- da própria sessão não conta (api/ab.js). 60 dias de guarda (alertas.js).
CREATE TABLE IF NOT EXISTS ab_compras (
  order_id TEXT    PRIMARY KEY,
  em       INTEGER NOT NULL
);

-- ── estorno automático da desistência (28/09/2026) ────────────────────────
-- Quando o aluno desiste pelo site dentro dos sete dias, o próprio site pede o
-- estorno à Mercado Pago (POST /v1/payments/{id}/refunds). Esta tabela é o
-- estado desse pedido de estorno, uma linha por pedido de compra:
--
--   pendente   ainda não conseguimos pedir; a varredura tenta de novo em
--              `proxima_em` (intervalo crescente)
--   pedido     a Mercado Pago aceitou o estorno; falta ela confirmar, e aí
--              `applyPayment` fecha o acesso como sempre
--   concluido  o pedido de compra está `refunded`
--   manual     não há como estornar sozinho (PIX direto, liberação à mão,
--              sem credencial): o dono estorna, e recebe alerta diário
--   erro       oito tentativas falharam: vira manual, com alerta diário
--
-- Tabela nova, e não colunas novas em `arrependimentos`: a publicação aplica
-- este arquivo com CREATE IF NOT EXISTS, e um ALTER TABLE nunca chegaria à
-- produção (auditoria de 28/09, INFRA-005).
CREATE TABLE IF NOT EXISTS estornos (
  order_id      TEXT    PRIMARY KEY REFERENCES orders(id),
  payment_id    TEXT    NOT NULL DEFAULT '',
  estado        TEXT    NOT NULL,
  tentativas    INTEGER NOT NULL DEFAULT 0,
  proxima_em    INTEGER NOT NULL DEFAULT 0,
  refund_id     TEXT    NOT NULL DEFAULT '',
  erro          TEXT    NOT NULL DEFAULT '',
  criado_em     INTEGER NOT NULL,
  atualizado_em INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS estornos_estado ON estornos (estado, proxima_em);

-- ── monitoramento (28/09/2026) ────────────────────────────────────────────
-- `batimentos`: quando a varredura de 5 em 5 minutos rodou pela última vez.
-- /api/health responde `monitor: false` se ela parou, e o monitor externo de
-- disponibilidade avisa o dono. Um cron que parou era indistinguível de um
-- cron sem trabalho (auditoria, INFRA-002/INFRA-013).
CREATE TABLE IF NOT EXISTS batimentos (
  nome TEXT    PRIMARY KEY,
  em   INTEGER NOT NULL
);
-- Desde 01/10/2026 (SEC-A-005) a linha `backup` é o carimbo do backup
-- diário: scripts/backup-nuvem.sh a grava depois de guardar a cópia no R2, e
-- o alerta diário avisa quando ela passa de 36 h.

-- `respostas_5xx`: quantas respostas 5xx o Worker deu, por hora (01/10/2026,
-- SEC-A-005). Uma linha por hora, não por erro, então uma rajada de erros
-- não enche o banco; 7 dias de guarda (alertas.js). Conta o que o Worker
-- respondeu: um erro do próprio D1 não consegue se contar aqui, e o número
-- completo (com os erros da plataforma) fica no painel da Cloudflare.
CREATE TABLE IF NOT EXISTS respostas_5xx (
  hora INTEGER PRIMARY KEY,   -- início da hora, em ms
  n    INTEGER NOT NULL
);

-- `avisos`: cada alerta mandado ao dono, pela chave que o deduplica (por
-- exemplo `desistencias:2026-09-28`, `operacao:2026-09-28T14`). Garante um
-- lembrete por dia e um alerta de erro por hora, e não um a cada 5 minutos.
CREATE TABLE IF NOT EXISTS avisos (
  chave      TEXT    PRIMARY KEY,
  enviado_em INTEGER NOT NULL
);

-- Os avisos de fim de acesso ao aluno (01/10/2026, auditoria PAY-B-004):
-- 30 dias antes, 7 dias antes e no dia do fim (`marco` = d30 | d7 | fim).
-- Uma linha por aviso mandado; a chave inclui o vencimento, então uma
-- renovação muda a data e os marcos recomeçam, e a varredura que roda de
-- novo não repete o mesmo aviso. Ver worker/src/vencimento.js.
CREATE TABLE IF NOT EXISTS avisos_vencimento (
  account_id  INTEGER NOT NULL,
  course_slug TEXT    NOT NULL,
  expires_at  INTEGER NOT NULL,
  marco       TEXT    NOT NULL,
  enviado_em  INTEGER NOT NULL,
  PRIMARY KEY (account_id, course_slug, expires_at, marco)
);

-- Quem pediu, no perfil, um e-mail quando o próximo curso abrir (28/09/2026,
-- auditoria LEGAL-019). A linha existir É o consentimento; sair apaga a
-- linha. Ver worker/src/api/novidades.js.
CREATE TABLE IF NOT EXISTS novidades (
  account_id INTEGER PRIMARY KEY REFERENCES accounts(id),
  criado_em  INTEGER NOT NULL
);

-- Quem pediu, no perfil, o lembrete para estudar (28/10/2026). A linha
-- existir É o consentimento; sair apaga a linha. `ultimo_dia` é o último dia
-- (Brasília, YYYY-MM-DD) em que a varredura cuidou da conta; `seguidos`,
-- quantos lembretes saíram desde a última vez que a pessoa estudou (no
-- terceiro, param até ela voltar). Ver worker/src/lembrete.js.
CREATE TABLE IF NOT EXISTS lembretes_estudo (
  account_id INTEGER PRIMARY KEY REFERENCES accounts(id),
  criado_em  INTEGER NOT NULL,
  ultimo_dia TEXT,
  seguidos   INTEGER NOT NULL DEFAULT 0
);

-- Uma execução por vez da varredura de 5 em 5 minutos (28/09/2026,
-- auditoria INFRA-013). `ate` = até quando a trava vale; ver pegarTrava em
-- worker/src/lib/db.js.
CREATE TABLE IF NOT EXISTS travas (
  nome TEXT    PRIMARY KEY,
  ate  INTEGER NOT NULL
);

-- As migrações que já rodaram (28/09/2026, auditoria INFRA-005). Este
-- arquivo só CRIA o que não existe; uma coluna nova numa tabela que já está
-- no ar é um arquivo em worker/migrations/, aplicado uma vez só pela
-- publicação. Ver worker/migrations/README.md.
CREATE TABLE IF NOT EXISTS migracoes (
  nome       TEXT    PRIMARY KEY,
  aplicado_em INTEGER NOT NULL
);

-- A marca invisível de cada conta no conteúdo do curso (29/09/2026, a
-- pedido do dono: rastrear uma cópia pirata até a conta de onde saiu). Um
-- número aleatório, sem relação com o id nem com o e-mail; sai apagado com
-- a conta. Ver worker/src/lib/marca.js.
CREATE TABLE IF NOT EXISTS marcas (
  account_id INTEGER PRIMARY KEY REFERENCES accounts(id),
  marca      TEXT    NOT NULL UNIQUE,
  criado_em  INTEGER NOT NULL
);

-- Os aparelhos com sessão aberta em cada conta (29/09/2026). No máximo
-- três: um login num quarto encerra o mais antigo. O id vai no cookie
-- (`ap`); apagar a linha desconecta aquele aparelho. Nada do aparelho em
-- si é guardado - nem modelo, nem IP. Ver worker/src/lib/aparelhos.js.
CREATE TABLE IF NOT EXISTS aparelhos (
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  aparelho   TEXT    NOT NULL,
  criado_em  INTEGER NOT NULL,
  PRIMARY KEY (account_id, aparelho)
);

-- Os depoimentos dos alunos (29/09/2026). Um por conta, escrito pelo próprio
-- aluno em /depoimento. Só vai ao ar com `publicar` = 1 (a autorização do
-- aluno) E `estado` = 'aprovado' (a leitura do dono). Retirar a autorização
-- apaga a linha. Ver worker/src/api/depoimentos.js.
CREATE TABLE IF NOT EXISTS depoimentos (
  account_id    INTEGER PRIMARY KEY REFERENCES accounts(id),
  texto         TEXT    NOT NULL,
  -- como a pessoa quer aparecer: 'nome' (nome e cidade), 'iniciais', 'anonimo'
  forma         TEXT    NOT NULL,
  nome_publico  TEXT    NOT NULL DEFAULT '',
  cidade        TEXT    NOT NULL DEFAULT '',
  publicar      INTEGER NOT NULL DEFAULT 0,
  contato       INTEGER NOT NULL DEFAULT 0,
  -- 'novo' (o dono ainda não leu), 'aprovado', 'recusado'
  estado        TEXT    NOT NULL DEFAULT 'novo',
  criado_em     INTEGER NOT NULL,
  atualizado_em INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS depoimentos_estado ON depoimentos(estado, atualizado_em);

-- Fale comigo (06/11/2026): as dúvidas e os comentários dos alunos para o
-- dono. Ver worker/src/api/mensagens.js. Saem com a conta.
CREATE TABLE IF NOT EXISTS mensagens (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id    INTEGER NOT NULL REFERENCES accounts(id),
  tipo          TEXT    NOT NULL,              -- 'duvida' | 'comentario'
  texto         TEXT    NOT NULL,
  contexto      TEXT,                          -- 'modulo-N' quando veio do fim de um módulo
  criado_em     INTEGER NOT NULL,
  respondida_em INTEGER                        -- o dono marcou como respondida
);
CREATE INDEX IF NOT EXISTS mensagens_conta ON mensagens(account_id, criado_em);
CREATE INDEX IF NOT EXISTS mensagens_abertas ON mensagens(respondida_em, criado_em);

-- O aceite dos Termos de Uso no cadastro (30/09/2026): quando e qual versão
-- (a data de `politicas.atualizadoEm` em data/empresa.json). Nada além disso:
-- nem IP, nem aparelho. Sai com a conta (deleteAccount).
CREATE TABLE IF NOT EXISTS aceites (
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  documento  TEXT    NOT NULL,
  versao     TEXT    NOT NULL,
  aceito_em  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS aceites_conta ON aceites(account_id);

-- Onde os alunos erram e onde param (30/09/2026): só contadores por dia,
-- sem conta, e-mail, IP ou horário. Chaves `r|tipo|lição|1` (resposta
-- certa), `r|tipo|lição|0` (errada) e `e|lição|etapa` (etapa concluída pela
-- primeira vez). Saem depois de um ano. Ver worker/src/api/estatisticas.js.
CREATE TABLE IF NOT EXISTS estatisticas (
  dia   TEXT    NOT NULL,
  chave TEXT    NOT NULL,
  n     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, chave)
);

-- O código de seis dígitos do segundo fator do administrador (30/09/2026):
-- só o hash, 10 minutos, 5 tentativas; um por conta, o novo substitui o
-- anterior. Ver worker/src/api/admin-codigo.js e lib/admin.js.
CREATE TABLE IF NOT EXISTS admin_codigos (
  account_id INTEGER PRIMARY KEY REFERENCES accounts(id),
  hash       TEXT    NOT NULL,
  expira     INTEGER NOT NULL,
  tentativas INTEGER NOT NULL DEFAULT 0
);

-- "Como foi esta lição?" (05/10/2026). Uma linha por avaliação, ANÔNIMA: a
-- lição (id da letra), a nota (facil | ok | dificil), o comentário opcional e
-- a data, sem a conta - como os relatos. Ver worker/src/api/avaliacoes.js.
CREATE TABLE IF NOT EXISTS avaliacoes_licao (
  id         INTEGER PRIMARY KEY,
  licao      TEXT    NOT NULL,
  nota       TEXT    NOT NULL,
  comentario TEXT    NOT NULL DEFAULT '',
  criado_em  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS avaliacoes_licao_data ON avaliacoes_licao (criado_em);

-- O exame final do A1, corrigido no servidor (06/10/2026). Uma linha por
-- prova sorteada: o sorteio (que itens e em que ordem saíram as opções), e,
-- depois de entregue, a nota e as partes. É desta tabela, e não do progresso
-- que o navegador guarda, que sai a aprovação. Ver worker/src/api/exame-a1.js.
CREATE TABLE IF NOT EXISTS provas_a1 (
  id          TEXT    PRIMARY KEY,
  account_id  INTEGER NOT NULL REFERENCES accounts(id),
  sorteio     TEXT    NOT NULL,
  criada_em   INTEGER NOT NULL,
  entregue_em INTEGER,
  nota        REAL,
  partes      TEXT
);
CREATE INDEX IF NOT EXISTS provas_a1_conta ON provas_a1 (account_id, criada_em);

-- O certificado: um por conta e por curso, emitido só com uma prova
-- aprovada em provas_a1. O id é o código que se confere na página pública
-- /verificar-certificado/, que mostra o nome, o curso e a data, e só se
-- `publico` = 1 (o aluno pode desligar). Ver worker/src/api/exame-a1.js.
CREATE TABLE IF NOT EXISTS certificados (
  id          TEXT    PRIMARY KEY,
  account_id  INTEGER NOT NULL REFERENCES accounts(id),
  curso       TEXT    NOT NULL,
  nome        TEXT    NOT NULL,
  nota        REAL    NOT NULL,
  aprovado_em INTEGER NOT NULL,
  emitido_em  INTEGER NOT NULL,
  publico     INTEGER NOT NULL DEFAULT 1,
  UNIQUE (account_id, curso)
);

-- Os lembretes dos primeiros dias depois da compra (23/10/2026, plano de
-- marketing): um marco (d1, d3, d7) por pedido, uma vez. Ver
-- worker/src/ativacao.js.
CREATE TABLE IF NOT EXISTS avisos_ativacao (
  order_id    TEXT    NOT NULL,
  marco       TEXT    NOT NULL,
  enviado_em  INTEGER NOT NULL,
  PRIMARY KEY (order_id, marco)
);

-- A lista de interessados (23/10/2026, plano de marketing, decisão 1): quem
-- pediu, com consentimento, as próximas letras por e-mail ou o aviso de um
-- produto "Em breve". Só vale depois de confirmar pelo link do e-mail
-- (`confirmado_em`); sem confirmar, a linha some em 7 dias. `interesses` é a
-- lista separada por vírgula (curso, israel, raizes, a1). `passo` é a
-- posição na sequência de e-mails das letras (0 = fora dela). Sair grava
-- `saiu_em` e não manda mais nada. Ver worker/src/api/interessados.js.
CREATE TABLE IF NOT EXISTS interessados (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE,
  interesses    TEXT    NOT NULL DEFAULT '',
  origem        TEXT,
  criado_em     INTEGER NOT NULL,
  confirmado_em INTEGER,
  saiu_em       INTEGER,
  passo         INTEGER NOT NULL DEFAULT 0,
  proximo_em    INTEGER
);
CREATE INDEX IF NOT EXISTS interessados_proximo ON interessados(passo, proximo_em);
