/* export-content.mjs - data/ → app/content/
 * ─────────────────────────────────────────────────────────────────────────
 * The app does NOT read data/letters.json directly, and it does not read the
 * PDF at all. This is the one bridge between the two, and it exists for three
 * reasons:
 *
 *   1. The order rule has to be a value, not a convention. Every letter here
 *      carries `alphabetSoFar` - the exact set of glyphs the learner may be
 *      shown at that point. The exercise generator receives only that set, so
 *      it CANNOT produce a distractor with an unlearned letter. In the book
 *      that guarantee is validate.js V1; in the app it is this field.
 *
 *   2. Nikud must not be normalised, reordered or trimmed on its way to the
 *      browser. Everything is written NFC and copied verbatim - no cleaning,
 *      no "helpful" whitespace handling. A pointed Hebrew word is 2-4
 *      codepoints per letter and any string surgery corrupts it.
 *
 *   3. The book and the app must never drift. One source, two outputs: change
 *      a word in data/letters.json and both the printed workbook and the
 *      course change with it, or neither does.
 *
 * Run: npm run export-content (from app/), or node tools/export-content.mjs
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync, existsSync, cpSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { gravacoesDoProfessor } from './gravacoes-professor.mjs';
import { audioIdFor } from './audio-id.mjs';
import { LOCALE, ARQUIVOS as TRADUZIDOS, traduzir } from './i18n.mjs';
import { translitEn } from './translit-en.mjs';
import { translitEs } from './translit-es.mjs';
import { prepararVideos } from './videos.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'app/content');
/* Na build em inglês (NEXT_PUBLIC_LOCALE=en), cada arquivo do curso sai com
   os textos de data/en/ no lugar do português (tools/i18n.mjs). Na build em
   português o arquivo é lido como sempre. */
const FALTAS = new Map();
/* Site de fora do Brasil: o inglês e, desde 04/11/2026, o espanhol
   (PLANO-ESPANHOL.md). Os dois saem sem Brasil, em dólar, pelo Paddle. */
const EXTERIOR = LOCALE !== 'pt';
const NOME_DO_IDIOMA = { en: 'inglês', es: 'espanhol' }[LOCALE] || 'português';
/* Campo de um idioma no catálogo e na empresa: `titleEn`, `titleEs`. */
const SUFIXO = LOCALE === 'es' ? 'Es' : 'En';
const CONVERTER = LOCALE === 'es' ? translitEs : translitEn;
const readJson = p => {
  const json = JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
  const nome = p.match(/^data\/([\w-]+)\.json$/)?.[1];
  if (!EXTERIOR || !TRADUZIDOS.includes(nome)) return json;
  const faltas = [];
  traduzir(nome, json, faltas);
  for (const f of faltas) FALTAS.set(`${f.arquivo}:${f.caminho}`, f);
  emIngles(json);
  return json;
};

/* A transliteração do site em inglês (tools/translit-en.mjs): todo campo
   `translit...` sai convertido, na mesma regra para o curso inteiro. */
function emIngles(no, chave = '') {
  if (Array.isArray(no)) {
    no.forEach((x, i) => {
      if (typeof x === 'string') { if (/^translit/i.test(chave)) no[i] = CONVERTER(x); }
      else emIngles(x, chave);
    });
  } else if (no && typeof no === 'object') {
    for (const [k, v] of Object.entries(no)) {
      if (typeof v === 'string') { if (/^translit/i.test(k)) no[k] = CONVERTER(v); }
      else emIngles(v, k);
    }
  }
}
const NFC = s => String(s ?? '').normalize('NFC');

/* Same id as tools/gen-audio.mjs (tools/audio-id.mjs), so a clip recorded for
   the book plays in the app without a second naming scheme. Content-derived,
   never positional. */

/* O exemplo que se ouve numa leitura da letra (ver `variantes` abaixo). Uma
   forma final não leva vogal depois de si: o exemplo é a primeira palavra da
   letra que termina nela. As outras: a sílaba com patach, que toda lição de
   letra e toda lição de som gravaram. */
const FINAIS = new Set(['ך', 'ם', 'ן', 'ף', 'ץ']);
const semPontos = he => NFC(he).replace(/[\u0591-\u05C7]/g, '');
function exemploDaVariante(L, he) {
  const base = semPontos(he);
  if (FINAIS.has(base)) {
    const palavra = [...(L.wordsToRead || []), ...(L.wordsToRecognize || [])]
      .find(w => semPontos(w.he).endsWith(base));
    if (!palavra) throw new Error(`letters.json: ${L.id} não tem palavra terminada em ${base} para a leitura final`);
    return NFC(palavra.he);
  }
  return NFC(he + '\u05B7');
}

/* As imagens do vocabulário moram num arquivo próprio (data/imagens-
   vocabulario.json) e entram aqui, na palavra. Só as palavras concretas têm
   entrada; as outras saem sem os campos, e a tela sabe que não há imagem.
   Preenchido por `carregarImagens`, antes da primeira palavra. */
let IMAGENS = new Map();
let ESTILO_IMAGEM = '';

const word = w => {
  const img = IMAGENS.get(NFC(w.he));
  return {
    he: NFC(w.he),
    translit: w.translit,
    pt: w.pt,
    use: w.use ?? null,
    /* A lição de som que ensina esta palavra (טוֹב → Vet). A lição da letra a
       pula; o resto do curso - missões, cenas, jogos - a conta como sabida. */
    som: w.som ?? null,
    audioId: audioIdFor(w.he),
    ...(img ? {
      image: img.image ?? null,
      imageAlt: img.imageAlt,
      /* O prompt completo: o estilo comum na frente da cena. Vai junto para
         quem for gerar as imagens trabalhar a partir do conteúdo exportado. */
      imagePrompt: `${ESTILO_IMAGEM} Subject: ${img.imagePrompt}`
    } : {})
  };
};

/**
 * Lê e VALIDA as imagens. Duas recusas, e as duas protegem o aluno:
 *   · chave que não é palavra do curso - uma imagem órfã nunca aparece, e
 *     esconde um erro de digitação na palavra;
 *   · `image` apontando para arquivo que não existe - a tela mostraria um
 *     ícone quebrado no lugar da ilustração.
 */
