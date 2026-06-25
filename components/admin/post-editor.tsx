"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Trash2,
  Eye,
  AlertCircle,
  Check,
  ImageIcon,
  Upload,
  X,
} from "lucide-react";
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
  const [uploading, setUploading] = useState<"cover" | "body" | null>(null);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const bodyFileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: initial?.title || "",
    slug: initial?.slug || "",
    excerpt: initial?.excerpt || "",
    body: initial?.body || "",
    categoria: initial?.categoria || (CATEGORIAS[0] as string),
    read_time: initial?.read_time || 5,
    author: initial?.author || "Éverton Vicente",
    cover: initial?.cover || "01",
    cover_url: initial?.cover_url || "",
    status: (initial?.status || "rascunho") as (typeof STATUS_POST)[number],
  });

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setFieldErrors((fe) => {
      if (!(k in fe)) return fe;
      const { [k as string]: _drop, ...rest } = fe;
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

  async function uploadFile(file: File, target: "cover" | "body") {
    setError(null);
    setUploading(target);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Falha no upload");
        return null;
      }
      return json.url as string;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro de rede");
      return null;
    } finally {
      setUploading(null);
    }
  }

  async function onCoverPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, "cover");
    if (url) setField("cover_url", url);
    e.target.value = "";
  }

  async function onBodyImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, "body");
    if (url) insertAtCursor(`![${file.name.replace(/\.[^.]+$/, "")}](${url})`);
    e.target.value = "";
  }

  function insertAtCursor(text: string) {
    const ta = bodyRef.current;
    if (!ta) {
      setForm((f) => ({ ...f, body: f.body + "\n\n" + text + "\n\n" }));
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = form.body.slice(0, start);
    const after = form.body.slice(end);
    const insert = (before.endsWith("\n\n") || before === "" ? "" : "\n\n") + text + "\n\n";
    const newBody = before + insert + after;
    setForm((f) => ({ ...f, body: newBody }));
    requestAnimationFrame(() => {
      const pos = (before + insert).length;
      ta.focus();
      ta.setSelectionRange(pos, pos);
    });
  }

  async function save() {
    setError(null);
    setFieldErrors({});
    setSaved(false);

    const payload = {
      ...form,
      read_time: Number(form.read_time),
      cover_url: form.cover_url || null,
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
        {/* COLUNA ESQUERDA — conteúdo */}
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

          {/* Corpo — markdown + toolbar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)]">
                Corpo (markdown)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => bodyFileRef.current?.click()}
                  disabled={uploading === "body"}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.15em] border border-[color:var(--color-hairline)] hover:border-[color:var(--color-ink)] disabled:opacity-60"
                >
                  {uploading === "body" ? (
                    <Upload className="w-3 h-3 animate-pulse" />
                  ) : (
                    <ImageIcon className="w-3 h-3" />
                  )}
                  {uploading === "body" ? "Enviando…" : "Inserir imagem"}
                </button>
                <input
                  ref={bodyFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onBodyImagePick}
                />
              </div>
            </div>
            <textarea
              ref={bodyRef}
              value={form.body}
              onChange={(e) => setField("body", e.target.value)}
              rows={22}
              className="w-full bg-[color:var(--color-paper)] border border-[color:var(--color-hairline)] focus:border-[color:var(--color-ink)] p-4 text-[14px] font-mono leading-relaxed text-[color:var(--color-ink)] focus:outline-none resize-y"
              placeholder={`Primeiro parágrafo (aparece em destaque).

Outro parágrafo. Separe por linha em branco.

## Subtítulo
**Negrito** e *itálico* funcionam.

- Item de lista
- Outro item

[Texto do link](https://exemplo.com)

![Descrição da imagem](https://...)`}
            />
            {fieldErrors.body && (
              <p className="mt-1 text-[11px] text-red-600">{fieldErrors.body}</p>
            )}
            <div className="mt-2 text-[11px] text-[color:var(--color-ink-faint)] font-mono">
              Suporta markdown: # ## ### títulos · **negrito** · *itálico* · - listas · [link](url) · ![imagem](url)
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA — sidebar */}
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

          <Card title="Capa">
            {form.cover_url ? (
              <div className="space-y-2">
                <div className="relative aspect-[16/9] bg-[color:var(--color-ink)] overflow-hidden">
                  <img
                    src={form.cover_url}
                    alt="Capa"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setField("cover_url", "")}
                    className="absolute top-2 right-2 p-1.5 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] hover:bg-red-600 transition-colors"
                    title="Remover capa"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => coverFileRef.current?.click()}
                  disabled={uploading === "cover"}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-mono uppercase tracking-[0.15em] border border-[color:var(--color-hairline)] hover:border-[color:var(--color-ink)] disabled:opacity-60"
                >
                  <Upload className="w-3 h-3" />
                  {uploading === "cover" ? "Enviando…" : "Trocar capa"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverFileRef.current?.click()}
                disabled={uploading === "cover"}
                className="w-full aspect-[16/9] border-2 border-dashed border-[color:var(--color-hairline)] hover:border-[color:var(--color-ink)] flex flex-col items-center justify-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] transition-colors disabled:opacity-60"
              >
                {uploading === "cover" ? (
                  <>
                    <Upload className="w-5 h-5 animate-pulse" />
                    Enviando…
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5" />
                    Upload capa
                  </>
                )}
              </button>
            )}
            <input
              ref={coverFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onCoverPick}
            />
            <div className="pt-3 border-t border-[color:var(--color-hairline)]">
              <Field label="Ou capa numérica (fallback)" compact>
                <input
                  type="text"
                  value={form.cover}
                  onChange={(e) => setField("cover", e.target.value)}
                  maxLength={4}
                  className="w-full bg-[color:var(--color-paper)] border border-[color:var(--color-hairline)] p-2.5 text-[13px] font-mono focus:outline-none focus:border-[color:var(--color-ink)]"
                  placeholder="01"
                />
                <div className="text-[10px] text-[color:var(--color-ink-faint)] mt-1">
                  Usado se não houver imagem custom. 01-06.
                </div>
              </Field>
            </div>
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
