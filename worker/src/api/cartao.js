/* Mandar um cartão de festa a um amigo (05/11/2026, pedido do dono).
 * ─────────────────────────────────────────────────────────────────────────
 * Na última parada de Um dia em Israel, o aluno escolhe um cartão e escreve
 * os nomes; quem recebe o link abre o cartão numa página pública
 * (/cartao-de-festa), sem conta.
 *
 *   POST /api/cartao {cartao, para, de}  → {token}   (aluno com o curso)
 *   GET  /api/cartao?t=<token>           → {cartao: {id, he, translit, pt, desenho, cor}, para, de}
 *
 * Assinado pelo mesmo motivo do desafio (api/desafio.js): a página é pública
 * e leva o nome do curso, e um link solto deixaria qualquer um pôr ali o
 * texto que quisesse. O token só carrega o id de um cartão que EXISTE e dois
 * nomes curtos, só de letras (sem números, ponto, barra ou dois-pontos:
 * nunca um endereço). O hebraico, a leitura e o sentido saem do conteúdo do curso no
 * servidor, nunca do link. Quem manda é sempre um aluno com o curso.
 *
 * Nada é gravado: nem quem mandou, nem quem abriu, nem os nomes. O site não
 * manda mensagem nenhuma: o aluno leva o link ele mesmo.
 */

import { fail, json, notSignedIn, readJson } from '../lib/http.js';
import { hasEntitlement } from '../lib/db.js';
import { b64url, b64urlDecode, hmacB64, timingSafeEqual } from '../lib/crypto.js';
import { requireAccount } from './auth.js';
import missoes from '../../../app/content/missoes.json';

const COURSE = 'alfabetizacao';
const PREFIXO = 'cartao:v1:';
/* O mesmo limite e as mesmas regras de app/src/lib/engine/cartoes.ts. */
export const NOME_MAX = 24;
const INVISIVEIS = /[\u0000-\u001F\u007F-\u009F​-‏‪-‮⁠-⁩﻿]/gu;
const NOME = /^\p{L}[\p{L}\p{M} '\-]*$/u;

export const limparNome = s => String(s ?? '').replace(INVISIVEIS, '').normalize('NFC').replace(/\s+/g, ' ').trim();
const nomeOk = (n, obrigatorio) => (n === '' ? !obrigatorio : [...n].length <= NOME_MAX && NOME.test(n));

export function cartoes() {
  return new Map(((missoes.umDia && missoes.umDia.cartoes) || []).map(c => [c.id, c]));
}

/* O que a página do amigo recebe: o cartão como está no curso, sem a
   situação do jogo. */
const publico = ({ id, he, translit, pt, desenho, cor }) => ({ id, he, translit, pt, desenho, cor });

export async function criar({ request, env }) {
  const account = await requireAccount(request, env);
  if (!account) return notSignedIn();
  if (!await hasEntitlement(env, account.id, COURSE)) return fail('no-access', 403);
  const b = await readJson(request, 1024);
  if (!b || typeof b.cartao !== 'string') return fail('bad-request');
  const para = limparNome(b.para);
  const de = limparNome(b.de);
  if (!cartoes().has(b.cartao) || !nomeOk(para, false) || !nomeOk(de, true)) return fail('bad-request');
  const corpo = b64url(new TextEncoder().encode(JSON.stringify([b.cartao, para, de])));
  const sig = await hmacB64(env.SESSION_SECRET, PREFIXO + corpo);
  return json({ token: `${corpo}.${sig}` });
}

export async function abrir({ request, env }) {
  const t = new URL(request.url).searchParams.get('t') || '';
  if (t.length > 1024) return fail('bad-request');
  const [corpo, sig] = t.split('.');
  if (!corpo || !sig) return fail('bad-request');
  if (!timingSafeEqual(sig, await hmacB64(env.SESSION_SECRET, PREFIXO + corpo))) return fail('assinatura', 400);
  let lista;
  try { lista = JSON.parse(new TextDecoder().decode(b64urlDecode(corpo))); } catch { return fail('bad-request'); }
  if (!Array.isArray(lista) || lista.length !== 3) return fail('bad-request');
  const [id, para, de] = lista.map(x => (typeof x === 'string' ? x : ''));
  const c = cartoes().get(id);
  /* Um cartão que saiu do curso depois de mandado: o link para de abrir. */
  if (!c || !nomeOk(limparNome(para), false) || !nomeOk(limparNome(de), true)) return fail('bad-request');
  return json({ cartao: publico(c), para: limparNome(para), de: limparNome(de) });
}
