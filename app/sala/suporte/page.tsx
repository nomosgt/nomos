import Link from "next/link";
import { MessageCircle, Mail, Clock, ShieldCheck } from "lucide-react";

const WPP_URL = "https://wa.me/5519995619838?text=Ol%C3%A1%2C%20sou%20cliente%20NGT%20e%20preciso%20de%20suporte";

export default function Suporte() {
  return (
    <div className="space-y-10 max-w-3xl">
      <div>
        <h1 className="font-serif text-3xl lg:text-4xl tracking-tight mb-2">
          Suporte direto
        </h1>
        <p className="text-[14px] text-[color:var(--color-ink-muted)]">
          Atendimento humano pela equipe NGT — segunda a sexta, 9h às 19h.
        </p>
      </div>

      <Link
        href={WPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group block bg-[#25D366] text-white p-8 lg:p-10 transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-16px_rgba(37,211,102,0.6)]"
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <MessageCircle className="w-8 h-8" strokeWidth={1.4} />
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-80">
            ◇ Canal preferencial
          </div>
        </div>
        <h2 className="font-serif text-3xl lg:text-4xl tracking-tight mb-2">
          Abrir WhatsApp
        </h2>
        <p className="text-[14px] leading-relaxed opacity-90 max-w-md">
          Toque pra falar com o time NGT no WhatsApp. Resposta normalmente em
          poucos minutos em horário comercial.
        </p>
        <div className="mt-6 font-mono text-[12px] uppercase tracking-[0.25em] opacity-90">
          +55 19 99561-9838 →
        </div>
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
        <InfoCard icon={Mail} title="E-mail">
          Para tickets com anexo grande ou que exigem registro.
          <Link
            href="mailto:nomosgtorg@gmail.com"
            className="block mt-2 text-[color:var(--color-brand)] hover:underline"
          >
            nomosgtorg@gmail.com
          </Link>
        </InfoCard>
        <InfoCard icon={Clock} title="Horário de atendimento">
          Segunda a sexta · 9h às 19h<br />
          <span className="text-[color:var(--color-ink-faint)]">Retorno em até 24h úteis</span>
        </InfoCard>
      </div>

      <div className="border border-[color:var(--color-brand)]/30 bg-[color:var(--color-brand)]/5 p-5 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[color:var(--color-brand)] flex-shrink-0 mt-0.5" />
        <div className="text-[13px] leading-relaxed text-[color:var(--color-ink)]">
          Toda conversa é confidencial. Caso queira registrar formalmente, abra
          também uma mensagem em <Link href="/sala/mensagens" className="text-[color:var(--color-brand)] hover:underline">Mensagens</Link> que fica anexada ao seu caso.
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[color:var(--color-paper)] p-6">
      <Icon className="w-4 h-4 text-[color:var(--color-brand)] mb-3" />
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-muted)] mb-2">
        {title}
      </div>
      <div className="text-[13px] leading-relaxed text-[color:var(--color-ink)]">
        {children}
      </div>
    </div>
  );
}
