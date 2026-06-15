import { z } from "zod";

/**
 * Schema da simulação registrada no banco.
 * O cliente envia os inputs + outputs calculados (já validados pela função
 * pura `calcular` no wizard); o server revalida no caso de tampering.
 */
export const simuladorSchema = z.object({
  faturamento: z.number().int().min(0).max(10_000_000_000),
  despesa_indireta: z.number().int().min(0).max(10_000_000_000),
  setor: z.enum([
    "industria",
    "comercio",
    "servicos",
    "logistica",
    "tecnologia",
    "outros",
  ]),
  regime: z.enum(["real", "presumido"]),

  tese_judicial: z.number().min(0),
  tese_administrativa: z.number().min(0),
  icms_comercio: z.number().min(0).default(0),
  total: z.number().min(0),
});

export type SimuladorInput = z.infer<typeof simuladorSchema>;

/**
 * Função pura de cálculo — mesma usada no wizard e na revalidação server-side.
 * Lucro Real:
 *   Judiciais       = (8% × RB + 3% × RB) × 5
 *   Administrativas = (8% × RB + 15% × DI + 3% × RB) × 5
 * Lucro Presumido:
 *   Judiciais       = (8% × RB + 3% × RB) × 5
 *   Administrativas = (15% × DI) × 5
 * Adicional Comércio: (15% × DI) × 5
 */
export function calcularPotencial(input: {
  faturamento: number;
  despesa_indireta: number;
  setor: SimuladorInput["setor"];
  regime: SimuladorInput["regime"];
}) {
  const { faturamento: rb, despesa_indireta: di, setor, regime } = input;

  const tese_judicial = Math.round((0.08 * rb + 0.03 * rb) * 5);
  const tese_administrativa =
    regime === "real"
      ? Math.round((0.08 * rb + 0.15 * di + 0.03 * rb) * 5)
      : Math.round(0.15 * di * 5);
  const icms_comercio = setor === "comercio" ? Math.round(0.15 * di * 5) : 0;
  const total = tese_judicial + tese_administrativa + icms_comercio;

  return { tese_judicial, tese_administrativa, icms_comercio, total };
}
