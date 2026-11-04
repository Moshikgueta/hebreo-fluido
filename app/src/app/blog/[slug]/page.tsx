import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { meta, url } from '@/lib/seo';
import { PageHead, Section } from '@/components/platform/Section';
import { FaixaCta } from '@/components/platform/ProximoPasso';
import { artigo, artigos, semMarcas } from '@/lib/blog';
import { jsonLdTexto, migalhas } from '@/lib/jsonld';
import { LOCALE_INTL } from '@/i18n';
import { BlocosDoArtigo, Texto } from '../BlocosDoArtigo';
import { tx } from '@/i18n/telas/blog';
import { tx as txGeral } from '@/i18n/telas/geral';

/* Um artigo do blog (29/10/2026). Só existem as páginas dos aprovados. */

/* Sem artigo aprovado, o Next (output: export) recusa uma rota dinâmica sem
   parâmetros. O `_` é só um lugar vazio: a página dele é o 404, com noindex. */
const VAZIO = '_';
export function generateStaticParams() {
  const lista = artigos().map(a => ({ slug: a.slug }));
  return lista.length ? lista : [{ slug: VAZIO }];
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = artigo(slug);
  if (!a) return {};
  return meta({ rota: `/blog/${a.slug}`, title: `${a.titulo} - ${txGeral.marca}`, description: semMarcas(a.descricao), tipo: 'article' });
}

const dataBr = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString(LOCALE_INTL, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export default async function ArtigoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = artigo(slug);
  if (!a) notFound();
  const outros = artigos().filter(o => o.slug !== a.slug).slice(0, 3);
  const dado = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.titulo,
    description: semMarcas(a.descricao),
    dateModified: a.atualizadoEm,
    inLanguage: 'pt-BR',
    mainEntityOfPage: url(`/blog/${a.slug}`),
    author: { '@type': 'Organization', name: txGeral.marca, url: url('/') },
    publisher: { '@type': 'Organization', name: txGeral.marca, url: url('/') }
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdTexto(dado) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdTexto(migalhas([
        { nome: tx.blog, rota: '/blog' }, { nome: a.titulo, rota: `/blog/${a.slug}` }
      ])) }} />
      <PageHead trilha={[{ nome: tx.blog, href: '/blog/' }, { nome: a.titulo }]} titlePt={a.titulo}>
        <p className="font-ui text-[14px] text-ink-muted m-0">{tx.atualizado(dataBr(a.atualizadoEm))}</p>
      </PageHead>
      <Section labelledBy="resumo">
        <div className="grid gap-8">
          {/* A resposta curta no topo: é o trecho que a busca e a IA citam. */}
          <div className="max-w-[66ch] rounded-[16px] border-l-[3px] border-[var(--teal)] bg-[var(--teal-soft)] px-5 py-4">
            <p id="resumo" className="font-ui text-[12.5px] font-bold uppercase tracking-[.1em] text-[var(--teal-ink)] m-0 mb-1.5">{tx.emResumo}</p>
            <p className="font-ui text-[17px] sm:text-[18px] leading-[1.65] text-ink m-0"><Texto t={a.resumo} /></p>
          </div>
          <BlocosDoArtigo blocos={a.blocos} />
        </div>
      </Section>
      {outros.length > 0 && (
        <Section tone="surface" labelledBy="mais">
          <h2 id="mais" className="font-display text-[24px] font-semibold text-ink m-0 mb-4">{tx.maisArtigos}</h2>
          <ul className="grid gap-3 sm:grid-cols-3 list-none p-0 m-0">
            {outros.map(o => (
              <li key={o.slug}>
                <Link href={`/blog/${o.slug}/`} className="block font-ui text-[16px] font-semibold text-[var(--teal-ink)] underline underline-offset-[3px]">
                  {o.titulo}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section labelledBy="cta">
        <FaixaCta titulo={tx.ctaTitulo} linha={<>{tx.ctaLinha}</>} onde={`blog:${a.slug}`} />
      </Section>
    </>
  );
}
