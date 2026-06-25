import { z } from "zod";

export const CATEGORIAS = [
  "Reforma Tributária",
  "Jurisprudência",
  "Cases",
  "Análises",
  "Atualizações",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export const STATUS_POST = ["rascunho", "publicado", "arquivado"] as const;
export type StatusPost = (typeof STATUS_POST)[number];

export const blogPostSchema = z.object({
  slug: z
    .string()
    .min(3, "Slug muito curto")
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Use só letras minúsculas, números e hífen"),
  title: z.string().min(3, "Título muito curto").max(200),
  excerpt: z.string().max(500).optional().or(z.literal("")),
  body: z.string().min(1, "Corpo não pode ficar vazio").max(60_000),
  categoria: z.enum(CATEGORIAS),
  read_time: z.number().int().min(1).max(60).default(5),
  author: z.string().min(2).max(80).default("Éverton Vicente"),
  cover: z.string().min(1).max(40).default("01"),
  cover_url: z.string().url("URL inválida").max(2000).nullable().optional().or(z.literal("")),
  status: z.enum(STATUS_POST).default("rascunho"),
  published_at: z.string().datetime().nullable().optional(),
});

export type BlogPostInput = z.infer<typeof blogPostSchema>;

export interface BlogPost extends BlogPostInput {
  id: string;
  created_at: string;
  updated_at: string;
}

export function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}
