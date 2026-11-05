/* Os desenhos do quadro do café (05/11/2026, aprovados pelo dono no
 * protótipo). Traço de giz, viewBox 100×80, nas cores das ilustrações do
 * site (--il-sol, --il-fruta-1, --teal-lite), fixas: o quadro é navy nos
 * dois temas. Cada traço se
 * desenha ao abrir a aba (.hf-quadro-anima, globals.css); o vapor do café,
 * do chá e do sachlav sobe em loop. Sem animação com "menos movimento".
 * A chave é o `desenho` de cada item em data/cardapios.json; uma chave
 * sem desenho aqui mostra só o nome (tests/cardapios.test.ts cobra). */

type Cor = 'sol' | 'flor' | 'menta' | 'mar' | 'fruta' | 'giz';
type Traco = ['p', Cor, string, boolean?] | ['c', Cor, number, number, number, boolean?];

const COR: Record<Cor, string> = {
  sol: '#E7B65A', flor: '#E58FA8', menta: '#8FD6C8', mar: '#8FB3B0', fruta: '#E07B39', giz: '#FBF9F5'
};

const vapor = (x: number): Traco[] => [['p', 'giz', `M${x} 22c-4-5 4-8 0-13`], ['p', 'giz', `M${x + 9} 22c-4-5 4-8 0-13`]];

