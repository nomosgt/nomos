import { z } from "zod";

/**
 * Schema do formulário de contato (público).
 * Mesma validação no client (RHF) e no server (route handler).
 */
export const contatoSchema = z.object({
  nome: z
    .string()
    .min(2, "Nome muito curto")
    .max(120, "Nome muito longo"),

  email: z
    .string()
    .email("E-mail inválido")
    .max(180),

  telefone: z
    .string()
    .min(8, "Telefone muito curto")
    .max(30)
    .optional()
    .or(z.literal("")),

  empresa: z
    .string()
    .max(120)
    .optional()
    .or(z.literal("")),

  cargo: z
    .string()
    .max(80)
    .optional()
    .or(z.literal("")),

  faturamento_estimado: z
    .enum(["ate-5m", "5m-25m", "25m-100m", "100m-500m", "500m+", ""])
    .optional(),

  mensagem: z
    .string()
    .max(2000, "Mensagem muito longa")
    .optional()
    .or(z.literal("")),

  origem: z.string().max(60).optional(),

  // Honeypot anti-bot — deve ficar vazio. Bots automaticos preenchem.
  honeypot: z.string().max(0).optional(),
});

export type ContatoInput = z.infer<typeof contatoSchema>;

export const FAIXAS_FATURAMENTO = [
  { value: "ate-5m", label: "Até R$ 5M" },
  { value: "5m-25m", label: "R$ 5M – R$ 25M" },
  { value: "25m-100m", label: "R$ 25M – R$ 100M" },
  { value: "100m-500m", label: "R$ 100M – R$ 500M" },
  { value: "500m+", label: "Acima de R$ 500M" },
] as const;
