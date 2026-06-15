/**
 * Helper centralizado pra verificar se Supabase está configurado.
 * Usado em layouts/pages admin pra renderizar setup notice em vez de crashar.
 */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function isAdminEmailConfigured(): boolean {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}