function carregarImagens(letters, sons = []) {
  const caminho = join(ROOT, 'data/imagens-vocabulario.json');
  if (!existsSync(caminho)) return;
  /* Por readJson: na build em inglês o texto alternativo vem de data/en/. */
  const d = readJson('data/imagens-vocabulario.json');
  ESTILO_IMAGEM = d.estilo ?? '';
  /* As lições de som também ensinam palavras (לֵב, סֵפֶר, מֶלֶךְ saíram das
     lições de Bet, Kaf e Pe para as de Vet, Fe e Chaf em 26/09/2026). */
  const doCurso = new Set([
    ...letters.flatMap(L => [...(L.wordsToRead || []), ...(L.wordsToRecognize || [])].map(w => NFC(w.he))),
    ...sons.flatMap(S => S.palavras.map(w => NFC(w.he)))
  ]);
  for (const [he, img] of Object.entries(d.palavras ?? {})) {
    const k = NFC(he);
    if (!doCurso.has(k)) throw new Error(`imagens-vocabulario: "${he}" não é palavra do curso`);
    if (!img.imageAlt) throw new Error(`imagens-vocabulario: "${he}" sem imageAlt`);
    if (img.image && !existsSync(join(ROOT, 'app/public', img.image.replace(/^\//, '')))) {
      throw new Error(`imagens-vocabulario: "${he}" aponta para ${img.image}, que não existe em app/public`);
    }
    IMAGENS.set(k, img);
  }
}

/* A scene names a word; its reading and meaning must come from the one place
   that already holds them, or the two drift. A multi-word sign (בֹּקֶר טוֹב)
   is looked up word by word and joined. */
function lookupWord(letters, phrase, scene) {
  const all = new Map();
  for (const L of letters) {
    for (const w of [...L.wordsToRead, ...L.wordsToRecognize]) all.set(NFC(w.he), w);
  }
  /* A gloss written ON the scene wins. Joining the dictionary entries of
     בֹּקֶר and טוֹב gives "manhã bom", which is not Portuguese - a phrase means
     something the words do not, and the scene is where that is recorded. */
  if (scene.pt) return { translit: scene.translit ?? null, pt: scene.pt };

  const parts = NFC(phrase).split(/\s+/).filter(Boolean);
  const found = parts.map(p => all.get(p));
  if (found.every(Boolean)) {
    return {
      translit: found.map(w => w.translit).join(' '),
      pt: found.map(w => w.pt).join(' ')
    };
  }
  /* Not a plain vocabulary word (an inflected form such as הַמֶּלֶךְ). The
     scene then carries its own gloss, and V18 has already proved it is
     readable at that point. */
  return { translit: scene.translit ?? null, pt: scene.pt ?? null };
}

function main() {
  const letters = readJson('data/letters.json').sort((a, b) => a.order - b.order);
  carregarImagens(letters, readJson('data/extras.json').sons?.licoes);
  const modules = readJson('data/modules.json').modules;
  const nikud = readJson('data/nikud.json');
  const extras = readJson('data/extras.json');
  const realWorld = readJson('data/real-world.json');
  const sentences = readJson('data/sentences.json');
  const eras = readJson('data/eras.json');
  const biblia = readJson('data/biblia.json');

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(join(OUT, 'letters'), { recursive: true });
  const exported = [];

  /* ── the order rule, materialised ───────────────────────────────────── */
  const alphabetUpTo = order => {
    const out = [];
    for (const L of letters) {
      if (L.order > order) break;
      out.push(L.letter);
      if (L.finalForm) out.push(L.finalForm);
    }
    return out;
  };

  const strokeSvg = id => {
    const p = join(ROOT, 'assets/stroke-order', `${id}.svg`);
    return existsSync(p) ? `/stroke-order/${id}.svg` : null;
  };

  for (const L of letters) {
    const out = {
      id: L.id,
      order: L.order,
      module: L.module,
      lesson: L.lesson,
      letter: NFC(L.letter),
      finalForm: L.finalForm ? NFC(L.finalForm) : null,
      nameHe: NFC(L.nameHe),
      namePt: L.namePt,
      translit: L.translit,
      sound: L.sound,
      /* As leituras de uma letra que tem mais de uma, cada uma com o SEU
         áudio - Shin e Sin, Pe e Fe, cada botão toca o som da sua leitura.

         O áudio é de um EXEMPLO, e não da letra sozinha (29/09/2026). O id
         saía do próprio `v.he` - "פּ", "פ", "ף" -, e uma consoante sem vogal
         nunca foi gravada (não se pronuncia sozinha): o id não tinha
         arquivo, o botão sumia, e o quadro "As leituras desta letra" do Pe,
         do Bet, do Kaf e do Shin ficava mudo justo onde se ensina a
         diferença entre /p/ e /f/. Agora cada leitura toca a sílaba dela
         com patach (פַּ = "pa", פַ = "fa"), e a forma final toca a primeira
         palavra do curso que termina nela (ף → כֶּסֶף). A letra desenhada no
         quadro continua a mesma. */
      variantes: (L.variantes || []).map(v => {
        const exemplo = exemploDaVariante(L, v.he);
        return {
          he: NFC(v.he), nomePt: v.nomePt, som: v.som, translit: v.translit,
          comoPt: v.comoPt, ondePt: v.ondePt, exemploHe: exemplo, audioId: audioIdFor(exemplo)
        };
      }),
      soundNotePt: L.soundNotePt,
      /* De onde sai o som, em todas as letras: o desenho da lição
         (components/learn/OndeNasceOSom.tsx). */
      articulacao: {
        ...L.articulacao,
        pontos: L.articulacao.pontos.map(p => (p.rotulo ? { ...p, rotulo: NFC(p.rotulo) } : p))
      },
      /* A camada pedagógica, inteira. Passa como está: o que ela tem de
         obrigatório é cobrado pela V23 do validate.js, na FONTE - um
         exportador que conserta dado ruim esconde dado ruim. */
      ensino: L.ensino,
      didYouKnow: L.didYouKnow,
      /* O som de cada letra é a sílaba gravada em estúdio por um falante
         nativo (19/10/2026): o id sai do texto, como em todo o curso. */
      compararSons: L.compararSons
        ? { ...L.compararSons, itens: L.compararSons.itens.map(it => ({ ...it, som: NFC(it.som), audioId: audioIdFor(it.som) })) }
        : null,
      didYouKnowTitle: L.didYouKnowTitle ?? null,
      maisCuriosidades: L.maisCuriosidades ?? [],
      brazilianMistake: L.brazilianMistake,
      confusableWith: (L.confusableWith || []).map(NFC),
      /* O traço visual que separa esta letra de uma parecida, por glifo.
         Escrito de um lado só: o gerador procura nos dois sentidos. Sem isto o
         retorno do erro dizia "Essa é Dálet" e não dizia COMO distinguir, e a
         pessoa errava de novo pelo mesmo motivo. */
      contrastes: Object.fromEntries(
        Object.entries(L.contrastes || {}).map(([g, frase]) => [NFC(g), frase])
      ),
      syllables: (L.syllables || []).map(s => ({
        vowel: s.vowel, he: NFC(s.he), translit: s.translit,
        ptApprox: s.ptApprox, audioId: audioIdFor(s.he)
      })),
      wordsToRead: (L.wordsToRead || []).map(word),
      wordsToRecognize: (L.wordsToRecognize || []).map(word),
      /* A sílaba da letra vem com nikud, o resto da palavra sem (19/10/2026):
         `marca` é o trecho destacado. O áudio é o da palavra sem pontos - a
         marcação é só de tela, e trocar a sílaba não pode trocar a gravação. */
      bridgeWords: (L.bridgeWords || []).map(b => ({
        he: NFC(b.he), pt: b.pt, marca: b.marca ? NFC(b.marca) : null, audioId: audioIdFor(semPontos(b.he))
      })),
      alphabetSoFar: alphabetUpTo(L.order),
      strokeOrder: { base: strokeSvg(L.id), final: L.finalForm ? strokeSvg(`${L.id}-final`) : null },
      audioId: audioIdFor(L.nameHe)
    };
    exported.push(out);
    writeFileSync(join(OUT, 'letters', `${L.id}.json`), JSON.stringify(out, null, 2) + '\n');
  }

  /* One bundle as well as one file per letter. The per-letter files are for
     reading and diffing; this is what the app imports, because every screen
     that is not a single lesson - the map, a checkpoint, the review - needs
     most of them at once, and 96 KB of JSON split 22 ways would be 22 requests
     to show one page. */
  writeFileSync(join(OUT, 'letters.json'), JSON.stringify(exported) + '\n');

  /* ── the course spine ───────────────────────────────────────────────── */
  const course = {
    generatedAt: new Date().toISOString().slice(0, 10),
    source: 'data/letters.json + data/modules.json - «בא לי עברית!» חוברת למורה',
    totalLetters: letters.length,
    modules: modules.map(M => {
      const own = letters.filter(l => l.module === M.n);
      return {
        n: M.n,
        id: M.id,
        kind: M.kind ?? 'letters',
        titlePt: M.titlePt,
        subPt: M.subPt,
        introPt: M.introPt,
        goalsPt: M.goalsPt,
        milestonePt: M.milestonePt,
        lessons: M.lessons,
        letterIds: own.map(l => l.id),
        /* Tem texto principal publicado (03/11/2026)? Só o sim/não sai aqui,
           nunca o texto: a porta do módulo seguinte (lib/sons.ts,
           portasDosModulos) precisa saber antes de o conteúdo pago chegar.
           A mesma regra de `textoDoModulo` em lib/content.ts. */
        textoPrincipal: readJson('data/textos.json').textos
          .some(t => t.modulo === M.n && t.revisado && !t.revisao && !t.n),
        upTo: own.length ? own[own.length - 1].order : null,
        /* Um módulo sem letras PRÓPRIAS também tem checkpoint - e por um bom
           tempo não teve, o que deixou os dois últimos módulos do curso sem
           nenhuma verificação antes do exame final. O seis é justamente o mais
           difícil (ler sem os pontos).

           A regra `own.length ? ... : null` não era descuido: ela descreve
           bem um módulo de letras, cujo checkpoint fecha o que ELE ensinou. O
           que faltava era o outro caso. Um módulo de consolidação não ensina
           letra nova; ele cobra o que veio antes. Então o checkpoint dele é
           CUMULATIVO: todas as letras até ali. */
        checkpoint: (() => {
          const escopo = own.length ? own : letters.filter(l => l.module <= M.n);
          if (!escopo.length) return null;
          return {
            id: `cp${M.n}`, module: M.n,
            upTo: escopo[escopo.length - 1].order,
            letterIds: escopo.map(l => l.id),
            cumulativo: !own.length
          };
        })()
      };
    }),
    letters: letters.map(l => ({
      id: l.id, order: l.order, module: l.module,
      letter: NFC(l.letter), namePt: l.namePt, sound: l.sound
    }))
  };
  writeFileSync(join(OUT, 'course.json'), JSON.stringify(course, null, 2) + '\n');

  /* ── the catalogue ──────────────────────────────────────────────────────
     data/courses.json is the platform's product list: what /cursos shows,
     what the checkout charges, and what a paid account is allowed to open.
     Only one thing is resolved here rather than copied - a course that says
     `modulesFrom: "alfabetizacao"` takes its module list from the course just
     built above, so the sales page and the course itself cannot describe
     different módulos. Everything else passes through verbatim: a price the
     exporter "helped with" is a price nobody can trust. */
  /* ── quem vende ─────────────────────────────────────────────────────────
     Identificação do fornecedor, canais de atendimento e prazos das
     políticas. Passa verbatim, menos os campos `_nota…`, que são comentário
     para quem edita o arquivo - às vezes descrevendo a operação por dentro,
     como o `_notaPagamento` - e não têm por que viajar até o navegador de um
     aluno. São TODOS eles, não só o primeiro: quando isto desestruturava
     `_nota` pelo nome, um campo de nota criado depois ia junto para o
     navegador sem ninguém notar. */
  {
    const empresa = Object.fromEntries(
      Object.entries(readJson('data/empresa.json')).filter(([k]) => !k.startsWith('_nota'))
    );
    /* O site em inglês cobra pelo Paddle, em dólar, e dá 14 dias para
       desistir (PLANO-INGLES.md, etapa 5; o Worker usa os mesmos 14, DIAS_PADDLE
       em api/pay.js). Sem PIX e sem a chave PIX no pacote do navegador. */
    if (EXTERIOR) {
      /* Ou pelo Stripe, desde 05/11/2026 (pedido do dono): `pagamento.exterior`
         em data/empresa.json, o mesmo campo que o Worker lê (api/pay.js). */
      const deFora = empresa.pagamento && empresa.pagamento.exterior === 'stripe' ? 'stripe' : 'paddle';
      empresa.pagamento = { modo: deFora, exterior: deFora, formas: { pix: false, cartao: true } };
      /* E as políticas em inglês (e em espanhol) têm data própria (etapa 6). */
      const { atualizadoEmEn, atualizadoEmEs, ...politicas } = empresa.politicas;
      const data = LOCALE === 'es' ? atualizadoEmEs : atualizadoEmEn;
      /* 7 dias com o Stripe (decisão do dono, 05/11/2026), 14 com o Paddle: o
         mesmo número de worker/src/lib/desistencia.js (DIAS_STRIPE, DIAS_PADDLE). */
      empresa.politicas = { ...politicas, arrependimentoDias: deFora === 'stripe' ? 7 : 14, atualizadoEm: data || politicas.atualizadoEm };
      const { horarioEn, horarioEs, ...atendimento } = empresa.atendimento || {};
      const horario = LOCALE === 'es' ? horarioEs : horarioEn;
      if (horario) empresa.atendimento = { ...atendimento, horarioPt: horario };
      /* Sem Brasil no site em inglês (decisão do dono, 29/10/2026): o contato é
         o e-mail próprio dele, sem o .com.br, e o WhatsApp (+55) não aparece. */
      /* O lembrete para estudar tem chave própria no inglês (a Privacidade em
         inglês ainda não o descreve); o Worker lê a mesma (api/lembrete.js). */
      const { lembreteDeEstudoEn, lembreteDeEstudoEs, ...privacidade } = empresa.privacidade;
      const lembrete = LOCALE === 'es' ? lembreteDeEstudoEs : lembreteDeEstudoEn;
      empresa.privacidade = { ...privacidade, lembreteDeEstudo: lembrete === true };
      /* O espanhol usa o e-mail do inglês até haver um `emailEs`. */
      const { emailEn, emailEs, ...contato } = empresa.contato;
      const email = LOCALE === 'es' ? (emailEs || emailEn) : emailEn;
      empresa.contato = email
        ? { ...contato, email, emailSuporte: email, emailPrivacidade: email, whatsapp: null }
        : { ...contato, whatsapp: null };
    } else {
      const { emailEn, emailEs, ...contato } = empresa.contato;
      empresa.contato = contato;
      const { lembreteDeEstudoEn, lembreteDeEstudoEs, ...privacidade } = empresa.privacidade;
      empresa.privacidade = privacidade;
      const { atualizadoEmEs, ...politicas } = empresa.politicas;
      empresa.politicas = politicas;
      const { horarioEs, ...atendimento } = empresa.atendimento || {};
      if (empresa.atendimento) empresa.atendimento = atendimento;
    }
    writeFileSync(join(OUT, 'empresa.json'), JSON.stringify(empresa, null, 2) + '\n');
  }

  /* As placas da vitrine (30/10/2026, "O que você passa a ler" na página de venda): três
     fotos aprovadas do Hebraico na rua, as de placa mais legível na vitrine. Só a ficha da
     foto e a palavra; a pergunta e as opções continuam pagas. */
  {
    const VITRINE_RUA = ['rua-ani', 'rua-derech', 'rua-israel'];
    const placas = readJson('data/hebraico-na-rua.json').placas;
    const vitrine = VITRINE_RUA.map(id => {
      const p = placas.find(x => x.id === id && x.aprovada === true);
      if (!p) throw new Error(`vitrine da rua: ${id} não existe ou não está aprovada`);
      const { arquivo, palavra, mostraPt, autor, licenca, licencaUrl, pagina, largura, altura } = p;
      return { id, arquivo, palavra, mostraPt, autor, licenca, licencaUrl, pagina, largura, altura };
    });
    writeFileSync(join(OUT, 'vitrine-rua.json'), JSON.stringify({ placas: EXTERIOR ? [] : vitrine }, null, 2) + '\n');
  }

  /* O blog (29/10/2026). Só sai o artigo com `revisado: true`: cada um foi
     escrito para o site e passa pelo dono antes de ir ao ar (BLOG-PARA-REVISAR.md).
     HF_BLOG_RASCUNHOS=1 mostra os rascunhos numa build LOCAL, para a revisão.
     O blog é em português: a build em inglês sai sem artigos. */
  {
    const blog = readJson('data/blog.json');
    for (const a of blog.artigos) {
      if (typeof a.revisado !== 'boolean') throw new Error(`blog.json: ${a.slug} sem "revisado"`);
    }
    const rascunhos = process.env.HF_BLOG_RASCUNHOS === '1';
    const aprovados = EXTERIOR ? [] : blog.artigos.filter(a => a.revisado || rascunhos);
    /* Texto com `destino` (31/10/2026, plano de SEO aprovado pelo dono) não é
       artigo: é uma seção da página de destino (hoje só /alfabeto-hebraico,
       que disputaria a mesma busca com um artigo do mesmo assunto). Mesma
       trava de revisão; fora da lista do blog, do sitemap do blog e do rodapé. */
    const DESTINOS = new Set(['/alfabeto-hebraico']);
    for (const a of blog.artigos) {
      if (a.destino !== undefined && !DESTINOS.has(a.destino)) throw new Error(`blog.json: ${a.slug} com destino desconhecido ${a.destino}`);
    }
    const artigos = aprovados.filter(a => !a.destino);
    const paginas = aprovados.filter(a => a.destino);
    writeFileSync(join(OUT, 'blog.json'), JSON.stringify({ artigos, paginas }, null, 2) + '\n');
    /* Só a contagem, para o rodapé (que vai ao navegador) saber se há blog. */
    writeFileSync(join(OUT, 'blog-resumo.json'), JSON.stringify({ artigos: artigos.length }) + '\n');
  }

  const catalogue = readJson('data/courses.json');
  const builtModules = course.modules.map(m => ({
    n: m.n, titlePt: m.titlePt, subPt: m.subPt, letters: m.letterIds.length
  }));
  /* Na build em inglês o preço é o `usd` (Paddle, em dólar) e ocupa o lugar
     do `brl`: as telas leem `price.brl` e formatam com `brl()`, que no inglês
     escreve "$47" (app/src/lib/catalog.ts). Sem parcelas, sem desconto do
     PIX, sem preço "depois". Produto sem `usd` não está à venda lá. */
  const emDolar = c => {
    if (!EXTERIOR) return c;
    const usd = Number(c.price && c.price.usd);
    return {
      ...c,
      /* Os textos do curso em inglês, quando o catálogo tem (`titleEn`,
         `taglineEn`...): ocupam o lugar do campo `...Pt` que as telas leem. */
      ...Object.fromEntries(Object.entries(c).filter(([k]) => k.endsWith(SUFIXO))
        .map(([k, v]) => [k.slice(0, -2) + 'Pt', v])),
      ...(usd > 0 ? {} : { aVenda: false }),
      price: { brl: usd > 0 ? usd : 0, listBrl: null, installments: 1, pixDiscountPct: 0 }
    };
  };
  writeFileSync(join(OUT, 'courses.json'), JSON.stringify({
    currency: EXTERIOR ? 'USD' : catalogue.currency,
    /* O site em inglês só vende o curso de alfabetização: os cursos A1, A2 e
       B1 existem só em português e não são anunciados lá (etapa 7). Livro e
       combo ficam, desligados (`aVenda: false`), porque o código os procura
       pelo slug. */
    courses: catalogue.courses
      .filter(c => !EXTERIOR || (c.tipo && c.tipo !== 'curso') || Number(c.price && c.price.usd) > 0)
      .map(emDolar).map(c => {
      const { modulesFrom, ...rest } = c;
      if (modulesFrom && modulesFrom !== 'alfabetizacao') {
        throw new Error(`courses.json: modulesFrom "${modulesFrom}" não corresponde a nenhum curso construído`);
      }
      const modules = modulesFrom ? builtModules : (c.modules ?? []);
      return {
        ...rest,
        modules,
        /* `lessons` já foi `course.totalLetters`, e era o começo do defeito: o
           catálogo passou a anunciar 22 lições onde há 21, e o número errado
           saiu daqui para o cartão de curso, para /cursos e para o CHECKOUT -
           a última tela antes de cobrar. Letra e lição são grandezas
           diferentes; 22 e 21 serem parecidos é o que fez o erro durar.
           app/numeros.mjs reprova o build se ele voltar. */
        stats: modulesFrom
          ? {
              modules: course.modules.length,
              lessons: course.modules.reduce((n, m) => n + m.lessons.length, 0)
            }
          : { modules: modules.length, lessons: null }
      };
    })
  }, null, 2) + '\n');

  /* ── the vowel signs, taught by SOUND and not by name ───────────────── */
  writeFileSync(join(OUT, 'nikud.json'), JSON.stringify({
    intro: nikud.intro,
    dagesh: nikud.dagesh,
    sounds: nikud.sounds.map(s => ({
      sound: s.sound,
      ptApprox: s.ptApprox ?? null,
      signs: s.signs.map(g => ({
        nameHe: NFC(g.nameHe), namePt: g.namePt,
        demo: NFC(g.demo), position: g.position,
        /* Two clips, because they are two different things: the SOUND the sign
           makes on a consonant, and the sign's own NAME. The lab plays the
           first; the card that teaches the sign plays the second. */
        audioId: audioIdFor(g.demo),
        nameAudioId: audioIdFor(g.nameHe),
        /* The vowel mark on its own, for the places that show the sign rather
           than a syllable. Derived here so no component ever takes a Hebrew
           string apart by hand. */
        sign: NFC(g.demo).replace(/^[\u05D0-\u05EA]/, '')
      }))
    }))
  }, null, 2) + '\n');

  /* ── modules 6 and 7, and the real-world scenes ─────────────────────
     Both are shared with the book verbatim; what is added here is the audio id
     per item, computed the same way as everywhere else. */
  const withAudio = w => ({ ...w, he: NFC(w.he), audioId: audioIdFor(w.he) });

  writeFileSync(join(OUT, 'extras.json'), JSON.stringify({
    dagesh: {
      ...extras.dagesh,
      letters: extras.dagesh.letters.map(D => ({
        ...D,
        hard: NFC(D.hard), soft: NFC(D.soft),
        hardWords: D.hardWords.map(withAudio),
        softWords: D.softWords.map(withAudio)
      }))
    },
    finals: extras.finals.map(F => ({
      ...F, base: NFC(F.base), fin: NFC(F.fin),
      word: NFC(F.word), nameHe: NFC(F.nameHe), audioId: audioIdFor(F.word)
    })),
    /* ── ler sem nikud ─────────────────────────────────────────────────
       A fonte lista só a forma APONTADA; a forma nua, a transliteração e a
       glosa saem daqui. `bare` é calculado (tirar o nikud é uma operação, não
       uma opinião) e o resto vem de letters.json, que é onde a palavra foi
       ensinada - é isso que impede a glosa desta lista de divergir da lição,
       e é o que torna verdadeira a frase "você já conhece todas elas". A V19
       recusa o arquivo se alguma palavra daqui não estiver no vocabulário.

       `words` continua saindo achatado, com os três grupos em ordem: o
       gerador de exercícios do módulo 6 sorteia daí, e ele não precisa saber
       que a TELA agrupa. */
    unpointed: (() => {
      const semNikud = t => [...NFC(t)].filter(c => !/[֑-ׇ]/.test(c)).join('');
      const vocab = new Map();
      for (const L of letters) {
        for (const w of [...L.wordsToRead, ...L.wordsToRecognize]) vocab.set(NFC(w.he), w);
      }
      /* E as das lições de som (Vet, Chaf, Fe...), onde {{טוֹב}}, {{סֵפֶר}} e
         {{מֶלֶךְ}} passaram a ser ensinadas. */
      for (const S of extras.sons.licoes) for (const w of S.palavras) if (!vocab.has(NFC(w.he))) vocab.set(NFC(w.he), w);
      const resolver = pointed => {
        const p = NFC(pointed);
        const w = vocab.get(p);
        if (!w) throw new Error(`extras.unpointed: "${p}" não está em letters.json`);
        return {
          bare: semNikud(p), pointed: p,
          translit: w.translit, pt: w.pt, audioId: audioIdFor(p)
        };
      };
      const groups = extras.unpointed.groups.map(g => ({
        id: g.id, titlePt: g.titlePt, notePt: g.notePt, words: g.words.map(resolver)
      }));
      const A = extras.unpointed.ambiguous;
      const readings = A.readings.map(resolver);
      return {
        introPt: extras.unpointed.introPt,
        groups,
        ambiguous: { bare: readings[0].bare, notePt: A.notePt, readings },
        words: groups.flatMap(g => g.words)
      };
    })(),
    gerech: {
      ...extras.gerech,
      signHe: NFC(extras.gerech.signHe),
      letters: extras.gerech.letters.map(g => ({
        ...g, he: NFC(g.he), base: NFC(g.base),
        /* The letter itself is a clip: module 7 is three SOUNDS, and hearing
           צ׳ is the thing the module exists to teach. */
        audioId: audioIdFor(g.he),
        words: g.words.map(w => ({ ...w, he: NFC(w.he), audioId: audioIdFor(w.he) }))
      }))
    },
    /* ── as lições de som (Vet, Chaf, Fe, Tch, Dj, J) ──────────────────
       O par de cada som - o lado com daguesh, ou a letra sem o guéresh - sai
       de letters.json e do quadro do daguesh, e não é reescrito na fonte: o
       contraste que a lição mostra é, letra por letra, o que a lição da
       letra ensinou. */
    sons: extras.sons.licoes.map(S => {
      /* O par: Vet/Chaf/Fe dividem a letra da lição anterior; o Sin e os sons
         modernos dizem de qual letra são o outro lado (`parId`). */
      const parId = S.tipo === 'daguesh' ? S.depoisDe : S.parId;
      const L = letters.find(l => l.id === parId);
      if (!L) throw new Error(`extras.sons: "${S.id}" aponta para a letra "${parId}", que não existe`);
      const D = extras.dagesh.letters.find(d => d.id === parId);
      const parPalavras = S.tipo === 'daguesh' ? (D?.hardWords ?? [])
        /* Do Shin, só as palavras que têm MESMO o ponto à direita. Pelo ponto
           sozinho: na ordem Unicode a vogal vem antes dele (שָׁ = ש + qamats
           + ponto), e "שׁ" colado não aparece na palavra. */
        : S.tipo === 'ponto' ? L.wordsToRead.filter(w => {
            const ponto = [...NFC(S.parHe)].slice(1).join('');
            return NFC(w.he).includes(ponto) && !NFC(w.he).includes([...NFC(S.he)].slice(1).join(''));
          }).slice(0, 4)
        : L.wordsToRead.slice(0, 4);
      return {
        ...S,
        he: NFC(S.he), parHe: NFC(S.parHe),
        finalHe: S.finalHe ? NFC(S.finalHe) : null,
        parId,
        /* O som sozinho: a letra com guéresh, ou a primeira sílaba sem ponto. */
        audioId: audioIdFor(S.tipo === 'gerech' ? S.he : S.silabas[0].he),
        silabas: S.silabas.map(withAudio),
        /* As mesmas vogais, com o ponto: o par exato de cada sílaba. */
        parSilabas: S.tipo !== 'gerech'
          ? L.syllables.slice(0, S.silabas.length)
              .map(s => ({ he: NFC(s.he), translit: s.translit, audioId: audioIdFor(s.he) }))
          : [],
        /* Com a ilustração, quando a palavra tem uma (o coração de לֵב). */
        palavras: S.palavras.map(w => ({ ...word(w), audioId: audioIdFor(w.he) })),
        parPalavras: parPalavras
          .map(w => ({ he: NFC(w.he), translit: w.translit, pt: w.pt, audioId: audioIdFor(w.he) }))
      };
    })
  }, null, 2) + '\n');

  /* ── as frases ──────────────────────────────────────────────────────
     Copiadas com o hebraico normalizado e com o id de áudio já calculado,
     como tudo o mais: uma gravação futura encaixa sem renomear nada. O
     `after` vem do dado e é conferido pela V20 do validate.js.

     A trava da revisão (28/10/2026): uma frase com `"revisado": false` não
     sai daqui, então nenhuma tela, exercício ou rota a vê. É a mesma regra
     dos mini-textos - hebraico escrito para o curso só vai ao ar depois de
     aprovado pelo dono. Sem o campo, a frase é das que já estavam no curso. */
  writeFileSync(join(OUT, 'sentences.json'), JSON.stringify({
    sentences: sentences.sentences.filter(s2 => s2.revisado !== false).map(s2 => ({
      ...s2,
      he: NFC(s2.he),
      audioId: audioIdFor(s2.he),
      words: s2.words.map(w => ({ ...w, he: NFC(w.he), audioId: audioIdFor(w.he) }))
    }))
  }, null, 2) + '\n');

  /* ── o versículo da página pública ──────────────────────────────────
     Duas coisas são CALCULADAS aqui e nunca escritas à mão: a versão sem
     nikud - que é como o texto aparece num rolo de sinagoga, e o argumento
     inteiro da última seção da página - e `after`, a ordem da letra mais
     tardia, que é o que permite dizer "faltam duas letras e você lê isto"
     sem ninguém recontar na mão a cada mudança na ordem do alfabeto. */
  {
    const ordemDe = new Map();
    for (const L of letters) {
      ordemDe.set(NFC(L.letter), L.order);
      if (L.finalForm) ordemDe.set(NFC(L.finalForm), L.order);
    }
    const semNikud = t => [...NFC(t)].filter(c => !/[֑-ׇ]/.test(c)).join('');
    const ordemDe_ = t => {
      const os = [...NFC(t)].filter(c => /[א-ת]/.test(c)).map(c => ordemDe.get(c) ?? 0);
      return os.length ? Math.max(...os) : 0;
    };
    writeFileSync(join(OUT, 'biblia.json'), JSON.stringify({
      verses: biblia.verses.map(v => ({
        ...v,
        he: NFC(v.he),
        bare: semNikud(v.he),
        after: ordemDe_(v.he),
        audioId: audioIdFor(v.he),
        words: v.words.map(w => ({
          ...w, he: NFC(w.he), bare: semNikud(w.he), audioId: audioIdFor(w.he)
        }))
      }))
    }, null, 2) + '\n');
  }

  /* ── as duas eras ───────────────────────────────────────────────────
     Só os pares, sem a nota do arquivo de origem. As frases NÃO são copiadas
     para cá: o par guarda os ids e a tela busca em `sentences.json`, para que
     corrigir uma frase num lugar não deixe uma cópia velha no outro. A raiz
     declarada é conferida contra as duas frases pela V21 do validate.js. */
  writeFileSync(join(OUT, 'eras.json'), JSON.stringify({
    pairs: eras.pairs.map(p => ({ ...p, raiz: NFC(p.raiz) }))
  }, null, 2) + '\n');

  writeFileSync(join(OUT, 'real-world.json'), JSON.stringify({
    scenes: realWorld.scenes.map(s2 => ({
      /* The translit and gloss come from the letter data, so a scene can never
         disagree with the lesson that taught the word. A scene may override
         them - an inflected form such as הַמֶּלֶךְ is not a dictionary entry. */
      ...s2,
      he: NFC(s2.he),
      audioId: audioIdFor(s2.he),
      ...lookupWord(letters, s2.he, s2)
    }))
  }, null, 2) + '\n');

  /* ── culture and history ────────────────────────────────────────────
     Optional, unlockable, and deliberately OUTSIDE the main path: the course
     teaches reading, and a learner who wants to know where the pointinhos came
     from should be able to find out without the alphabet turning into a
     history class. Copied verbatim; the Hebrew inside it is normalised like
     everything else. */
  const culturePath = join(ROOT, 'data/culture.json');
  if (existsSync(culturePath)) {
    const culture = readJson('data/culture.json');
    writeFileSync(join(OUT, 'culture.json'), JSON.stringify({
      cards: culture.cards.map(c => ({
        ...c,
        leadPt: NFC(c.leadPt),
        bodyPt: c.bodyPt.map(NFC)
      }))
    }, null, 2) + '\n');
  } else {
    writeFileSync(join(OUT, 'culture.json'), JSON.stringify({ cards: [] }, null, 2) + '\n');
  }

  /* ── as missões de módulo ───────────────────────────────────────────
     Uma situação de verdade por módulo, que fecha o módulo com "eu usei
     isto" em vez de itens soltos. O arquivo só CITA palavras do curso; o
     significado e a transliteração vêm do próprio curso na hora de montar
     (lib/engine/missao.ts), e `tests/missoes.test.ts` confere que cada
     palavra existe e é legível com as letras daquele módulo. Aqui só a
     forma, para que um arquivo torto pare a build e não a lição. */
  const missoes = readJson('data/missoes.json').missoes;
  const modulosVistos = new Set();
  for (const m of missoes) {
    if (!Number.isInteger(m.modulo) || modulosVistos.has(m.modulo)) {
      throw new Error(`missoes.json: módulo ${m.modulo} inválido ou repetido`);
    }
    modulosVistos.add(m.modulo);
    if (!Array.isArray(m.passos) || m.passos.length < 3) {
      throw new Error(`missoes.json: a missão do módulo ${m.modulo} precisa de pelo menos 3 passos`);
    }
    for (const p of m.passos) {
      if (!['ler', 'achar', 'transliterar'].includes(p.tipo)) {
        throw new Error(`missoes.json: tipo de passo desconhecido "${p.tipo}" no módulo ${m.modulo}`);
      }
    }
  }
  /* ── as fotos de verdade das missões (28/10/2026) ───────────────────
     Do Wikimedia Commons, com autor, licença e página de origem, e só as
     que o dono aprovou (data/fotos-missoes.json). Uma foto aprovada sem
     arquivo ou sem crédito para a build: o crédito sai SEMPRE junto da
     imagem, é o que as licenças pedem. tests/fotos-missoes.test.ts. */
  const LICENCAS_DAS_FOTOS = ['Public domain', 'CC0', 'CC BY 2.0', 'CC BY 2.5', 'CC BY 3.0', 'CC BY 4.0', 'CC BY-SA 2.0', 'CC BY-SA 2.5', 'CC BY-SA 3.0', 'CC BY-SA 4.0'];
  const fotoDaMissao = new Map();
  for (const f of readJson('data/fotos-missoes.json').fotos) {
    if (f.aprovada !== true) continue;
    for (const campo of ['id', 'arquivo', 'pagina', 'autor', 'licenca', 'mostraPt', 'largura', 'altura']) {
      if (!f[campo]) throw new Error(`fotos-missoes.json: a foto ${f.id ?? '?'} não tem ${campo}`);
    }
    if (!LICENCAS_DAS_FOTOS.includes(f.licenca)) throw new Error(`fotos-missoes.json: licença não aceita em ${f.id}: ${f.licenca}`);
    if (!/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(f.pagina)) throw new Error(`fotos-missoes.json: ${f.id} precisa da página do Wikimedia Commons`);
    if (!existsSync(join(ROOT, 'app/public/media/missoes', f.arquivo))) throw new Error(`fotos-missoes.json: falta o arquivo app/public/media/missoes/${f.arquivo}`);
    if (!fotoDaMissao.has(f.missao)) {
      const { aprovada, ...publica } = f;
      void aprovada;
      fotoDaMissao.set(f.missao, publica);
    }
  }

  /* ── o Hebraico na rua (28/10/2026) ──────────────────────────────────
     Fotos reais de placas, do Wikimedia Commons, com as mesmas regras de
     crédito das fotos das missões. Cada placa cita uma palavra do curso
     (`palavra`) e lista todas as palavras do curso que aparecem nela
     (`naPlaca`); só sai a aprovada pelo dono. Vai junto das missões, no
     missoes.json (conteúdo pago). tests/hebraico-na-rua.test.ts. */
  const placasDaRua = [];
  for (const f of readJson('data/hebraico-na-rua.json').placas) {
    if (f.aprovada !== true) continue;
    for (const campo of ['id', 'arquivo', 'palavra', 'pagina', 'autor', 'licenca', 'mostraPt', 'largura', 'altura']) {
      if (!f[campo]) throw new Error(`hebraico-na-rua.json: a placa ${f.id ?? '?'} não tem ${campo}`);
    }
    if (!LICENCAS_DAS_FOTOS.includes(f.licenca)) throw new Error(`hebraico-na-rua.json: licença não aceita em ${f.id}: ${f.licenca}`);
    if (!/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(f.pagina)) throw new Error(`hebraico-na-rua.json: ${f.id} precisa da página do Wikimedia Commons`);
    if (!existsSync(join(ROOT, 'app/public/media/rua', f.arquivo))) throw new Error(`hebraico-na-rua.json: falta o arquivo app/public/media/rua/${f.arquivo}`);
    if (!Array.isArray(f.naPlaca) || !f.naPlaca.map(NFC).includes(NFC(f.palavra))) {
      throw new Error(`hebraico-na-rua.json: ${f.id} precisa listar a própria palavra em naPlaca`);
    }
    const { aprovada, ...publica } = f;
    void aprovada;
    placasDaRua.push({ ...publica, palavra: NFC(f.palavra), naPlaca: f.naPlaca.map(NFC) });
  }

  /* ── ler cardápios (05/11/2026) ──────────────────────────────────────
     Cardápios como chegam em Israel, para ler sem nikud. Só sai o que o dono
     revisou (`revisado: true`); daguesh só em בּ/כּ/פּ, como no curso todo
     (o mesmo ponto no ו é o shuruk). Vão no missoes.json, conteúdo pago. */
  const cardapios = [];
  for (const c of readJson('data/cardapios.json').cardapios) {
    if (c.revisado !== true) continue;
    for (const campo of ['id', 'he', 'nomePt', 'tipoPt']) {
      if (!c[campo]) throw new Error(`cardapios.json: o cardápio ${c.id ?? '?'} não tem ${campo}`);
    }
    if (!Array.isArray(c.itens) || c.itens.length < 4) throw new Error(`cardapios.json: ${c.id} precisa de pelo menos 4 itens`);
    const precos = new Set();
    for (const it of c.itens) {
      if (!it.he || !it.translit || !it.pt || !it.desenho || !Number.isInteger(it.preco) || it.preco <= 0) {
        throw new Error(`cardapios.json: item incompleto em ${c.id}: ${it.he ?? '?'}`);
      }
      const comPonto = [...NFC(it.he).matchAll(/([\u05D0-\u05EA])[\u05B0-\u05BB\u05C1\u05C2\u05C7]*\u05BC/gu)].map(m => m[1]);
      if (comPonto.some(l => !'בכךפףו'.includes(l))) {
        throw new Error(`cardapios.json: daguesh fora de בּ/כּ/פּ em ${c.id}: ${it.he}`);
      }
      /* Os chatafim (ֱ ֲ ֳ) não entram (05/11/2026, pedido do dono): o curso
         ensina a vogal simples, e é ela que vai no lugar (עַ, não עֲ). */
      if (/[\u05B1-\u05B3]/u.test(it.he)) throw new Error(`cardapios.json: chataf em ${c.id}: ${it.he} (use a vogal simples)`);
      precos.add(it.preco);
    }
    if (precos.size < 3) throw new Error(`cardapios.json: ${c.id} precisa de pelo menos 3 preços diferentes`);
    const { revisado, ...publico } = c;
    void revisado;
    cardapios.push({ ...publico, he: NFC(c.he), itens: c.itens.map(it => ({ ...it, he: NFC(it.he) })) });
  }

  /* ── Um dia em Israel (05/11/2026): as placas desenhadas ───────────────
     A primeira parada do mapa (lib/engine/um-dia.ts). Só sai o que o dono
     revisou; as mesmas regras de nikud dos cardápios. */
  const TIPOS_DE_PLACA = ['verde', 'azul', 'branca', 'amarela', 'vermelha', 'loja', 'neon', 'neon-r'];
  const placasDoDia = [];
  const idsDoDia = new Set();
  for (const p of readJson('data/um-dia-em-israel.json').placas) {
    if (p.revisado !== true) continue;
    for (const campo of ['id', 'he', 'translit', 'pt', 'tipo', 'icone', 'missaoPt']) {
      if (!p[campo]) throw new Error(`um-dia-em-israel.json: a placa ${p.id ?? '?'} não tem ${campo}`);
    }
    if (idsDoDia.has(p.id)) throw new Error(`um-dia-em-israel.json: id repetido ${p.id}`);
    idsDoDia.add(p.id);
    if (!TIPOS_DE_PLACA.includes(p.tipo)) throw new Error(`um-dia-em-israel.json: tipo desconhecido em ${p.id}: ${p.tipo}`);
    const comPonto = [...NFC(p.he).matchAll(/([\u05D0-\u05EA])[\u05B0-\u05BB\u05C1\u05C2\u05C7]*\u05BC/gu)].map(m => m[1]);
    if (comPonto.some(l => !'בכךפףו'.includes(l))) throw new Error(`um-dia-em-israel.json: daguesh fora de בּ/כּ/פּ em ${p.id}: ${p.he}`);
    if (/[\u05B1-\u05B3]/u.test(p.he)) throw new Error(`um-dia-em-israel.json: chataf em ${p.id}: ${p.he} (use a vogal simples)`);
    const { revisado, ...publico } = p;
    void revisado;
    placasDoDia.push({ ...publico, he: NFC(p.he) });
  }

  /* ── Um dia em Israel: os cartões de festa (05/11/2026) ──────────────
     A última parada (lib/engine/cartoes.ts). As mesmas regras de nikud; o
     desenho tem de existir em components/ilustra/DesenhoDoCartao.tsx. O
     Worker lê daqui o cartão de um link (worker/src/api/cartao.js). */
  const DESENHOS_DE_CARTAO = ['maca', 'festa', 'taca', 'bolo', 'shabat', 'pessach', 'chanuca', 'purim', 'saude', 'sorte', 'bemvindo'];
  const cartoesDoDia = [];
  const idsDosCartoes = new Set();
  for (const c of readJson('data/cartoes-de-festa.json').cartoes) {
    if (c.revisado !== true) continue;
    for (const campo of ['id', 'he', 'translit', 'pt', 'situacaoPt', 'desenho', 'cor']) {
      if (!c[campo]) throw new Error(`cartoes-de-festa.json: o cartão ${c.id ?? '?'} não tem ${campo}`);
    }
    if (!/^[a-z]+$/.test(c.id)) throw new Error(`cartoes-de-festa.json: id fora do padrão: ${c.id}`);
    if (idsDosCartoes.has(c.id)) throw new Error(`cartoes-de-festa.json: id repetido ${c.id}`);
    idsDosCartoes.add(c.id);
    if (!DESENHOS_DE_CARTAO.includes(c.desenho)) throw new Error(`cartoes-de-festa.json: desenho desconhecido em ${c.id}: ${c.desenho}`);
    if (!/^#[0-9A-Fa-f]{6}$/.test(c.cor)) throw new Error(`cartoes-de-festa.json: cor inválida em ${c.id}: ${c.cor}`);
    const comPonto = [...NFC(c.he).matchAll(/([\u05D0-\u05EA])[\u05B0-\u05BB\u05C1\u05C2\u05C7]*\u05BC/gu)].map(m => m[1]);
    if (comPonto.some(l => !'בכךפףו'.includes(l))) throw new Error(`cartoes-de-festa.json: daguesh fora de בּ/כּ/פּ em ${c.id}: ${c.he}`);
    if (/[\u05B1-\u05B3]/u.test(c.he)) throw new Error(`cartoes-de-festa.json: chataf em ${c.id}: ${c.he} (use a vogal simples)`);
    const { revisado, ...publico } = c;
    void revisado;
    cartoesDoDia.push({ ...publico, he: NFC(c.he) });
  }

  /* ── Um dia em Israel: os nomes no copo (05/11/2026) ─────────────────
     A parada das 10h30 (lib/engine/copos.ts). Só o nome e a leitura; as
     mesmas regras de nikud. */
  const nomesNoCopo = [];
  const idsDosNomes = new Set();
  for (const n of readJson('data/nomes-no-copo.json').nomes) {
    if (n.revisado !== true) continue;
    for (const campo of ['id', 'he', 'translit']) {
      if (!n[campo]) throw new Error(`nomes-no-copo.json: o nome ${n.id ?? '?'} não tem ${campo}`);
    }
    if (idsDosNomes.has(n.id)) throw new Error(`nomes-no-copo.json: id repetido ${n.id}`);
    idsDosNomes.add(n.id);
    const comPonto = [...NFC(n.he).matchAll(/([\u05D0-\u05EA])[\u05B0-\u05BB\u05C1\u05C2\u05C7]*\u05BC/gu)].map(m => m[1]);
    if (comPonto.some(l => !'בכךפףו'.includes(l))) throw new Error(`nomes-no-copo.json: daguesh fora de בּ/כּ/פּ em ${n.id}: ${n.he}`);
    if (/[\u05B1-\u05B3]/u.test(n.he)) throw new Error(`nomes-no-copo.json: chataf em ${n.id}: ${n.he} (use a vogal simples)`);
    nomesNoCopo.push({ id: n.id, he: NFC(n.he), translit: n.translit });
  }

  /* ── Um dia em Israel: a estação de trem (05/11/2026) ────────────────
     A parada das 9h (lib/engine/trem.ts): as cidades do painel de partidas.
     As mesmas regras de nikud. */
  const cidadesDoTrem = [];
  const idsDasCidades = new Set();
  for (const c of readJson('data/estacao-de-trem.json').cidades) {
    if (c.revisado !== true) continue;
    for (const campo of ['id', 'he', 'translit', 'pt']) {
      if (!c[campo]) throw new Error(`estacao-de-trem.json: a cidade ${c.id ?? '?'} não tem ${campo}`);
    }
    if (idsDasCidades.has(c.id)) throw new Error(`estacao-de-trem.json: id repetido ${c.id}`);
    idsDasCidades.add(c.id);
    const comPonto = [...NFC(c.he).matchAll(/([\u05D0-\u05EA])[\u05B0-\u05BB\u05C1\u05C2\u05C7]*\u05BC/gu)].map(m => m[1]);
    if (comPonto.some(l => !'בכךפףו'.includes(l))) throw new Error(`estacao-de-trem.json: daguesh fora de בּ/כּ/פּ em ${c.id}: ${c.he}`);
    if (/[\u05B1-\u05B3]/u.test(c.he)) throw new Error(`estacao-de-trem.json: chataf em ${c.id}: ${c.he} (use a vogal simples)`);
    const { revisado, ...publico } = c;
    void revisado;
    cidadesDoTrem.push({ ...publico, he: NFC(c.he) });
  }

  /* ── Um dia em Israel: o shuk (05/11/2026) ───────────────────────────
     A parada das 12h (lib/engine/shuk.ts): as bancas, com o preço do quilo.
     O preço vai por extenso na tela (1 a 99, e o total de até 3 quilos
     também); as mesmas regras de nikud. */
  const DESENHOS_DE_BANCA = ['tomate', 'pepino', 'maca', 'banana', 'laranja', 'melancia', 'uva', 'limao', 'roma', 'tamara', 'azeitona', 'batata'];
  const bancasDoShuk = [];
  const idsDasBancas = new Set();
  for (const b of readJson('data/shuk.json').bancas) {
    if (b.revisado !== true) continue;
    for (const campo of ['id', 'desenho', 'he', 'translit', 'pt', 'preco']) {
      if (!b[campo]) throw new Error(`shuk.json: a banca ${b.id ?? '?'} não tem ${campo}`);
    }
    if (idsDasBancas.has(b.id)) throw new Error(`shuk.json: id repetido ${b.id}`);
    idsDasBancas.add(b.id);
    if (!DESENHOS_DE_BANCA.includes(b.desenho)) throw new Error(`shuk.json: desenho desconhecido em ${b.id}: ${b.desenho}`);
    if (!Number.isInteger(b.preco) || b.preco < 1 || b.preco * 3 > 99) throw new Error(`shuk.json: preço fora de 1 a 33 em ${b.id}: ${b.preco}`);
    const comPonto = [...NFC(b.he).matchAll(/([\u05D0-\u05EA])[\u05B0-\u05BB\u05C1\u05C2\u05C7]*\u05BC/gu)].map(m => m[1]);
    if (comPonto.some(l => !'בכךפףו'.includes(l))) throw new Error(`shuk.json: daguesh fora de בּ/כּ/פּ em ${b.id}: ${b.he}`);
    if (/[\u05B1-\u05B3]/u.test(b.he)) throw new Error(`shuk.json: chataf em ${b.id}: ${b.he} (use a vogal simples)`);
    const { revisado, ...publico } = b;
    void revisado;
    bancasDoShuk.push({ ...publico, he: NFC(b.he) });
  }

  /* ── Um dia em Israel: o supermercado (05/11/2026) ───────────────────
     A parada das 15h (lib/engine/supermercado.ts): as embalagens da
     prateleira. A forma e o desenho têm de existir em
     components/ilustra/DesenhoDoProduto.tsx; as mesmas regras de nikud. */
  const FORMAS_DE_PRODUTO = ['caixa_alta', 'saco', 'bloco', 'pote', 'bandeja', 'vidro', 'barra', 'garrafa', 'saleiro'];
  const produtosDoSuper = [];
  const idsDosProdutos = new Set();
  for (const p of readJson('data/supermercado.json').produtos) {
    if (p.revisado !== true) continue;
    for (const campo of ['id', 'forma', 'cor', 'he', 'translit', 'pt']) {
      if (!p[campo]) throw new Error(`supermercado.json: o produto ${p.id ?? '?'} não tem ${campo}`);
    }
    if (idsDosProdutos.has(p.id)) throw new Error(`supermercado.json: id repetido ${p.id}`);
    idsDosProdutos.add(p.id);
    if (!FORMAS_DE_PRODUTO.includes(p.forma)) throw new Error(`supermercado.json: forma desconhecida em ${p.id}: ${p.forma}`);
    if (!/^#[0-9A-Fa-f]{6}$/.test(p.cor)) throw new Error(`supermercado.json: cor inválida em ${p.id}: ${p.cor}`);
    const comPonto = [...NFC(p.he).matchAll(/([\u05D0-\u05EA])[\u05B0-\u05BB\u05C1\u05C2\u05C7]*\u05BC/gu)].map(m => m[1]);
    if (comPonto.some(l => !'בכךפףו'.includes(l))) throw new Error(`supermercado.json: daguesh fora de בּ/כּ/פּ em ${p.id}: ${p.he}`);
    if (/[\u05B1-\u05B3]/u.test(p.he)) throw new Error(`supermercado.json: chataf em ${p.id}: ${p.he} (use a vogal simples)`);
    const { revisado, ...publico } = p;
    void revisado;
    produtosDoSuper.push({ ...publico, he: NFC(p.he) });
  }

  /* ── Um dia em Israel: as mensagens do Dani (05/11/2026) ─────────────
     A parada das 18h (lib/engine/mensagens.ts): uma conversa de celular. A
     pontuação vai dentro do hebraico; as mesmas regras de nikud. */
  const mensagensDoDani = [];
  const idsDasMensagens = new Set();
  for (const m of readJson('data/mensagens-do-dani.json').mensagens) {
    if (m.revisado !== true) continue;
    for (const campo of ['id', 'he', 'translit', 'pt', 'hora']) {
      if (!m[campo]) throw new Error(`mensagens-do-dani.json: a mensagem ${m.id ?? '?'} não tem ${campo}`);
    }
    if (idsDasMensagens.has(m.id)) throw new Error(`mensagens-do-dani.json: id repetido ${m.id}`);
    idsDasMensagens.add(m.id);
    if (!/^\d\d:\d\d$/.test(m.hora)) throw new Error(`mensagens-do-dani.json: hora inválida em ${m.id}: ${m.hora}`);
    const comPonto = [...NFC(m.he).matchAll(/([\u05D0-\u05EA])[\u05B0-\u05BB\u05C1\u05C2\u05C7]*\u05BC/gu)].map(x => x[1]);
    if (comPonto.some(l => !'בכךפףו'.includes(l))) throw new Error(`mensagens-do-dani.json: daguesh fora de בּ/כּ/פּ em ${m.id}: ${m.he}`);
    if (/[\u05B1-\u05B3]/u.test(m.he)) throw new Error(`mensagens-do-dani.json: chataf em ${m.id}: ${m.he} (use a vogal simples)`);
    const { revisado, ...publico } = m;
    void revisado;
    mensagensDoDani.push({ ...publico, he: NFC(m.he) });
  }

  /* ── os mini-textos de leitura corrida ─────────────────────────────
     Um texto curto por módulo, do 3 ao 7. São as únicas frases do curso
     escritas para ele, e por isso cada um nasce com `revisado: false`: o
     curso só mostra o texto depois que alguém que fala hebraico o aprovou
     (lib/engine/textos.ts). Aqui, como nas missões, só a forma. */
  const textos = readJson('data/textos.json').textos;
  for (const t of textos) {
    if (!Number.isInteger(t.modulo) || typeof t.revisado !== 'boolean') {
      throw new Error(`textos.json: texto do módulo ${t.modulo} sem módulo ou sem "revisado"`);
    }
    if (!Array.isArray(t.linhas) || !t.linhas.length || !Array.isArray(t.perguntas) || !t.perguntas.length) {
      throw new Error(`textos.json: o texto do módulo ${t.modulo} precisa de linhas e perguntas`);
    }
  }
  /* Na build em inglês, o rascunho ainda não revisado fica de fora, e a
     tradução dele não é cobrada: o aluno não o veria, e o português dele
     ainda pode mudar na revisão. Aprovado, ele volta e passa a ser cobrado. */
  if (EXTERIOR) {
    textos.forEach((t, i) => {
      if (t.revisado) return;
      for (const chave of [...FALTAS.keys()]) if (chave.startsWith(`textos:textos/#${i}/`)) FALTAS.delete(chave);
    });
  }
  const textosNaBuild = EXTERIOR ? textos.filter(t => t.revisado) : textos;
  const pontua = x => ({ ...x, he: NFC(x.he) });
  writeFileSync(join(OUT, 'textos.json'), JSON.stringify({
    /* Cada linha com o id de áudio: a gravação dela (onda 4, gen-audio.mjs)
       é o que o botão da linha e o "ouvir o texto" tocam. */
    textos: textosNaBuild.map(t => ({
      ...t,
      linhas: t.linhas.map(l => ({ ...pontua(l), audioId: audioIdFor(l.he) })),
      /* As palavras novas também: a gravação de cada uma (gen-audio.mjs,
         "palavras do texto N") toca na lista embaixo do texto e, depois de
         lido, no vocabulário e no treino. O prefixo solto e o nome próprio
         não têm gravação e ficam sem id. */
      novas: (t.novas || []).map(w => {
        const x = pontua(w);
        if (x.he.includes('־') || /\(nome\)\s*$/.test(x.pt)) return x;
        return { ...x, audioId: audioIdFor(x.he.replace(/[?!.,:]+$/u, '').trim()) };
      })
    }))
  }, null, 2) + '\n');

  /* ── as leituras bônus (27/09/2026) ─────────────────────────────────
     Textos bíblicos e bênçãos, trocados por XP em Recompensas. Pagos como
     o resto: vão por /api/content, nunca no pacote. `after` é a letra mais
     tardia da leitura - a loja só oferece o que o aluno já consegue ler. */
  {
    const { leituras: bonus, guia } = readJson('data/bonus.json');
    const ordem = new Map();
    for (const L of letters) {
      ordem.set(NFC(L.letter), L.order);
      if (L.finalForm) ordem.set(NFC(L.finalForm), L.order);
    }
    const ids = new Set();
    for (const b of bonus) {
      if (!/^[a-z0-9-]+$/.test(b.id || '') || ids.has(b.id)) throw new Error(`bonus.json: id inválido ou repetido "${b.id}"`);
      ids.add(b.id);
      if (!['texto', 'curto'].includes(b.tipo)) throw new Error(`bonus.json: ${b.id} com tipo "${b.tipo}"`);
      if (typeof b.revisado !== 'boolean') throw new Error(`bonus.json: ${b.id} sem "revisado"`);
      if (!Array.isArray(b.linhas) || !b.linhas.length) throw new Error(`bonus.json: ${b.id} sem linhas`);
      for (const l of b.linhas) {
        for (const c of NFC(l.he)) {
          if (/[א-ת]/.test(c) && !ordem.has(c)) throw new Error(`bonus.json: ${b.id} usa "${c}", que o curso não ensina`);
        }
        if (!l.translit || !l.pt) throw new Error(`bonus.json: ${b.id} tem linha sem transliteração ou tradução`);
      }
    }
    writeFileSync(join(OUT, 'bonus.json'), JSON.stringify({
      leituras: bonus.map(b => ({
        ...b,
        after: Math.max(...b.linhas.flatMap(l => [...NFC(l.he)].map(c => ordem.get(c) ?? 0))),
        linhas: b.linhas.map(l => ({ ...l, he: NFC(l.he), audioId: audioIdFor(l.he) }))
      })),
      /* O guia «O nikud da Bíblia»: cada exemplo com a gravação dele (a do
         texto sem te'amim, quando `ouvir` existe). */
      guia: guia && {
        ...guia,
        secoes: guia.secoes.map(s => ({
          ...s,
          exemplos: s.exemplos.map(e => ({ ...e, he: NFC(e.he), audioId: audioIdFor(e.ouvir ?? e.he) }))
        }))
      }
    }, null, 2) + '\n');
  }

  /* As explicações do professor (data/gravacoes-professor.json): o id com
     significado, o título que a tela mostra e o clipe do catálogo. O roteiro
     fica de fora: é só para quem grava. */
  {
    /* As escritas e as geradas (abertura de módulo, apresentação e erro
       comum de cada letra); a validação dos ids está lá. */
    /* No site em inglês, nenhuma: são explicações FALADAS em português (a
       tela some sozinha sem a gravação, GravacaoDoProfessor.tsx). Voltam
       quando o professor gravar as versões em inglês (PLANO-INGLES.md). */
    const gravacoes = EXTERIOR ? [] : gravacoesDoProfessor(ROOT);
    writeFileSync(join(OUT, 'professor.json'), JSON.stringify({
      gravacoes: Object.fromEntries(gravacoes.map(g => [g.id, {
        tituloPt: g.tituloPt, audioId: audioIdFor(`professor ${g.id}`)
      }]))
    }, null, 2) + '\n');
  }

  writeFileSync(join(OUT, 'missoes.json'), JSON.stringify({
    missoes: missoes.map(m => ({
      ...m,
      ...(fotoDaMissao.has(m.modulo) ? { foto: fotoDaMissao.get(m.modulo) } : {}),
      passos: m.passos.map(p => ({
        ...p,
        he: NFC(p.he),
        ...(p.erradas ? { erradas: p.erradas.map(NFC) } : {})
      }))
    })),
    rua: placasDaRua,
    cardapios,
    umDia: { placas: placasDoDia, cartoes: cartoesDoDia, copos: nomesNoCopo, trem: cidadesDoTrem, shuk: bancasDoShuk, super: produtosDoSuper, mensagens: mensagensDoDani }
  }, null, 2) + '\n');

  /* ── o curso Hebraico A1 (06/10/2026) ────────────────────────────────
     Pago, como o resto, mas de OUTRO curso: sai por /api/content/a1, que só
     responde a quem comprou o hebraico-a1 (worker/src/api/content-a1.js).
     Nada daqui entra no molde do alfabeto. Cada hebraico que se ouve (as
     palavras, as linhas do diálogo e os itens de escuta e de ditado) ganha o
     id da sua gravação, pela mesma conta de sempre (audioIdFor).

     A fonte é data/a1/: curso.json (módulos, ordem, certificado) e um
     arquivo por unidade. Saem DOIS arquivos:
       · a1.json, o que o navegador recebe: o curso, as unidades e, do exame,
         só as regras e os nomes das partes;
       · a1-exame.json, as perguntas do exame COM o gabarito, que só o Worker
         lê (api/exame-a1.js) - o exame é corrigido no servidor. */
  const a1Curso = readJson('data/a1/curso.json');
  const a1Nums = a1Curso.modulos.flatMap(m => m.unidades);
  const a1Unidades = a1Nums.map(n => readJson(`data/a1/unidades/u${String(n).padStart(2, '0')}.json`));
  const a1Exame = readJson('data/a1/exame.json');
  const { _: _a1HistNota, ...a1Historia } = readJson('data/a1/historia.json');
  void _a1HistNota;
  const comAudio = x => ({ ...x, he: NFC(x.he), audioId: audioIdFor(x.he) });
  const itemA1 = it => (it.t === 'ouvir' || it.t === 'ditado' ? { ...it, he: NFC(it.he), audioId: audioIdFor(it.he) }
    : it.t === 'falar' ? { ...it, exemplo: NFC(it.exemplo), audioId: audioIdFor(it.exemplo) } : it);
  const unidadeA1 = u => ({
    ...u,
    palavras: u.palavras.map(w => (w.formas ? { ...w, formas: w.formas.map(NFC) } : comAudio(w))),
    dialogo: {
      ...u.dialogo,
      linhas: u.dialogo.linhas.map(comAudio),
      glossario: (u.dialogo.glossario || []).map(comAudio)
    },
    ...(u.leitura ? { leitura: { ...u.leitura, linhas: u.leitura.linhas.map(comAudio), perguntas: u.leitura.perguntas.map(itemA1) } } : {}),
    exercicios: u.exercicios.map(itemA1)
  });
  const { _: _a1Nota, ...a1Publico } = a1Curso;
  void _a1Nota;
  writeFileSync(join(OUT, 'a1.json'), JSON.stringify({
    ...a1Publico,
    unidades: a1Unidades.map(unidadeA1),
    historia: a1Historia,
    exame: {
      sorteio: a1Exame.sorteio,
      aprovacao: a1Exame.aprovacao,
      partes: a1Exame.partes.map(p => ({ id: p.id, tituloPt: p.tituloPt, unidades: p.unidades }))
    }
  }) + '\n');
  writeFileSync(join(OUT, 'a1-exame.json'), JSON.stringify({
    sorteio: a1Exame.sorteio,
    aprovacao: a1Exame.aprovacao,
    partes: a1Exame.partes.map(p => ({ ...p, itens: p.itens.map(itemA1) }))
  }) + '\n');

  /* ── Raízes Sefarditas (21/10/2026) ────────────────────────────────
     Outro produto, outro direito (raizes-sefarditas): sai por
     /api/content/raizes (worker/src/api/content-raizes.js), nunca no pacote.
     Desde 22/10/2026 o CONTEÚDO mora num repositório privado,
     Moshikgueta/hebraicofluente-raizes, clonado em raizes/ (ignorado pelo
     git daqui), como o editorial; HF_RAIZES aponta para outro lugar.
     Só vão ao aluno as afirmações que podem aparecer no texto (VERIFICADO
     ou CONTESTADO) e as fontes que elas citam.
     Sem o clone (publicação sem RAIZES_TOKEN, ou quem só trabalha no curso
     de hebraico), sai um raizes.json VAZIO, com a mesma forma: o site
     inteiro builda, e as telas de Raízes dizem que o conteúdo não veio. */
  const RAIZES = process.env.HF_RAIZES || join(ROOT, 'raizes');
  const lerRaizes = p => JSON.parse(readFileSync(join(RAIZES, p), 'utf8'));
  let raizesJson;
  if (existsSync(join(RAIZES, 'data/curso.json'))) {
    const raizesCurso = lerRaizes('data/curso.json');
    const raizesModulos = raizesCurso.modulos
      .filter(m => existsSync(join(RAIZES, `data/modulos/m${String(m.n).padStart(2, '0')}.json`)))
      .map(m => {
        const { _: _nota, ...modulo } = lerRaizes(`data/modulos/m${String(m.n).padStart(2, '0')}.json`);
        void _nota;
        return modulo;
      });
    const NO_TEXTO = new Set(['VERIFICADO', 'CONTESTADO']);
    const raizesAfirmacoes = lerRaizes('data/afirmacoes.json').afirmacoes
      .filter(a => NO_TEXTO.has(a.status))
      .map(({ id, modulo, afirmacao, fontes, evidencia, limitacoes, interpretacoes_concorrentes, status, pagina_ou_secao, acesso, data_consulta }) =>
        ({ id, modulo, afirmacao, fontes, evidencia, limitacoes, interpretacoes: interpretacoes_concorrentes, status, pagina: pagina_ou_secao, acesso, consulta: data_consulta }));
    const citadas = new Set(raizesAfirmacoes.flatMap(a => a.fontes));
    const { _: _mapaNota, ...raizesMapa } = lerRaizes('data/mapa-peninsula.json');
    void _mapaNota;
    citadas.add(raizesMapa.fonte);
    /* Os outros desenhos (data/mapa-<nome>.json), que uma atividade pede pelo
       campo `desenho`. A península continua em `mapa`. */
    const raizesMapas = {};
    for (const arq of readdirSync(join(RAIZES, 'data')).filter(n => /^mapa-.+\.json$/.test(n) && n !== 'mapa-peninsula.json')) {
      const { _: _n, ...d } = lerRaizes(`data/${arq}`);
      void _n;
      raizesMapas[arq.slice(5, -5)] = d;
      citadas.add(d.fonte);
    }
    const raizesFontes = lerRaizes('data/fontes.json').fontes
      .filter(f => citadas.has(f.id))
      .map(({ id, nivel, tipo, autor, titulo, ano, editora_ou_periodico, url, acesso, data_consulta, abnt }) =>
        ({ id, nivel, tipo, autor, titulo, ano, publicacao: editora_ou_periodico, url, acesso, consulta: data_consulta, abnt }));
    const { _: _cursoNota, ...raizesPublico } = raizesCurso;
    void _cursoNota;
    /* O Atlas (data/atlas.json) e as páginas de lugar (data/lugares/*.json),
       atrás do mesmo portão. As notas `_` ficam no repositório. */
    const semNota = d => { const { _: _n, ...resto } = d; void _n; return resto; };
    const raizesAtlas = existsSync(join(RAIZES, 'data/atlas.json')) ? semNota(lerRaizes('data/atlas.json')) : undefined;
    const raizesLugares = {};
    if (existsSync(join(RAIZES, 'data/lugares'))) {
      for (const arq of readdirSync(join(RAIZES, 'data/lugares')).filter(n => n.endsWith('.json'))) {
        raizesLugares[arq.slice(0, -5)] = semNota(lerRaizes(`data/lugares/${arq}`));
      }
    }
    /* Os personagens históricos (data/personagens.json, 22/10/2026). */
    const raizesPersonagens = existsSync(join(RAIZES, 'data/personagens.json')) ? lerRaizes('data/personagens.json').personagens : undefined;
    /* As fotos escolhidas (data/fotos.json, 22/10/2026): cada uma com autor, licença e
       página de origem. O arquivo vai para app/public/raizes/fotos/, atrás do portão
       de /raizes (o mesmo direito do conteúdo). Sem ficha, não vai. */
    let raizesFotos;
    if (existsSync(join(RAIZES, 'data/fotos.json'))) {
      raizesFotos = lerRaizes('data/fotos.json').fotos;
      const destino = join(ROOT, 'app/public/raizes/fotos');
      rmSync(destino, { recursive: true, force: true });
      mkdirSync(destino, { recursive: true });
      for (const f of raizesFotos) {
        if (!f.autor || !f.licenca || !f.pagina) throw new Error(`foto ${f.id}: falta autor, licença ou página`);
        copyFileSync(join(RAIZES, 'fotos/escolhidas', f.arquivo), join(destino, f.arquivo));
      }
    }
    raizesJson = { ...raizesPublico, conteudo: raizesModulos, afirmacoes: raizesAfirmacoes, fontes: raizesFontes, mapa: raizesMapa, mapas: raizesMapas, atlas: raizesAtlas, lugares: raizesLugares, personagens: raizesPersonagens, fotos: raizesFotos };
  } else {
    console.warn(`  ! Raízes Sefarditas: ${RAIZES}/data não existe; raizes.json sai vazio.`);
    raizesJson = {
      slug: 'raizes-sefarditas', titulo: 'Raízes Sefarditas', subtitulo: '', aviso: '', semConteudo: true,
      edicao: { numero: 0, rotulo: '', atualizadoEm: '', revisaoHumana: false },
      regras: { desbloqueio: '', conclusaoDoModulo: '' },
      modulos: [], conquistas: [],
      certificado: { titulo: '', curso: '', subtitulo: '', texto: '', naoCertifica: [], nota: '' },
      conteudo: [], afirmacoes: [], fontes: [],
      mapa: { quadro: { oeste: 0, leste: 1, sul: 0, norte: 1 }, largura: 1, altura: 1, projecao: { latitudePadrao: 0, escala: 1 }, terra: '', fonte: '' }
    };
  }
  writeFileSync(join(OUT, 'raizes.json'), JSON.stringify(raizesJson) + '\n');

  /* ── stroke geometry ────────────────────────────────────────────────
     The SVG in assets/stroke-order/ is the printed diagram: the whole letter,
     with numbered start dots. This is the same run's machine-readable half -
     one path per stroke, where the pen lands, which way it sets off - and it is
     what the app animates, revealing he, alef and qof one stroke at a time.

     Copied verbatim, and only if present. A missing file is not an error: the
     tracing screen falls back to the static diagram, which is what it showed
     before this existed. */
  const strokePaths = join(ROOT, 'data/stroke-paths.json');
  writeFileSync(
    join(OUT, 'stroke-paths.json'),
    existsSync(strokePaths)
      ? readFileSync(strokePaths, 'utf8')
      : JSON.stringify({ box: 200, letters: {} }, null, 2) + '\n'
  );

  /* ── static assets the app serves ───────────────────────────────────── */
  const pub = join(ROOT, 'app/public');
  mkdirSync(pub, { recursive: true });
  cpSync(join(ROOT, 'assets/fonts'), join(pub, 'fonts'), { recursive: true });
  cpSync(join(ROOT, 'assets/stroke-order'), join(pub, 'stroke-order'), { recursive: true });

  /* A amostra pública do traçado. `/stroke-order/` inteiro fica atrás do
     portão (worker/src/gate.js) desde 24/09/2026: são 27 diagramas, material
     do curso, e a landing usa DOIS. Só esses dois são copiados para cá, e a
     pasta é recriada do zero a cada exportação, para que uma letra tirada da
     lista não continue publicada por esquecimento. Uma letra nova na landing
     entra nesta lista - tests/conteudo.test.ts reprova se faltar. */
  const AMOSTRA_TRACADO = ['alef', 'shin'];
  const amostra = join(pub, 'tracado-amostra');
  rmSync(amostra, { recursive: true, force: true });
  mkdirSync(amostra, { recursive: true });
  for (const id of AMOSTRA_TRACADO) {
    cpSync(join(ROOT, 'assets/stroke-order', `${id}.svg`), join(amostra, `${id}.svg`));
  }

  /* A amostra pública do ÁUDIO (28/09/2026), pelo mesmo motivo da do
     traçado: /audio/ inteiro fica atrás do portão, e o "Ouça e fale" da
     landing (components/landing/OuvirEFalar.tsx) toca quatro gravações.
     Copiadas com nome legível e recriadas do zero a cada exportação.
     A lista é a mesma de lib/amostra-audio.ts - tests/amostra-audio.test.ts
     confere as duas. Uma gravação que falte derruba a exportação: a capa não
     pode ir ao ar com um botão "Ouvir" mudo. */
  const AMOSTRA_AUDIO = {
    sha: 'שַׁ', ma: 'מַ', la: 'לַ', shalom: 'שָׁלוֹם',
    shin: 'שִׁין', mem: 'מֵם', lamed: 'לָמֶד',
    alef: 'אָלֶף', 'alef-a': 'אַ', 'alef-e': 'אֶ', 'alef-i': 'אִ', 'alef-o': 'אוֹ', 'alef-u': 'אוּ',
    aba: 'אַבָּא', etmol: 'אֶתְמוֹל', ochel: 'אֹכֶל',
    /* As páginas do alfabeto (23/10/2026, app/src/lib/alfabeto-publico.ts). */
    tav: 'תָו', ima: 'אִמָא', emet: 'אֶמֶת', laila: 'לַיְלָה'
  };
  const amostraAudio = join(pub, 'amostra-audio');
  rmSync(amostraAudio, { recursive: true, force: true });
  mkdirSync(amostraAudio, { recursive: true });
  for (const [slug, he] of Object.entries(AMOSTRA_AUDIO)) {
    const f = join(ROOT, 'audio', `${audioIdFor(he)}.mp3`);
    if (!existsSync(f)) throw new Error(`amostra de áudio: falta a gravação de ${he} (${audioIdFor(he)}.mp3)`);
    cpSync(f, join(amostraAudio, `${slug}.mp3`));
  }

  /* The recordings land in audio/ at the repo root - one obvious place for a
     speaker to drop files - and are copied in from there. The app serves
     whatever is present and marks the rest as "áudio em breve"; nothing has to
     be edited when a wave arrives. */
  const drop = join(ROOT, 'audio');
  /* Cleared, not merged. Copying without clearing left a withdrawn recording in
     app/public/audio/, so the app went on offering a clip that had been pulled -
     and the manifest, which is built from this directory, went on claiming it. */
  rmSync(join(pub, 'audio'), { recursive: true, force: true });
  mkdirSync(join(pub, 'audio'), { recursive: true });
  if (existsSync(drop)) {
    for (const f of readdirSync(drop).filter(f => f.endsWith('.mp3'))) {
      cpSync(join(drop, f), join(pub, 'audio', f));
    }
  }


  /* The audio manifest is generated from what is actually on disk, so the app
     can never claim a clip it does not have. Today that list is empty. */
  const audioDir = join(pub, 'audio');
  const clips = existsSync(audioDir)
    ? readdirSync(audioDir).filter(f => f.endsWith('.mp3')).map(f => f.replace(/\.mp3$/, ''))
    : [];
  writeFileSync(join(ROOT, 'app/src/lib/audio-manifest.ts'),
    `/* GENERATED by tools/export-content.mjs from the contents of public/audio/.\n` +
    ` *\n` +
    ` * Empty means there are no recordings yet. That is the current, honest state\n` +
    ` * of the course: see ARCHITECTURE.md \u00a76.3. Everything downstream - the audio\n` +
    ` * button, the listening exercises, the quiz composition - reads this array and\n` +
    ` * degrades visibly rather than inventing a pronunciation. */\n` +
    `export const AUDIO_MANIFEST: readonly string[] = ${JSON.stringify(clips)};\n`);

  /* Os vídeos do "Me explica, Moshik" (28/10/2026): um por letra, em video/
     na raiz, com o nome da letra (`alef.mp4`) e, se houver, a legenda
     (`alef.vtt`). Copiados para public/video/, que fica atrás do portão
     (gate.js), e listados no manifesto: a folha só mostra o vídeo que existe.
     Nome que não é letra do curso, formato que não é mp4 ou arquivo acima de
     25 MiB (o teto de um arquivo no servidor de ativos da Cloudflare) param
     a build, com o nome do arquivo. */
  const videos = prepararVideos(join(ROOT, 'video'), join(pub, 'video'), new Set(letters.map(l => l.id)));
  writeFileSync(join(ROOT, 'app/src/lib/video-manifest.ts'),
    `/* GERADO por tools/export-content.mjs a partir de video/ na raiz (ver video/README.md).\n` +
    ` * Uma entrada por letra com vídeo do professor; vazio = nenhum vídeo ainda. */\n` +
    `export type VideoDaLetra = { letra: string; legenda: boolean };\n` +
    `export const VIDEO_MANIFEST: readonly VideoDaLetra[] = ${JSON.stringify(videos)};\n`);
  if (videos.length) console.log(`  vídeo: ${videos.length} letra(s) com vídeo em app/public/video`);

  const words = letters.reduce((a, l) => a + l.wordsToRead.length + l.wordsToRecognize.length, 0);
  console.log(`  ${letters.length} letras · ${modules.length} módulos · ${words} palavras → app/content/`);
  console.log(`  áudio: ${clips.length} arquivo(s) em app/public/audio` +
    (clips.length ? '' : ' - os exercícios de audição ficam marcados como indisponíveis'));

  if (EXTERIOR) relatarTraducao();
}

/* O que ficou sem inglês vai para app/content/_traducao.json e para o resumo.
   Com HF_I18N_ESTRITO=1 (a publicação do site em inglês), qualquer falta
   para a build: português no site de fora é defeito, não rascunho. */
function relatarTraducao() {
  const faltas = [...FALTAS.values()];
  writeFileSync(join(OUT, '_traducao.json'), JSON.stringify({ faltas }, null, 2) + '\n');
  const por = {};
  for (const f of faltas) por[f.motivo] = (por[f.motivo] ?? 0) + 1;
  const resumo = Object.entries(por).map(([m, n]) => `${n} ${m}`).join(', ');
  console.log(`  ${NOME_DO_IDIOMA}: ${faltas.length ? resumo : 'completo'} (app/content/_traducao.json)`);
  if (faltas.length && process.env.HF_I18N_ESTRITO === '1') {
    throw new Error(`build em ${NOME_DO_IDIOMA} com ${faltas.length} texto(s) sem tradução válida: ${resumo}`);
  }
}

main();
