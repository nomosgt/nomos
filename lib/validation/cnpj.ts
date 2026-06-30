import { z } from "zod";

export const cnpjRequestSchema = z.object({
  cnpj: z
    .string()
    .min(14, "CNPJ incompleto")
    .max(18, "CNPJ inválido")
    .transform((s) => s.replace(/\D/g, ""))
    .refine((s) => s.length === 14, "CNPJ deve ter 14 dígitos")
    .refine(isValidCnpj, "CNPJ inválido (dígitos verificadores)"),
});

export type CnpjRequest = z.infer<typeof cnpjRequestSchema>;

export const perfilTributarioSchema = z.enum([
  "lucro_real",
  "lucro_presumido",
  "simples",
  "inconclusivo",
]);
export type PerfilTributario = z.infer<typeof perfilTributarioSchema>;

export const teseSchema = z.object({
  nome: z.string(),
  aplicabilidade: z.enum(["alta", "media", "baixa"]),
  justificativa: z.string(),
});
export type Tese = z.infer<typeof teseSchema>;

export const analiseSchema = z.object({
  perfil_tributario: perfilTributarioSchema.default("inconclusivo"),
  justificativa_perfil: z.string().default("Sem justificativa fornecida."),
  oportunidades: z.array(teseSchema).max(8).default([]),
  riscos: z
    .array(z.object({ ponto: z.string(), descricao: z.string() }))
    .max(5)
    .default([]),
  proxima_acao: z
    .string()
    .default(
      "Agende um diagnóstico técnico de 30 minutos com nossa equipe para detalhar o potencial específico do seu caso.",
    ),
  // ===== Novos campos pra análise encorpada =====
  score_aderencia: z
    .number()
    .min(0)
    .max(100)
    .default(60)
    .describe("0-100 quão aderente o perfil é às teses recuperatórias da NGT"),
  complexidade: z
    .enum(["baixa", "media", "alta"])
    .default("media")
    .describe("Complexidade técnica esperada do caso"),
  prazo_estimado_meses: z
    .number()
    .min(1)
    .max(60)
    .default(18)
    .describe("Prazo estimado em meses até primeira recuperação"),
  cenario_setorial: z
    .string()
    .default(
      "O setor apresenta perfil tributário típico de empresas com oportunidades de revisão fiscal.",
    )
    .describe("Análise de 1-2 frases sobre o cenário do setor"),
});
export type Analise = z.infer<typeof analiseSchema>;

export const cnpjResponseSchema = z.object({
  cnpj: z.string(),
  empresa: z.object({
    razao_social: z.string().nullable(),
    nome_fantasia: z.string().nullable(),
    cnae_principal: z.string().nullable(),
    cnae_descricao: z.string().nullable(),
    porte: z.string().nullable(),
    capital_social: z.number().nullable(),
    situacao_cadastral: z.string().nullable(),
    municipio: z.string().nullable(),
    uf: z.string().nullable(),
    data_abertura: z.string().nullable(),
    socios: z.array(z.string()).default([]),
  }),
  analise: analiseSchema.nullable(),
  fonte: z.array(z.enum(["brasilapi", "receitaws"])),
});

export type CnpjResponse = z.infer<typeof cnpjResponseSchema>;

/**
 * Valida CNPJ pelos 2 dígitos verificadores.
 */
export function isValidCnpj(cnpj: string): boolean {
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false; // todos iguais

  const calcDigit = (base: string, weights: number[]) => {
    const sum = base.split("").reduce(
      (acc, d, i) => acc + parseInt(d, 10) * weights[i],
      0,
    );
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const d1 = calcDigit(cnpj.substring(0, 12), w1);
  const d2 = calcDigit(cnpj.substring(0, 12) + d1, w2);

  return (
    d1 === parseInt(cnpj[12], 10) && d2 === parseInt(cnpj[13], 10)
  );
}

export function formatCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "").padEnd(14, " ").slice(0, 14);
  if (d.trim().length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
}
