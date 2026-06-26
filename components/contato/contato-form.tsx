"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, MessageCircle, Instagram, MapPin, Clock, ArrowUpRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Container } from "@/components/ui/section";
import { contatoSchema } from "@/lib/validation/contato";

export function ContatoForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setFieldErrors({});

    const fd = new FormData(e.currentTarget);
    const raw = {
      nome: String(fd.get("nome") || ""),
      email: String(fd.get("email") || ""),
      telefone: String(fd.get("telefone") || ""),
      empresa: String(fd.get("empresa") || ""),
      cargo: String(fd.get("cargo") || ""),
      mensagem: String(fd.get("mensagem") || ""),
      resultado_simulacao: String(fd.get("resultado_simulacao") || ""),
      honeypot: String(fd.get("website") || ""), // honeypot field
      origem: "contato",
    };

    // Validação client-side (Zod) antes de bater na API
    const parsed = contatoSchema.safeParse(raw);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      const fe: Record<string, string> = {};
      Object.entries(flat).forEach(([k, v]) => {
        if (v && v[0]) fe[k] = v[0];
      });
      setFieldErrors(fe);
      setErrorMsg("Verifique os campos destacados.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/contato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429) {
          setErrorMsg("Muitas tentativas. Aguarde um minuto e tente de novo.");
        } else if (res.status === 422 && json.issues) {
          const fe: Record<string, string> = {};
          Object.entries(json.issues as Record<string, string[]>).forEach(
            ([k, v]) => {
              if (v && v[0]) fe[k] = v[0];
            },
          );
          setFieldErrors(fe);
          setErrorMsg("Verifique os campos destacados.");
        } else {
          setErrorMsg(json.error || "Erro ao enviar. Tente novamente.");
        }
        setLoading(false);
        return;
      }
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setErrorMsg("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="pb-32 border-t border-[color:var(--color-hairline)]">
      <Container>
        <div className="pt-16 lg:pt-20 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-12 lg:gap-24">
          {/* Form */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-8 flex items-center gap-3">
              <span className="h-px w-8 bg-[color:var(--color-hairline)]" />
              Formulário
            </div>

            <AnimatePresence mode="wait">
              {!submitted ? (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-px"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
                    <Field label="Nome" name="nome" required error={fieldErrors.nome} />
                    <Field label="E-mail" name="email" type="email" required error={fieldErrors.email} />
                    <Field label="Empresa" name="empresa" error={fieldErrors.empresa} />
                    <Field label="Telefone" name="telefone" type="tel" error={fieldErrors.telefone} />
                    <Field
                      label="Cargo"
                      name="cargo"
                      placeholder="CFO, Controller, etc"
                      error={fieldErrors.cargo}
                    />
                    <Field
                      label="Faturamento (opcional)"
                      name="faturamento_estimado"
                      placeholder="Aproximado, em milhões"
                      error={fieldErrors.faturamento_estimado}
                    />
                  </div>

                  <div className="bg-[color:var(--color-hairline)] border-x border-b border-[color:var(--color-hairline)] p-px">
                    <div className={`bg-[color:var(--color-background)] p-6 lg:p-8 ${fieldErrors.mensagem ? "ring-1 ring-red-500/40" : ""}`}>
                      <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-3 block">
                        Mensagem
                      </label>
                      <textarea
                        name="mensagem"
                        rows={5}
                        placeholder="Conta um pouco sobre a operação, o regime tributário, e o que motivou o contato…"
                        className="w-full bg-transparent text-[15px] text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-faint)] focus:outline-none resize-none"
                      />
                      {fieldErrors.mensagem && (
                        <p className="mt-2 text-[11px] text-red-600">{fieldErrors.mensagem}</p>
                      )}
                    </div>
                  </div>

                  {/* Campo opcional sobre simulação */}
                  <div className="bg-[color:var(--color-hairline)] border-x border-b border-[color:var(--color-hairline)] p-px">
                    <div className={`bg-[color:var(--color-background)] p-6 lg:p-8 ${fieldErrors.resultado_simulacao ? "ring-1 ring-red-500/40" : ""}`}>
                      <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-1 block">
                        Resultado da simulação
                        <span className="ml-2 text-[color:var(--color-ink-faint)] normal-case tracking-normal">(opcional)</span>
                      </label>
                      <p className="text-[12px] text-[color:var(--color-ink-faint)] mb-3 leading-relaxed">
                        Caso tenha feito a simulação, conte seu resultado — ajuda a gente a entrar na conversa já alinhado.
                      </p>
                      <textarea
                        name="resultado_simulacao"
                        rows={3}
                        maxLength={1000}
                        placeholder="Ex: R$ 12M de potencial estimado · Lucro Real · setor logística"
                        className="w-full bg-transparent text-[15px] text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-faint)] focus:outline-none resize-none"
                      />
                      {fieldErrors.resultado_simulacao && (
                        <p className="mt-2 text-[11px] text-red-600">{fieldErrors.resultado_simulacao}</p>
                      )}
                    </div>
                  </div>

                  {/* Honeypot — invisível para humanos, bots preenchem */}
                  <div className="hidden" aria-hidden>
                    <label>
                      Website (não preencha)
                      <input
                        type="text"
                        name="website"
                        tabIndex={-1}
                        autoComplete="off"
                      />
                    </label>
                  </div>

                  {errorMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-3 p-4 border border-red-500/30 bg-red-50/50 text-red-800 text-[13px]"
                    >
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </motion.div>
                  )}

                  <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] max-w-sm">
                      Retorno em até 24h em dias úteis · Conversa confidencial
                    </p>
                    <button
                      type="submit"
                      disabled={loading}
                      className="group inline-flex items-center gap-2 px-8 py-4 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] text-[13px] font-medium transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:pointer-events-none"
                    >
                      {loading ? "Enviando…" : "Enviar mensagem"}
                      {!loading && (
                        <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      )}
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="border border-[color:var(--color-ink)] p-10 lg:p-16 bg-[color:var(--color-surface)]"
                >
                  <CheckCircle2 className="w-10 h-10 text-[color:var(--color-brand)] mb-8" strokeWidth={1.2} />
                  <h3 className="font-serif text-3xl lg:text-5xl tracking-tight leading-[0.95] mb-6">
                    Mensagem recebida.
                  </h3>
                  <p className="text-[16px] leading-relaxed text-[color:var(--color-ink-muted)] max-w-lg">
                    Obrigado pelo contato. O Éverton vai retornar pessoalmente em
                    até 24h úteis. Se precisar de algo mais urgente, o WhatsApp
                    está ao lado.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-10 font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-brand)]"
                  >
                    Enviar outra mensagem →
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <aside className="space-y-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)] self-start">
            <ContactCard
              icon={MessageCircle}
              label="WhatsApp"
              href="https://wa.me/5511933333841"
              external
              value="+55 11 93333-3841"
              cta="Abrir WhatsApp"
              highlight
            />
            <ContactCard
              icon={Mail}
              label="Email"
              href="mailto:contato@nomosgt.com.br"
              value="contato@nomosgt.com.br"
              cta="Enviar email"
            />
            <ContactCard
              icon={Instagram}
              label="Instagram"
              href="https://instagram.com/nomosgt"
              external
              value="@nomosgt"
              cta="Ver perfil"
            />
            <InfoCard icon={MapPin} label="Endereço">
              São Paulo, SP<br />
              <span className="text-[color:var(--color-ink-faint)]">Endereço completo em breve</span>
            </InfoCard>
            <InfoCard icon={Clock} label="Atendimento">
              Seg — Sex · 9h às 19h<br />
              <span className="text-[color:var(--color-ink-faint)]">Retorno em até 24h úteis</span>
            </InfoCard>
          </aside>
        </div>
      </Container>
    </section>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div
      className={`bg-[color:var(--color-background)] p-6 lg:p-8 group focus-within:bg-[color:var(--color-surface)] transition-colors duration-300 ${
        error ? "ring-1 ring-red-500/40" : ""
      }`}
    >
      <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-3 block">
        {label} {required && <span className="text-[color:var(--color-brand)]">*</span>}
      </label>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        aria-invalid={!!error}
        className="w-full bg-transparent text-[15px] text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-faint)] focus:outline-none border-b border-transparent focus:border-[color:var(--color-ink)] pb-2 transition-colors"
      />
      {error && (
        <p className="mt-2 text-[11px] text-red-600">{error}</p>
      )}
    </div>
  );
}

