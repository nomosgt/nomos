"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2, Eye, AlertCircle, Check } from "lucide-react";
import {
  blogPostSchema,
  CATEGORIAS,
  STATUS_POST,
  slugify,
  type BlogPost,
} from "@/lib/validation/blog";

interface Props {
  mode: "create" | "edit";
  id?: string;
  initial?: Partial<BlogPost>;
}

export function PostEditor({ mode, id, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    title: initial?.title || "",
    slug: initial?.slug || "",
    excerpt: initial?.excerpt || "",
    body: initial?.body || "",
    categoria: initial?.categoria || (CATEGORIAS[0] as string),
    read_time: initial?.read_time || 5,
    author: initial?.author || "Éverton Vicente",
    cover: initial?.cover || "01",
    status: (initial?.status || "rascunho") as (typeof STATUS_POST)[number],
  });

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setFieldErrors((fe) => {
      if (!(k in fe)) return fe;
      const { [k as string]: _, ...rest } = fe;
      return rest;
    });
  }

  function handleTitleChange(v: string) {
    setForm((f) => ({
      ...f,
      title: v,
      slug: f.slug && f.slug !== slugify(f.title) ? f.slug : slugify(v),
    }));
  }

  async function save() {
    setError(null);
    setFieldErrors({});
    setSaved(false);

    const payload = {
      ...form,
      read_time: Number(form.read_time),
    };
    const parsed = blogPostSchema.safeParse(payload);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      const fe: Record<string, string> = {};
      Object.entries(flat).forEach(([k, v]) => {
        if (v && v[0]) fe[k] = v[0];
      });
      setFieldErrors(fe);
      setError("Verifique os campos destacados.");
      return;
    }

    startTransition(async () => {
      const res = await fetch(
        mode === "create" ? "/api/admin/posts" : `/api/admin/posts/${id}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 422 && json.issues) {
          const fe: Record<string, string> = {};
          Object.entries(json.issues as Record<string, string[]>).forEach(
            ([k, v]) => {
              if (v && v[0]) fe[k] = v[0];
            },
          );
          setFieldErrors(fe);
          setError("Verifique os campos destacados.");
        } else {
          setError(json.error || "Erro ao salvar.");
        }
        return;
      }
      setSaved(true);
      if (mode === "create" && json.id) {
        router.push(`/admin/blog/${json.id}/editar`);
      } else {
        router.refresh();
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  async function remove() {
    if (mode !== "edit" || !id) return;
    if (!confirm("Excluir esse post para sempre? Não dá pra desfazer.")) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/admin/blog");
        router.refresh();
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Erro ao excluir.");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/blog"
          className="inline-flex items-center gap-2 text-[12px] font-mono uppercase tracking-[0.2em] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
        >
          <ArrowLeft className="w-3 h-3" />
          Voltar
        </Link>
        <div className="flex items-center gap-3">
          {form.slug && mode === "edit" && form.status === "publicado" && (
            <Link
              href={`/blog/${form.slug}`}
              target="_blank"
              className="inline-flex items-center gap-2 text-[12px] font-mono uppercase tracking-[0.2em] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-brand)]"
            >
              <Eye className="w-3.5 h-3.5" />
              Ver no site
            </Link>
          )}
          {mode === "edit" && (
            <button
              onClick={remove}
              disabled={pending}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-mono uppercase tracking-[0.2em] text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir
            </button>
          )}
          <button
            onClick={save}
            disabled={pending}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] text-[12px] font-mono uppercase tracking-[0.2em] hover:-translate-y-0.5 transition-transform disabled:opacity-60"
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {pending ? "Salvando…" : saved ? "Salvo" : mode === "create" ? "Criar" : "Salvar"}
          </button>
        </div>
      </div>

      <h1 className="font-serif text-3xl lg:text-4xl tracking-tight">
        {mode === "create" ? "Novo post" : "Editar post"}
      </h1>

      {error && (
        <div className="flex items-start gap-2 p-4 border border-red-300 bg-red-50 text-[13px] text-red-800">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-4">
          <Field label="Título" error={fieldErrors.title}>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full bg-transparent text-2xl font-serif text-[color:var(--color-ink)] focus:outline-none border-b border-[color:var(--color-hairline)] pb-2 focus:border-[color:var(--color-ink)]"
              placeholder="Título do post"
            />
          </Field>

          <Field label="Slug (URL)" error={fieldErrors.slug}>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setField("slug", e.target.value)}
              className="w-full bg-transparent text-[14px] font-mono text-[color:var(--color-ink-muted)] focus:outline-none border-b border-[color:var(--color-hairline)] pb-2 focus:border-[color:var(--color-ink)]"
              placeholder="meu-post"
            />
            <div className="text-[11px] text-[color:var(--color-ink-faint)] mt-1 font-mono">
              /blog/{form.slug || "meu-post"}
            </div>
          </Field>

          <Field label="Resumo (exibido na listagem)" error={fieldErrors.excerpt}>
            <textarea
              value={form.excerpt}
              onChange={(e) => setField("excerpt", e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full bg-transparent text-[14px] text-[color:var(--color-ink)] focus:outline-none border-b border-[color:var(--color-hairline)] pb-2 focus:border-[color:var(--color-ink)] resize-y"
              placeholder="Resumo de até 500 caracteres."
            />
            <div className="text-[11px] text-[color:var(--color-ink-faint)] mt-1 text-right font-mono">
              {form.excerpt.length} / 500
            </div>
          </Field>

          <Field label="Corpo (markdown — parágrafos separados por linha em branco)" error={fieldErrors.body}>
            <textarea
              value={form.body}
              onChange={(e) => setField("body", e.target.value)}
              rows={20}
              className="w-full bg-[color:var(--color-paper)] border border-[color:var(--color-hairline)] focus:border-[color:var(--color-ink)] p-4 text-[14px] font-mono leading-relaxed text-[color:var(--color-ink)] focus:outline-none resize-y"
              placeholder="Primeiro parágrafo do post (vai aparecer em destaque serif).

Segundo parágrafo. Para criar quebra de parágrafo, deixa uma linha em branco entre eles.

Terceiro parágrafo…"
            />
          </Field>
        </div>

        <div className="space-y-4">
          <Card title="Publicação">
            <Field label="Status" error={fieldErrors.status} compact>
              <select
                value={form.status}
                onChange={(e) => setField("status", e.target.value as typeof form.status)}
                className="w-full bg-[color:var(--color-paper)] border border-[color:var(--color-hairline)] p-2.5 text-[13px] focus:outline-none focus:border-[color:var(--color-ink)]"
              >
                {STATUS_POST.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Categoria" error={fieldErrors.categoria} compact>
              <select
                value={form.categoria}
                onChange={(e) => setField("categoria", e.target.value)}
                className="w-full bg-[color:var(--color-paper)] border border-[color:var(--color-hairline)] p-2.5 text-[13px] focus:outline-none focus:border-[color:var(--color-ink)]"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
          </Card>

          <Card title="Metadados">
            <Field label="Tempo de leitura (min)" error={fieldErrors.read_time} compact>
              <input
                type="number"
                min={1}
                max={60}
                value={form.read_time}
                onChange={(e) => setField("read_time", Number(e.target.value))}
                className="w-full bg-[color:var(--color-paper)] border border-[color:var(--color-hairline)] p-2.5 text-[13px] focus:outline-none focus:border-[color:var(--color-ink)]"
              />
            </Field>
            <Field label="Autor" error={fieldErrors.author} compact>
              <input
                type="text"
                value={form.author}
                onChange={(e) => setField("author", e.target.value)}
                className="w-full bg-[color:var(--color-paper)] border border-[color:var(--color-hairline)] p-2.5 text-[13px] focus:outline-none focus:border-[color:var(--color-ink)]"
              />
            </Field>
            <Field label="Capa (01-06)" error={fieldErrors.cover} compact>
              <input
                type="text"
                value={form.cover}
                onChange={(e) => setField("cover", e.target.value)}
                maxLength={4}
                className="w-full bg-[color:var(--color-paper)] border border-[color:var(--color-hairline)] p-2.5 text-[13px] font-mono focus:outline-none focus:border-[color:var(--color-ink)]"
                placeholder="01"
              />
              <div className="text-[10px] text-[color:var(--color-ink-faint)] mt-1">
                Número da capa visual (aparece no card).
              </div>
            </Field>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
  compact,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "" : "space-y-1"}>
      <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] mb-2 block">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-5 space-y-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] pb-2 border-b border-[color:var(--color-hairline)]">
        {title}
      </div>
      {children}
    </div>
  );
}
// end of PostEditor
