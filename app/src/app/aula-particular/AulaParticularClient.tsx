'use client';

/* A aula particular com o Moshik (06/11/2026, pedido do dono: "um lugar onde
 * os alunos podem pedir uma aula particular comigo, R$ 300 por aula, se
 * quiserem uma ajuda extra"). O site não agenda nem cobra: o aluno combina
 * tudo direto com o dono. Aqui só a oferta e os dois caminhos para pedir,
 * com a mensagem já começada (o e-mail da conta, para o dono saber quem é). */

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { useAccount } from '@/lib/account/store';
import { empresa, whatsappUrl } from '@/lib/empresa';
import { tx } from '@/i18n/telas/aula-particular';

export function AulaParticularClient() {
  const account = useAccount();
  const email = account.session?.account.email ?? '';
  const texto = tx.mensagem(email);
  const wa = whatsappUrl();
  const mail = `mailto:${empresa.contato.email}?subject=${encodeURIComponent(tx.assunto)}&body=${encodeURIComponent(texto)}`;
  return (
    <div className="grid gap-6 py-2 max-w-[40rem]">
      <header className="grid gap-2">
        <p className="font-ui text-[13px] uppercase tracking-[.07em] text-ink-muted m-0">{tx.kicker}</p>
        <h1 className="text-[28px] font-bold m-0 text-balance">{tx.titulo}</h1>
      </header>
      <Card className="p-5 sm:p-6 grid gap-4">
        <p className="m-0 font-ui text-[16px] leading-relaxed text-ink-body">{tx.intro}</p>
        <p className="m-0 font-ui text-[15.5px] leading-relaxed text-ink-body">{tx.detalhes}</p>
        <p className="m-0 font-ui text-[15.5px] leading-relaxed text-ink-body">{tx.comoPedir}</p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {wa && (
            <a href={`${wa}?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center justify-center min-h-[52px] px-5 rounded-[14px] bg-[var(--accent-bg)]
                          text-white font-ui text-[16px] font-semibold hover:brightness-110">
              {tx.whatsapp}
            </a>
          )}
          <a href={mail}
             className="inline-flex items-center justify-center min-h-[52px] px-5 rounded-[14px] border-2 border-[var(--teal)]
                        text-[var(--teal-ink)] font-ui text-[16px] font-semibold hover:bg-[var(--teal-soft)]">
            {tx.email}
          </a>
        </div>
        <p className="m-0 font-ui text-[13.5px] leading-relaxed text-ink-muted">{tx.aParte}</p>
      </Card>
      <Link href="/meu-hebraico" className="font-ui text-[14px] text-[var(--teal-ink)] underline underline-offset-2 justify-self-start min-h-[44px] inline-flex items-center">
        {tx.voltar}
      </Link>
    </div>
  );
}