const DESENHOS: Record<string, { tracos: Traco[]; vapor?: number }> = {
  falafel: { tracos: [['p', 'fruta', 'M14 52c10 18 62 18 72 0'], ['p', 'giz', 'M14 52c20-8 52-8 72 0'], ['c', 'fruta', 34, 42, 8, true], ['c', 'fruta', 50, 38, 8, true], ['c', 'fruta', 66, 42, 8, true], ['p', 'menta', 'M28 50l6-6M60 48l6-5']] },
  hummus: { tracos: [['p', 'giz', 'M12 44c4 22 72 22 76 0z'], ['p', 'sol', 'M30 40c10-12 30-12 40 0c-8 6-24 6-32-2c6-4 14-4 18 1'], ['c', 'menta', 40, 36, 2.5, true], ['c', 'menta', 56, 34, 2.5, true], ['p', 'fruta', 'M66 30l8-6']] },
  shakshuka: { tracos: [['p', 'giz', 'M10 46c2 18 76 18 78 0c0-6-78-6-78 0z'], ['p', 'giz', 'M88 44h10'], ['p', 'flor', 'M18 46c10 4 52 4 62 0'], ['c', 'sol', 36, 44, 6, true], ['c', 'sol', 60, 46, 6, true], ['c', 'giz', 36, 44, 10], ['c', 'giz', 60, 46, 10], ['p', 'menta', 'M48 36l3 3M72 38l3 3']] },
  sabich: { tracos: [['p', 'giz', 'M14 50c0-24 72-24 72 0c-10 14-62 14-72 0z'], ['c', 'sol', 38, 40, 6, true], ['c', 'giz', 38, 40, 10], ['p', 'flor', 'M54 34c8-2 14 2 16 8c-8 2-14 0-16-8z'], ['p', 'menta', 'M26 34l4 6M62 46l6 2']] },
  burekas: { tracos: [['p', 'fruta', 'M18 58l32-38l32 38z'], ['p', 'sol', 'M30 50l20-22l20 22'], ['c', 'giz', 40, 52, 1.4, true], ['c', 'giz', 50, 48, 1.4, true], ['c', 'giz', 60, 52, 1.4, true]] },
  malabi: { tracos: [['p', 'giz', 'M26 24h48l-6 38c-1 6-35 6-36 0z'], ['p', 'giz', 'M30 40c12 3 28 3 40 0'], ['p', 'flor', 'M30 40c8-6 14 4 20-2s14 4 20 2', true], ['c', 'menta', 42, 34, 2, true], ['c', 'sol', 52, 32, 2, true], ['c', 'menta', 60, 35, 2, true], ['p', 'flor', 'M50 10c-4 4-4 8 0 10c4-2 4-6 0-10z'], ['p', 'giz', 'M18 70h64']] },
  coffee: { vapor: 40, tracos: [['p', 'giz', 'M24 30h44l-4 30c-1 6-35 6-36 0z'], ['p', 'giz', 'M68 36c12 0 12 16-2 16'], ['p', 'sol', 'M30 38c10 4 22 4 32 0'], ['p', 'giz', 'M16 66h60']] },
  espresso: { vapor: 40, tracos: [['p', 'giz', 'M34 38h28l-3 18c-1 4-21 4-22 0z'], ['p', 'giz', 'M62 42c8 0 8 10-2 10'], ['p', 'fruta', 'M37 43c6 2 16 2 22 0'], ['p', 'giz', 'M24 62h48']] },
  cappuccino: { vapor: 40, tracos: [['p', 'giz', 'M22 32h52l-5 26c-1 6-41 6-42 0z'], ['p', 'giz', 'M74 38c12 0 12 14-2 14'], ['p', 'giz', 'M26 37c14 4 30 4 44 0'], ['p', 'flor', 'M48 44c-6-6-12 0-6 4l6 5l6-5c6-4 0-10-6-4z', true], ['p', 'giz', 'M14 68h68']] },
  americano: { vapor: 40, tracos: [['p', 'giz', 'M32 20h32v40c0 6-32 6-32 0z'], ['p', 'giz', 'M64 28c12 0 12 18 0 18'], ['p', 'sol', 'M35 32h26v26c0 4-26 4-26 0z', true], ['p', 'mar', 'M35 32c8 3 18 3 26 0']] },
  tea: { vapor: 42, tracos: [['p', 'giz', 'M30 28h36l-6 36h-24z'], ['p', 'menta', 'M38 46c6-8 14-8 18 0c-6 6-12 6-18 0z'], ['p', 'menta', 'M56 46c6-4 12-2 14 4c-6 2-12 0-14-4z'], ['p', 'sol', 'M34 40h28']] },
  sachlav: { vapor: 40, tracos: [['p', 'giz', 'M24 28h48v28c0 8-48 8-48 0z'], ['p', 'flor', 'M28 36c12 4 28 4 40 0'], ['c', 'fruta', 40, 34, 2, true], ['c', 'fruta', 52, 32, 2, true], ['c', 'fruta', 60, 35, 2, true], ['p', 'giz', 'M72 36c12 0 12 14 0 14']] },
  rimonim: { tracos: [['p', 'giz', 'M30 18h36l-4 46h-28z'], ['p', 'flor', 'M32 30h32l-3 32h-26z', true], ['p', 'giz', 'M54 8l-6 26'], ['c', 'flor', 80, 58, 8, true], ['p', 'menta', 'M78 49l2-4l3 3']] },
  limonada: { tracos: [['p', 'giz', 'M28 18h40l-6 46h-28z'], ['p', 'sol', 'M30 30h36'], ['c', 'sol', 68, 22, 9], ['p', 'sol', 'M68 13v18M59 22h18'], ['p', 'menta', 'M40 40c4-6 10-6 12 0c-4 4-8 4-12 0z'], ['p', 'giz', 'M52 8l-6 30']] },
  water: { tracos: [['p', 'mar', 'M40 10h20v8c8 4 10 10 10 18v26c0 6-40 6-40 0v-26c0-8 2-14 10-18z'], ['p', 'mar', 'M30 40c14 6 26 6 40 0'], ['p', 'giz', 'M44 10h12']] },
  pizza: { tracos: [['p', 'sol', 'M14 26c24-12 48-12 72 0l-36 44z'], ['p', 'fruta', 'M14 26c24-12 48-12 72 0c-24-4-48-4-72 0'], ['c', 'flor', 40, 34, 4, true], ['c', 'flor', 58, 36, 4, true], ['c', 'flor', 48, 50, 4, true], ['p', 'menta', 'M32 44l4 2M60 46l3 3']] },
  burger: { tracos: [['p', 'fruta', 'M18 36c4-22 60-22 64 0z'], ['p', 'menta', 'M16 42c10 6 18-4 26 2s16-6 24 0s12-4 18 0'], ['p', 'flor', 'M18 48h64'], ['p', 'sol', 'M20 52l60 0l-6 6l-48 0z'], ['p', 'fruta', 'M20 58c0 10 60 10 60 0'], ['c', 'giz', 34, 26, 1.2, true], ['c', 'giz', 48, 22, 1.2, true], ['c', 'giz', 62, 26, 1.2, true]] },
  sushi: { tracos: [['c', 'giz', 32, 44, 16], ['c', 'flor', 32, 44, 8, true], ['c', 'giz', 68, 44, 16], ['c', 'fruta', 68, 44, 8, true], ['p', 'menta', 'M20 66h60'], ['p', 'giz', 'M78 18l-30 30M86 22l-30 30']] },
  schnitzel: { tracos: [['p', 'fruta', 'M14 46c0-16 20-22 36-18s36 0 36 14s-18 22-36 18s-36 2-36-14z'], ['p', 'sol', 'M26 40l6-4M40 48l6-4M58 40l6-4M66 52l6-4'], ['p', 'sol', 'M78 22c6 0 10 4 10 10c-6 0-10-4-10-10z']] },
  pasta: { tracos: [['p', 'giz', 'M10 44c4 20 76 20 80 0z'], ['p', 'sol', 'M22 44c6-12 14 6 20-6s14 8 20-4s12 8 16 0'], ['c', 'flor', 40, 38, 3.5, true], ['c', 'flor', 58, 36, 3.5, true], ['p', 'giz', 'M74 10v30M70 10v12M78 10v12']] },
  cola: { tracos: [['p', 'giz', 'M32 16h36l-5 50h-26z'], ['p', 'flor', 'M34 30h32l-4 34h-24z', true], ['c', 'giz', 44, 44, 1.5, true], ['c', 'giz', 54, 52, 1.5, true], ['c', 'giz', 48, 58, 1.5, true], ['p', 'giz', 'M56 6l-4 30'], ['p', 'mar', 'M38 22h10']] }
};

export const temDesenho = (chave: string) => chave in DESENHOS;

function Tr({ t }: { t: Traco }) {
  const cor = COR[t[1]];
  const preenche = t[0] === 'p' ? t[3] : t[5];
  const estilo = { stroke: cor, fill: preenche ? cor : 'none', fillOpacity: preenche ? 0.18 : undefined };
  return t[0] === 'p'
    ? <path pathLength={1} d={t[2]} style={estilo} />
    : <circle pathLength={1} cx={t[2]} cy={t[3]} r={t[4]} style={estilo} />;
}

export function DesenhoDoCafe({ chave }: { chave: string }) {
  const d = DESENHOS[chave];
  if (!d) return null;
  return (
    <svg viewBox="0 0 100 80" aria-hidden className="hf-quadro-desenho">
      {d.vapor !== undefined && <g className="hf-quadro-vapor">{vapor(d.vapor).map((t, i) => <Tr key={i} t={t} />)}</g>}
      {d.tracos.map((t, i) => <Tr key={i} t={t} />)}
    </svg>
  );
}
