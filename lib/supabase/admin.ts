import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com SERVICE ROLE — bypassa RLS.
 * SÓ usar em route handlers / server actions confiáveis.
 * NUNCA expor ao client (a chave é secreta).
 *
 * Casos de uso: gravar contato vindo de form público, log de simulação,
 * tarefas administrativas que precisam ignorar policies.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurado. Defina em .env.local.",
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
