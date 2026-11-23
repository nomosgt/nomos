import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { PageHeader, Cd, StTag, fmtData } from "@/components/shell/proto-ui";

export const dynamic = "force-dynamic";

/**
 * Admin · Usuários e permissões — visão consolidada e somente-leitura de
 * quem acessa a plataforma: equipe (admin_profiles), clientes e
 * colaboradores por código. Criação/remoção segue nos fluxos próprios
 * (Supabase dashboard p/ equipe; /admin/clientes; /admin/colaboradores).
 */
export default async function UsuariosPage() {
  if (!isSupabaseConfigured()) return null;
  const admin = createAdminClient();

  const [admins, clientes, codigos] = await Promise.all([
    admin.from("admin_profiles").select("user_id, nome, role"),
    admin.from("client_profiles").select("user_id, nome, empresa"),
    admin.from("parceiros_codigos").select("id, codigo, nome, papel, ativo, ultimo_acesso").order("criado_em", { ascending: false }),
  ]);

  // emails via Auth Admin (N pequeno)
  const emails = new Map<string, string>();
  for (const p of [...(admins.data ?? []), ...(clientes.data ?? [])]) {
    try {
      const { data } = await admin.auth.admin.getUserById(p.user_id);
      if (data.user?.email) emails.set(p.user_id, data.user.email);
    } catch { /* segue sem email */ }
  }

  return (
    <div>
      <PageHeader eyebrow="Administração" title="Usuários e" em="permissões" sub="Equipe, clientes e colaboradores — quem entra em cada porta." />
      <div className="space-y-5">
        <Cd title="Equipe Arché" mono={`${admins.data?.length ?? 0}`}>
          <div className="space-y-2.5">
            {(admins.data ?? []).map((a) => (
              <div key={a.user_id} className="flex flex-wrap items-center gap-3">
                <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-[#0f1240] text-[11px] font-semibold text-white">
                  {(a.nome || "A").slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-[#0f1240]">{a.nome || "—"}</div>
                  <div className="font-mono text-[11px] text-[#8a8ca3]">{emails.get(a.user_id) || "—"}</div>
                </div>
                <StTag tone="info">{a.role || "admin"}</StTag>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11.5px] text-[#8a8ca3]">Novos acessos de equipe são criados pelo Supabase (Auth) + admin_profiles, por decisão do superadmin.</p>
        </Cd>

        <Cd title="Clientes com acesso à Sala" mono={`${clientes.data?.length ?? 0}`}>
          <div className="space-y-2.5">
            {(clientes.data ?? []).map((c) => (
              <div key={c.user_id} className="flex flex-wrap items-center gap-3">
                <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-[#3a40c9] text-[11px] font-semibold text-white">
                  {(c.empresa || c.nome || "?").slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-[#0f1240]">{c.empresa || c.nome}</div>
                  <div className="font-mono text-[11px] text-[#8a8ca3]">{c.nome} · {emails.get(c.user_id) || "—"}</div>
                </div>
                <StTag tone="ok">cliente</StTag>
              </div>
            ))}
          </div>
        </Cd>

        <Cd title="Colaboradores (acesso por código)" mono={`${codigos.data?.length ?? 0}`}>
          <div className="space-y-2.5">
            {(codigos.data ?? []).map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3">
                <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-[#e9e7f7] text-[11px] font-semibold text-[#2c2f86]">
                  {(p.nome || "?").slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-[#0f1240]">{p.nome}</div>
                  <div className="font-mono text-[11px] text-[#8a8ca3]">
                    {p.codigo} · {p.papel || "colaborador"}
                    {p.ultimo_acesso ? ` · último acesso ${fmtData(p.ultimo_acesso, true)}` : " · nunca acessou"}
                  </div>
                </div>
                <StTag tone={p.ativo ? "ok" : "bad"}>{p.ativo ? "ativo" : "desativado"}</StTag>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11.5px] text-[#8a8ca3]">Gerar/revogar códigos: página Colaboradores.</p>
        </Cd>
      </div>
    </div>
  );
}