function ContactCard({
  icon: Icon,
  label,
  value,
  cta,
  href,
  external,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  cta: string;
  href: string;
  external?: boolean;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={`group block p-7 lg:p-8 transition-colors duration-500 ${
        highlight
          ? "bg-[color:var(--color-ink)] text-[color:var(--color-paper)] hover:bg-[color:var(--color-brand-dim)]"
          : "bg-[color:var(--color-background)] hover:bg-[color:var(--color-surface)]"
      }`}
    >
      <div className="flex items-start justify-between mb-6">
        <Icon
          className={`w-5 h-5 ${highlight ? "text-[color:var(--color-brand-soft)]" : "text-[color:var(--color-ink)]"}`}
          strokeWidth={1.4}
        />
        <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 opacity-60" />
      </div>
      <div
        className={`font-mono text-[10px] uppercase tracking-[0.3em] mb-3 ${
          highlight ? "text-[color:var(--color-paper)]/50" : "text-[color:var(--color-ink-faint)]"
        }`}
      >
        {label}
      </div>
      <div className="font-serif text-xl lg:text-2xl mb-2">{value}</div>
      <div
        className={`text-[12px] font-mono uppercase tracking-[0.2em] ${
          highlight ? "text-[color:var(--color-paper)]/60" : "text-[color:var(--color-ink-muted)]"
        }`}
      >
        {cta} →
      </div>
    </Link>
  );
}

function InfoCard({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[color:var(--color-background)] p-7 lg:p-8">
      <Icon className="w-4 h-4 text-[color:var(--color-ink-muted)] mb-5" strokeWidth={1.4} />
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-3">
        {label}
      </div>
      <div className="text-[14px] leading-relaxed text-[color:var(--color-ink)]">
        {children}
      </div>
    </div>
  );
}
