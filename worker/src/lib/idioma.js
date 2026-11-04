/* O idioma do site e o de cada conta (PLANO-INGLES.md).
 * ─────────────────────────────────────────────────────────────────────────
 * Este é o repositório do site em inglês, com banco próprio: o
 * wrangler.toml daqui diz LOCALE = "en", e toda conta nasce em inglês. O
 * código veio do repositório brasileiro, onde os dois sites dividiam o banco;
 * por isso a conta ainda guarda o idioma (accounts.idioma, migração 0004) e
 * o e-mail do agendamento lê o idioma da conta. Com o banco separado, as duas
 * perguntas dão a mesma resposta, e o código continua certo para os dois.
 */

/** Os idiomas que o Worker conhece: 'en', 'es' (04/11/2026, PLANO-ESPANHOL.md)
    e o português, que é o resto. */
export const idiomaValido = x => (x === 'en' || x === 'es' ? x : 'pt');

/** Site de fora do Brasil (inglês ou espanhol): Paddle, dólar, 14 dias. */
export const exterior = idioma => idioma === 'en' || idioma === 'es';

/** 'en' ou 'es' no Worker do site naquele idioma, 'pt' em qualquer outro. */
export const idiomaDoWorker = env => idiomaValido(env && env.LOCALE);

/** O idioma de uma linha de `accounts`; conta sem a coluna é do site brasileiro. */
export const idiomaDaConta = conta => idiomaValido(conta && conta.idioma);

const semBarra = s => String(s || '').replace(/\/+$/, '');

/**
 * A origem dos links de um e-mail no idioma dado. O Worker de um idioma usa o
 * próprio SITE_ORIGIN; o brasileiro, mandando para uma conta do site em
 * inglês, usa SITE_ORIGIN_EN. Sem ela (o site em inglês ainda não publicado),
 * fica o SITE_ORIGIN: um link que abre o site errado ainda leva à conta certa.
 */
export function origemDoIdioma(env, idioma) {
  if (idioma === idiomaDoWorker(env)) return semBarra(env && env.SITE_ORIGIN);
  if (idioma === 'en') return semBarra((env && env.SITE_ORIGIN_EN) || (env && env.SITE_ORIGIN));
  if (idioma === 'es') return semBarra((env && env.SITE_ORIGIN_ES) || (env && env.SITE_ORIGIN));
  return semBarra((env && env.SITE_ORIGIN_PT) || (env && env.SITE_ORIGIN));
}

/* O nome da marca em cada site (04/11/2026, decisão do dono): o site em
   inglês se chama Hebrew Unlocked; o brasileiro continua Hebraico Fluente. */
export const MARCA = Object.freeze({ pt: 'Hebraico Fluente', en: 'Hebrew Unlocked' });

/** A marca no idioma dado. */
export const marcaDoIdioma = idioma => (idioma === 'en' ? MARCA.en : MARCA.pt);

/** O nome do curso no idioma: `titleEn` (ou `titleEs`) do catálogo, quando existe. */
export const tituloDoCurso = (curso, idioma, reserva = '') =>
  (idioma === 'en' && curso && curso.titleEn) || (idioma === 'es' && curso && curso.titleEs)
  || (curso && curso.titlePt) || reserva;

/**
 * O que o site em inglês não tem: os produtos que só existem em português
 * (Raízes, A1, o livro e a prévia dele), a "Meu nome em hebraico" (regras do
 * português, lib/recursos.ts do app) e os painéis do dono, que ficam no
 * site brasileiro (o banco é o mesmo). Página e API. O Worker em inglês
 * responde 404 a isso tudo; o brasileiro não olha esta lista.
 */
/* O site em espanhol usa a mesma lista: os mesmos produtos só existem em português. */
export const FORA_DO_SITE_EN =
  /^\/(raizes|a1|israel|previa|admin|meu-nome)(\/|$)|^\/api\/(admin|a1|livro|content\/(raizes|a1))(\/|$)/i;
