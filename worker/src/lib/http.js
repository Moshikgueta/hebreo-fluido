/* Respostas HTTP da API.
 * ─────────────────────────────────────────────────────────────────────────
 * Duas regras, e as duas já foram aprendidas do jeito difícil por outra
 * plataforma antes desta:
 *
 *   1. `Cache-Control: no-store` em TODA resposta de API. Uma delas carrega o
 *      nome, o e-mail e os cursos de um aluno; um proxy que guarde isso
 *      entrega a conta de uma pessoa para a próxima.
 *   2. O erro que sai daqui é um CÓDIGO, nunca uma frase. O texto em português
 *      vive no app (lib/account/types.ts), num lugar só. Servidor escrevendo
 *      texto de interface é como se acaba com duas mensagens diferentes para
 *      o mesmo problema.
 */

export function json(body, status = 200, headers = {}) {
  const h = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  for (const [k, v] of Object.entries(headers || {})) {
    /* Um array vira vários cabeçalhos em vez de um só - é assim que uma
       resposta consegue mandar mais de um Set-Cookie. Espalhar num objeto
       colapsaria para o último. */
    if (Array.isArray(v)) for (const one of v) h.append(k, one);
    else h.set(k, v);
  }
  return new Response(JSON.stringify(body), { status, headers: h });
}

/** Códigos fechados, iguais aos de app/src/lib/account/types.ts. */
export const fail = (code, status = 400) => json({ error: code }, status);

/* Um serviço que o dono ainda não ligou (pagamento sem chave, e-mail sem
 * RESEND_API_KEY). É 503, como sempre foi, para a tela dizer "ainda não está
 * ligado"; mas é um estado conhecido, que a saúde já mostra, e não uma pane.
 * A marca abaixo tira esta resposta da conta de erros do alerta diário
 * (worker.js): a conferência de produção pede o checkout a cada publicação,
 * e nove publicações num dia viravam "10 erros do servidor" sem erro nenhum. */
export const DESLIGADO = 'X-HF-Desligado';
export const desligado = (code) => json({ error: code }, 503, { [DESLIGADO]: '1' });

export const notSignedIn = () => fail('not-signed-in', 401);
export const serverError = () => fail('server', 500);

/**
 * Corpo JSON com limite de tamanho. Um POST de 10 MB não é um cadastro.
 *
 * O limite é em BYTES e é conferido duas vezes: antes de ler, pelo
 * `Content-Length` que o cliente declarou - o que poupa o trabalho de
 * materializar um corpo que já se sabe grande demais -, e depois de ler, em
 * bytes de verdade. A versão anterior media `raw.length`, que conta unidades
 * UTF-16: um corpo em hebraico passava com o dobro do tamanho nominal, e um
 * corpo de 100 MB era lido inteiro antes de ser recusado.
 */
/** O corpo cru, lido aos pedaços e cortado no teto. `null` = grande demais.
 *  Existe para o upload de áudio, que conferia o Content-Length declarado e
 *  depois lia o corpo inteiro: sem o cabeçalho (chunked), o arquivo todo era
 *  materializado antes de ser recusado (auditoria de 28/09, SEC-006). */
export async function readBytes(request, maxBytes) {
  const declarado = Number(request.headers.get('Content-Length') || 0);
  if (Number.isFinite(declarado) && declarado > maxBytes) return null;
  if (!request.body || typeof request.body.getReader !== 'function') {
    const buf = new Uint8Array(await request.arrayBuffer());
    return buf.length > maxBytes ? null : buf;
  }
  const reader = request.body.getReader();
  const pedacos = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      try { await reader.cancel(); } catch { /* já era */ }
      return null;
    }
    pedacos.push(value);
  }
  const tudo = new Uint8Array(total);
  let at = 0;
  for (const p of pedacos) { tudo.set(p, at); at += p.byteLength; }
  return tudo;
}

export async function readJson(request, maxBytes = 8 * 1024) {
  const declarado = Number(request.headers.get('Content-Length') || 0);
  if (Number.isFinite(declarado) && declarado > maxBytes) return null;

  /* Lê aos pedaços e PARA no limite. Um corpo sem Content-Length (chunked)
     passava pela conferência de cima e era lido inteiro antes da de baixo -
     cem megabytes materializados para responder "grande demais". Agora o
     leitor solta a conexão no byte seguinte ao teto. */
  let raw = '';
  if (request.body && typeof request.body.getReader === 'function') {
    const reader = request.body.getReader();
    const pedacos = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        try { await reader.cancel(); } catch { /* já era */ }
        return null;
      }
      pedacos.push(value);
    }
    const tudo = new Uint8Array(total);
    let at = 0;
    for (const p of pedacos) { tudo.set(p, at); at += p.byteLength; }
    raw = new TextDecoder().decode(tudo);
  } else {
    raw = await request.text();
    if (new TextEncoder().encode(raw).length > maxBytes) return null;
  }
  try { return JSON.parse(raw || '{}'); } catch { return null; }
}
