import { PageHeader } from "@/components/shell/proto-ui";
import { SegurancaAdmin } from "@/components/admin/seguranca-admin";

export const dynamic = "force-dynamic";

export default function AdminSegurancaPage() {
  return (
    <div>
      <PageHeader eyebrow="Clientes" title="Segurança" em="financeira" sub="Gere e rotacione o token antifraude exibido na Sala de cada cliente." />
      <SegurancaAdmin />
    </div>
  );
}
