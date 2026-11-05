'use client';

/* Recompensas: trocar o XP do saldo (27/09/2026). Ver lib/loja.ts.
 *
 * O XP TOTAL continua sendo a conquista (no topo e em Conquistas); aqui se
 * gasta só o SALDO. Cada item diz quanto custa, o que faz e, quando não dá
 * para comprar, por quê - um botão desligado sem motivo é uma porta sem
 * maçaneta.
 */

import { CenaDaRecompensa, PergaminhoBonus, type Recompensa } from '@/components/ilustra/CenaDaRecompensa';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button, LinkButton } from '@/components/ui/Button';
import { He } from '@/components/hebrew/He';
import { useProgress } from '@/lib/state/store';
import { allLetters, cultureCards, leiturasBonus } from '@/lib/content';
import { concluidasSemDominio, REGRA_DA_CONCLUSAO, REGRA_DO_DOMINIO_CURTA } from '@/lib/state/rules';
import { itemDaLeitura } from '@/lib/engine/bonus';
import { cartasCompradas, folgasLivres, gasto, ITENS, leiturasCompradas, MAX_FOLGAS, saldo, temNomeDecorado, type Recusa } from '@/lib/loja';
import { arquivoDoNome, desenharNome, FORMATOS_NOME, type FormatoNome } from '@/lib/nome-decorado';
import { MEU_NOME_EM_HEBRAICO } from '@/lib/recursos';
import { AbreDepoisDoPrazo, useAbreEm } from '@/components/platform/AbreDepoisDoPrazo';
import { tx } from '@/i18n/telas/academia-loja-client';

const MOTIVO: Record<Recusa, string> = {
  saldo: tx.motivoSaldo,
  limite: tx.motivoLimite(MAX_FOLGAS),
  'ja-tem': tx.motivoJaTem,
  'sem-alvo': tx.motivoSemAlvo,
  'sem-nome': tx.motivoSemNome
};

export function LojaClient() {
  const p = useProgress();
  const s = p.state;
  const [aviso, setAviso] = useState<string | null>(null);
  const livre = saldo(s);
  const folgas = folgasLivres(s).length;
  const compradas = cartasCompradas(s);
  const proxima = cultureCards()
    .filter(c => c.unlockAt > p.mastered && !compradas.has(c.id))
    .sort((a, b) => a.unlockAt - b.unlockAt)[0];

  const trocar = (item: keyof typeof ITENS, alvo?: string, feito?: string) => {
    const r = p.comprar(item, alvo);
    setAviso(r ? MOTIVO[r] : (feito ?? tx.pronto));
  };

  if (!p.ready) return null;
  const nomeItem = ITENS['nome-decorado'];

  return (
    <div className="grid gap-6">
      <header className="grid gap-3">
        <h1 className="text-[27px] sm:text-[33px] font-bold m-0">{tx.titulo}</h1>
        <p className="font-ui text-[15px] leading-relaxed text-ink-body m-0">
          {tx.intro}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {/* As cores escritas aqui, e não herdadas do tom: o cartão escuro
              herdava a tinta escura do texto e o saldo sumia. */}
          <div className="rounded-[var(--r-lg)] p-4 grid gap-0.5 bg-[var(--navy)] text-white">
            <span className="font-ui text-[12px] uppercase tracking-[.07em] text-white/80">{tx.saldoParaTrocar}</span>
            <span className="font-display text-[30px] font-bold tabular-nums text-white">◆ {livre.toLocaleString(tx.localeNumero)}</span>
          </div>
          <Card className="p-4 grid gap-0.5">
            <span className="font-ui text-[12px] uppercase tracking-[.07em] text-ink-muted">{tx.xpTotal}</span>
            <span className="font-display text-[30px] font-bold tabular-nums text-ink">{s.xp.toLocaleString(tx.localeNumero)}</span>
            {gasto(s) > 0 && <span className="font-ui text-[12px] text-ink-muted">{tx.jaTrocados(gasto(s).toLocaleString(tx.localeNumero))}</span>}
          </Card>
        </div>
        {aviso && <p role="status" className="font-ui text-[14.5px] font-semibold text-[var(--teal-ink)] m-0">{aviso}</p>}
      </header>

      {/* Dia de folga */}
      <Item titulo={ITENS.folga.titulo} custo={ITENS.folga.custo} cena="folga" descricao={ITENS.folga.descricao}
            detalhe={folgas ? tx.folgasGuardadas(folgas) : tx.nenhumaFolga}
            pode={livre >= ITENS.folga.custo && folgas < MAX_FOLGAS}
            porQueNao={folgas >= MAX_FOLGAS ? MOTIVO.limite : MOTIVO.saldo}
            onTrocar={() => trocar('folga', undefined, tx.folgaFeito)} />

      {/* Carta de cultura antecipada */}
      <Item titulo={ITENS.carta.titulo} custo={ITENS.carta.custo} cena="carta" descricao={ITENS.carta.descricao}
            detalhe={proxima ? tx.proximaCarta(proxima.titlePt, proxima.unlockAt) : tx.todasAbertas}
            pode={!!proxima && livre >= ITENS.carta.custo}
            porQueNao={!proxima ? MOTIVO['sem-alvo'] : MOTIVO.saldo}
            onTrocar={() => proxima && trocar('carta', proxima.id, tx.cartaFeito)}
            depois={compradas.size > 0 ? <Link href="/historia" className="font-ui text-[14px] font-semibold text-[var(--accent)] underline">{tx.lerCartas}</Link> : null} />

      {/* Nome decorado (só onde a "Meu nome em hebraico" existe, lib/recursos.ts) */}
      {!MEU_NOME_EM_HEBRAICO ? null : temNomeDecorado(s) && s.nomeHebraico ? (
        <NomeDecorado nomeHe={s.nomeHebraico.texto} nomePt={s.onboarding?.name ?? ''} />
      ) : (
        <Item titulo={nomeItem.titulo} custo={nomeItem.custo} cena="nome"
              descricao={nomeItem.descricao}
              detalhe={s.nomeHebraico
                ? tx.seuNome(<He size="word">{s.nomeHebraico.texto}</He>)
                : tx.confirmeNome(<Link href="/meu-nome" className="underline">{tx.meuNome}</Link>)}
              pode={!!s.nomeHebraico && livre >= nomeItem.custo}
              porQueNao={!s.nomeHebraico ? MOTIVO['sem-nome'] : MOTIVO.saldo}
              onTrocar={() => trocar('nome-decorado', undefined, tx.nomeFeito)} />
      )}

      <LeiturasBonus livre={livre} mastered={p.mastered} semDominio={concluidasSemDominio(s)}
                     totalLetras={allLetters().length} minhas={leiturasCompradas(s)}
                     onTrocar={(item, id, legivel) => trocar(item, id, legivel
                       ? tx.leituraAberta
                       : tx.leituraGuardada)} />
    </div>
  );
}

