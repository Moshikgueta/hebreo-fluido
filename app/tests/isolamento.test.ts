/* Este repositório é o do site em espanhol, SEPARADO do brasileiro
 * (Moshikgueta/hebraicofluente): Worker, banco e domínio próprios.
 *
 * O perigo que estes testes travam é concreto: o repositório nasceu como
 * cópia do brasileiro, e uma publicação daqui com um nome de lá sobrescreve o
 * site brasileiro (o nome do Worker), toma o domínio dele (as routes) ou grava
 * no banco dos alunos de lá (o nome e o id do D1). Ver CLAUDE.md, "Este
 * repositório".
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const raiz = (p: string) => new URL(`../../${p}`, import.meta.url);
const ler = (p: string) => readFileSync(raiz(p), 'utf8');
/* Sem comentários: um nome de lá citado numa explicação não publica nada. */
const semComentarios = (s: string) => s.split('\n').filter(l => !/^\s*(#|\/\/|\*)/.test(l)).join('\n');

const NOME_DE_LA = 'hebraico-fluente';
const DOMINIO_DE_LA = 'hebraicofluente.com.br';
const BANCO_DE_LA = 'af5fad4b-8a1d-4512-8024-f13d698ddd73';

describe('o wrangler.toml é deste site, não do brasileiro', () => {
  const toml = semComentarios(ler('wrangler.toml'));

  it('o Worker tem nome próprio', () => {
    expect(toml.match(/^name\s*=\s*"([^"]+)"/m)?.[1]).toBe('hebreo-fluido');
  });

  it('o banco é outro: outro nome e nunca o id de produção de lá', () => {
    expect(toml).toMatch(/database_name\s*=\s*"hebreo-fluido"/);
    expect(toml).not.toContain(BANCO_DE_LA);
  });

  it('nenhuma rota aponta para o domínio de lá, nem o SITE_ORIGIN', () => {
    const rotas = [...toml.matchAll(/pattern\s*=\s*"([^"]+)"/g)].map(m => m[1]!);
    for (const r of rotas) expect(r, r).not.toContain(DOMINIO_DE_LA);
    expect(toml.match(/^SITE_ORIGIN\s*=\s*"([^"]+)"/m)?.[1]).not.toContain(DOMINIO_DE_LA);
  });

  it('é o site em espanhol: o export em espanhol e LOCALE=es', () => {
    expect(toml).toMatch(/directory\s*=\s*"\.\/app\/out-es"/);
    expect(toml).toMatch(/^LOCALE\s*=\s*"es"/m);
  });

  it('não há wrangler.en.toml nem wrangler.es.toml (só o deste repositório)', () => {
    expect(existsSync(raiz('wrangler.en.toml'))).toBe(false);
    expect(existsSync(raiz('wrangler.es.toml'))).toBe(false);
  });
});

describe('nenhum script nem workflow mexe no Worker ou no banco de lá', () => {
  const arquivos = [
    ...readdirSync(raiz('.github/workflows')).map(f => `.github/workflows/${f}`),
    ...readdirSync(raiz('scripts')).filter(f => /\.(sh|mjs|js)$/.test(f)).map(f => `scripts/${f}`),
    'tools/exportar-gravacoes.mjs', 'worker/e2e.sh',
    /* Os atalhos do package.json e os roteiros de app/ que falam com o D1
       local: `npm run db:init` com o nome de lá aplicaria o esquema no banco
       dos alunos brasileiros (28/10/2026). */
    'package.json',
    ...readdirSync(raiz('app')).filter(f => f.endsWith('.mjs')).map(f => `app/${f}`)
  ];

  it.each(arquivos)('%s', arquivo => {
    const codigo = semComentarios(ler(arquivo));
    expect(codigo).not.toMatch(new RegExp(`(d1 (execute|export|create)|DB_NAME=|'d1', '[a-z]+',)\\s*['"]?${NOME_DE_LA}\\b`));
    expect(codigo).not.toContain(BANCO_DE_LA);
  });
});

describe('a trava: nada roda contra a Cloudflare sem HEBREO_PUBLICAR', () => {
  /* criar-banco.yml é a exceção de propósito: cria o banco DESTE site, uma vez, e não publica nada. */
  const workflows = readdirSync(raiz('.github/workflows')).filter(f => f !== 'criar-banco.yml');

  it.each(workflows)('%s', f => {
    const yml = ler(`.github/workflows/${f}`);
    const jobs = yml.slice(yml.indexOf('\njobs:'));
    const nomes = [...jobs.matchAll(/^ {2}([a-z-]+):\s*$/gm)].map(m => m[1]!);
    expect(nomes.length, f).toBeGreaterThan(0);
    for (const job of nomes) {
      const corpo = jobs.slice(jobs.indexOf(`\n  ${job}:`) + 1).split(/\n {2}[a-z-]+:\s*\n/)[0]!;
      expect(corpo, `${f}: ${job}`).toMatch(/if: \$\{\{ vars\.HEBREO_PUBLICAR == 'true'/);
    }
  });

  /* O banco hebreo-fluido existe desde 29/10/2026 e o backup diário foi ligado em
     03/11/2026: sem ele, o alerta de saúde do Worker avisava todo dia. O
     agendamento continua atrás da trava (o job só roda com HEBREO_PUBLICAR). */
  it('o backup é diário e continua atrás da trava', () => {
    const yml = semComentarios(ler('.github/workflows/backup.yml'));
    expect(yml).toMatch(/^\s*schedule:/m);
    expect(yml).toContain("vars.HEBREO_PUBLICAR == 'true'");
  });
});
