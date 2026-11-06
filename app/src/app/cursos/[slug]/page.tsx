import type { Metadata } from 'next';
import { tx as geral } from '@/i18n/telas/geral';
import { meta } from '@/lib/seo';
import { notFound } from 'next/navigation';
import { allProducts, getCourse, tipoDe } from '@/lib/catalog';
import { CourseClient } from './CourseClient';
import { LivroClient } from './LivroClient';
import { ProdutoClient } from './ProdutoClient';
import { tx } from '@/i18n/telas/venda-course-client';

/* Uma rota por curso do catálogo, geradas do próprio catálogo. Acrescentar um
   curso em data/courses.json cria a página dele - nenhum arquivo a escrever. */
export function generateStaticParams() {
  return allProducts().map(c => ({ slug: c.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const c = getCourse((await params).slug);
  if (!c) return { title: tx.naoEncontrado };
  return meta({
    rota: `/cursos/${c.slug}`,
    title: `${c.titlePt} - ${geral.marca}`,
    description: resumoDaBusca(`${c.taglinePt} ${c.summaryPt}`)
  });
}

/* Até 155 caracteres, que é onde o resultado da busca corta (checa-seo.mjs).
   Era um `.slice(0, 180)`: as três descriptions do A1, do A2 e do B1 saíam
   cortadas no meio da palavra ("...situação real em", "notí"). Agora fecha na
   última frase inteira que cabe e, se nenhuma cabe, na última palavra. */
function resumoDaBusca(texto: string, max = 155): string {
  const t = texto.replace(/\s+/g, ' ').trim();
  if ([...t].length <= max) return t;
  const frases = t.match(/[^.!?]+[.!?]+/g) ?? [];
  let saida = '';
  for (const f of frases) {
    if ([...(saida + f)].length > max) break;
    saida += f;
  }
  if (saida.trim()) return saida.trim();
  const corte = [...t].slice(0, max - 1).join('');
  return corte.slice(0, corte.lastIndexOf(' ')).replace(/[,;:\s]+$/, '') + '…';
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const c = getCourse((await params).slug);
  if (!c) notFound();
  /* O e-book e o pacote têm página própria: capítulos e formato, não módulos.
     O livro tem a página de venda completa (LivroClient, 23/10/2026), que só é
     gerada quando ele estiver à venda (`aVenda` em data/courses.json). */
  const tipo = tipoDe(c);
  if (tipo === 'curso') return <CourseClient slug={c.slug} />;
  return tipo === 'livro' ? <LivroClient slug={c.slug} /> : <ProdutoClient slug={c.slug} />;
}