/* Textos e versículos bíblicos (lib/engine/bonus.ts). Só as revisadas.
   30/09/2026, decisão do dono: qualquer leitura se troca a qualquer momento.
   Antes, cada uma só abria com as letras dela dominadas (`after`), e o botão
   cinza parecia defeito. Agora a troca é livre e a tela diz a lógica: o texto
   fica guardado, e a leitura sozinha vem quando as letras estiverem dominadas. */
function LeiturasBonus({ livre, mastered, semDominio, totalLetras, minhas, onTrocar }: {
  livre: number; mastered: number; semDominio: number; totalLetras: number; minhas: Set<string>;
  onTrocar: (item: 'texto-bonus' | 'bencao', id: string, legivel: boolean) => void;
}) {
  const leituras = leiturasBonus();
  const abreEm = useAbreEm();
  if (abreEm) return <AbreDepoisDoPrazo o="bonus" em={abreEm} comBotao={false} />;
  if (!leituras.length) return null;
  const adiantadas = leituras.some(l => mastered < l.after);
  return (
    <section className="grid gap-3" aria-labelledby="leituras-bonus">
      <div className="grid gap-1">
        <h2 id="leituras-bonus" className="font-display text-[21px] font-bold m-0">{tx.leiturasBonus}</h2>
        <p className="font-ui text-[14px] leading-relaxed text-ink-body m-0">
          {tx.leiturasIntro}
          {' '}{ITENS['texto-bonus'].custo === ITENS.bencao.custo
            ? tx.cadaLeitura(ITENS.bencao.custo)
            : tx.textoEVersiculo(ITENS['texto-bonus'].custo, ITENS.bencao.custo)}
        </p>
        {adiantadas && (
          <div className="rounded-[var(--r-md)] bg-surface-2 px-4 py-3 grid gap-1.5 font-ui text-[14px] leading-relaxed text-ink-body">
            <p className="m-0">
              {tx.podeTrocar}
            </p>
            <p className="m-0">
              {tx.lerSozinho(mastered, totalLetras)}
            </p>
            <p className="m-0">
              {REGRA_DA_CONCLUSAO}
            </p>
            {semDominio > 0 && (
              <p className="m-0">
                {semDominio === 1
                  ? tx.semDominioUma(REGRA_DO_DOMINIO_CURTA)
                  : tx.semDominioVarias(semDominio, REGRA_DO_DOMINIO_CURTA)}{' '}
                <Link href="/mapa" className="text-[var(--accent)] underline">{tx.verLicoes}</Link>
              </p>
            )}
          </div>
        )}
        <Link href="/nikud-biblico" className="font-ui text-[14px] text-[var(--accent)] underline justify-self-start">
          {tx.guiaNikud}
        </Link>
        {minhas.size > 0 && (
          <Link href="/bonus" className="font-ui text-[14px] font-semibold text-[var(--accent)] underline justify-self-start">
            {tx.lerMinhas}
          </Link>
        )}
      </div>
      <ul className="grid gap-2 list-none p-0 m-0">
        {leituras.map(l => {
          const item = itemDaLeitura(l);
          const custo = ITENS[item].custo;
          const tem = minhas.has(l.id);
          const legivel = mastered >= l.after;
          const faltam = l.after - mastered;
          /* A nota vai numa linha própria, embaixo: ao lado do botão ela
             espremia o título a uma palavra por linha no celular. */
          const nota = !tem && livre < custo ? MOTIVO.saldo
            : legivel ? null
            : tx.paraLerSozinho(l.after, faltam);
          return (
            <li key={l.id}>
              <div className="hf-topico grid gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <PergaminhoBonus versiculo={item === 'bencao'} />
                  <div className="grid gap-0.5 min-w-[10rem] flex-1">
                    <span className="font-display text-[16.5px] font-semibold text-ink">{l.tituloPt}</span>
                    <span className="font-ui text-[13px] text-ink-muted">{l.fontePt}</span>
                  </div>
                  {tem ? (
                    <LinkButton href={`/bonus?l=${l.id}`} variant="secondary">{tx.ler}</LinkButton>
                  ) : (
                    <Button onClick={() => onTrocar(item, l.id, legivel)} disabled={livre < custo} size="md">
                      {tx.trocarPor(custo)}
                    </Button>
                  )}
                </div>
                {nota && <p className="font-ui text-[12.5px] text-ink-muted m-0">{nota}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* Cartão ilustrado, parte 4 (05/11/2026): a cena da recompensa em cima. */
function Item({ titulo, custo, cena, descricao, detalhe, pode, porQueNao, onTrocar, depois }: {
  titulo: string; custo: number; cena: Recompensa; descricao: string; detalhe: React.ReactNode;
  pode: boolean; porQueNao: string; onTrocar: () => void; depois?: React.ReactNode;
}) {
  return (
    <div className="hf-cartao hf-cartao-estatico">
      <CenaDaRecompensa tipo={cena} />
      <div className="p-5 pt-4 grid gap-3">
        <div className="grid gap-1 min-w-0">
          <h2 className="font-display text-[18px] font-semibold m-0">{titulo}</h2>
          <p className="font-ui text-[14px] leading-relaxed text-ink-body m-0">{descricao}</p>
          <p className="font-ui text-[13.5px] text-ink-muted m-0">{detalhe}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onTrocar} disabled={!pode} size="md">{tx.trocarPor(custo)}</Button>
          {!pode && <span className="font-ui text-[13px] text-ink-muted">{porQueNao}</span>}
          {depois}
        </div>
      </div>
    </div>
  );
}

function NomeDecorado({ nomeHe, nomePt }: { nomeHe: string; nomePt: string }) {
  const [formato, setFormato] = useState<FormatoNome>('celular');
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) void desenharNome(ref.current, { nomeHe, nomePt, formato });
  }, [nomeHe, nomePt, formato]);

  const baixar = () => {
    const c = ref.current;
    if (!c) return;
    c.toBlob(b => {
      if (!b) return;
      const url = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = url;
      a.download = arquivoDoNome(nomePt);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, 'image/png');
  };

  return (
    <Card className="p-5 grid gap-4">
      <div className="grid gap-1">
        <h2 className="font-display text-[18px] font-semibold m-0">{tx.nomeDecoradoTitulo}</h2>
        <p className="font-ui text-[14px] text-ink-body m-0">{tx.nomeDecoradoTexto}</p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={tx.formato}>
        {(Object.keys(FORMATOS_NOME) as FormatoNome[]).map(f => (
          <button key={f} type="button" aria-pressed={f === formato} onClick={() => setFormato(f)}
                  className={`min-h-[44px] px-4 rounded-[var(--r-md)] border font-ui text-[14px]
                    ${f === formato ? 'border-[var(--navy)] bg-[var(--accent-wash)] font-semibold' : 'border-line bg-surface'}`}>
            {FORMATOS_NOME[f].rotulo}
          </button>
        ))}
      </div>
      <canvas ref={ref} aria-label={tx.nomeDecoradoAria(nomeHe)}
              className={`w-full rounded-[var(--r-md)] border border-line ${formato === 'celular' ? 'max-w-[280px]' : 'max-w-[420px]'}`} />
      <div><Button onClick={baixar}>{tx.baixarImagem}</Button></div>
    </Card>
  );
}
