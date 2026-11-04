import type { NextConfig } from 'next';
import { readFileSync } from 'node:fs';

/* The whole course is static: 48 prerendered pages, and the only state is the
   learner's own, in their browser. So it exports to plain files and can be
   served from anywhere - no Node process, no server. */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Os módulos do layout raiz que o webpack copiava (ver `webpack` abaixo). */
export const BASE = /[\\/](content[\\/](course|courses|empresa)\.json|src[\\/]lib[\\/](catalog|content-publico|empresa|hebrew|raizes|state[\\/]raizes-estado|account[\\/](types|store|api))\.tsx?)$/;

/* O site em inglês é outra build do mesmo código (PLANO-INGLES.md), com o
   export em out-en, que o wrangler.toml deste repositório serve. A build
   sem a variável sai em português: é a dos testes. */
const EM_INGLES = process.env.NEXT_PUBLIC_LOCALE === 'en';
/* O site em espanhol (04/11/2026, PLANO-ESPANHOL.md): mesma ideia, export em out-es. */
const EM_ESPANHOL = process.env.NEXT_PUBLIC_LOCALE === 'es';

/* O endereço do site em inglês. A publicação passa NEXT_PUBLIC_SITE_ORIGIN
   (lido do wrangler.toml); sem ele, a build em inglês lê o mesmo
   SITE_ORIGIN do wrangler.toml deste repositório, e nunca cai no domínio
   brasileiro (o padrão de lib/seo.ts), que daria a cada página o endereço
   canônico e o cartão do link de outro site. */
function origemDoToml(arquivo = '../wrangler.toml'): string {
  try {
    const toml = readFileSync(new URL(arquivo, import.meta.url), 'utf8');
    return (toml.match(/^\s*SITE_ORIGIN\s*=\s*"([^"]+)"/m) || [])[1] || '';
  } catch { return ''; }
}
const ORIGEM_EN = EM_INGLES ? (process.env.NEXT_PUBLIC_SITE_ORIGIN || origemDoToml()) : '';
/* O espanhol lê a configuração do Worker dele: o wrangler.es.toml no
   repositório brasileiro, ou o wrangler.toml do repositório do site em
   espanhol (Moshikgueta/hebreo-fluido), quando ele diz LOCALE = "es". Sem
   domínio ainda, sem origem: lib/seo.ts usa o padrão, e a build é só para
   conferência. */
function tomlDoEspanhol(): string {
  for (const arquivo of ['../wrangler.es.toml', '../wrangler.toml']) {
    try {
      const toml = readFileSync(new URL(arquivo, import.meta.url), 'utf8');
      if (/^\s*LOCALE\s*=\s*"es"/m.test(toml)) return arquivo;
    } catch { /* sem o arquivo */ }
  }
  return '';
}
const TOML_ES = EM_ESPANHOL ? tomlDoEspanhol() : '';
const ORIGEM_ES = EM_ESPANHOL ? (process.env.NEXT_PUBLIC_SITE_ORIGIN || (TOML_ES ? origemDoToml(TOML_ES) : '')) : '';
const ORIGEM = ORIGEM_EN || ORIGEM_ES;

const nextConfig: NextConfig = {
  output: 'export',
  distDir: EM_INGLES ? 'out-en' : EM_ESPANHOL ? 'out-es' : undefined,
  /* Sempre definida, mesmo na build em português: variável NEXT_PUBLIC_ que
     não existe na build não é embutida, vira uma consulta no navegador, e aí
     o pacote leva os dois idiomas de cada tela (medido em 28/10/2026). Com
     o valor fixo, o minificador apaga o idioma que não vai ao ar. */
  env: { NEXT_PUBLIC_LOCALE: EM_INGLES ? 'en' : EM_ESPANHOL ? 'es' : 'pt', ...(ORIGEM ? { NEXT_PUBLIC_SITE_ORIGIN: ORIGEM } : {}) },
  basePath: basePath || undefined,
  reactStrictMode: true,
  /* Static export has no image optimiser. The only images here are the 27
     stroke-order SVGs, which need none. */
  images: { unoptimized: true },
  /* GitHub Pages resolves /a/b to /a/b/index.html, so directory-style URLs are
     what the export has to produce. */
  trailingSlash: true,
  /* Sem cópias repetidas (23/10/2026, velocidade no celular). O layout e a
     página são entradas separadas para o webpack, e um módulo pequeno usado
     pelas duas ficava abaixo do tamanho mínimo de pedaço e era COPIADO para
     as duas, baixadas na mesma página: uns 15 KB repetidos em toda visita.
     A lista abaixo junta esses módulos num pedaço só, `base`. Só entra aqui
     o que o layout raiz JÁ importa (tests/rotas-leves.test.ts confere), para
     nenhuma página passar a baixar algo que não usava. Uma regra geral
     (todo src/lib compartilhado, sem nome) tirava 3 KB a mais e dobrava o
     número de arquivos, o que no celular custa mais do que economiza. O
     conteúdo pago nunca chega ao pacote do navegador (tests/conteudo.test.ts). */
  webpack(config, { isServer }) {
    if (!isServer && config.optimization?.splitChunks) {
      const sc = config.optimization.splitChunks;
      sc.cacheGroups = {
        ...(sc.cacheGroups ?? {}),
        base: {
          test: BASE,
          name: 'base',
          chunks: 'all',
          enforce: true,
          priority: 50
        }
      };
    }
    return config;
  }
};

export default nextConfig;
