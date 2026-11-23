import { PageHeader } from "@/components/shell/proto-ui";
import { ReunioesAdmin } from "@/components/admin/reunioes-admin";

export const dynamic = "force-dynamic";

export default function ReunioesPage() {
  return (
    <div>
      <PageHeader eyebrow="Gestão" title="Reuniões" em="solicitadas" sub="Pedidos de clientes e parceiros — confirme, conclua ou cancele." />
      <ReunioesAdmin />
    </div>
  );
}
