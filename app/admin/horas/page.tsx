import { PageHeader } from "@/components/shell/proto-ui";
import { HorasAdmin } from "@/components/admin/horas-admin";

export const dynamic = "force-dynamic";

export default function HorasPage() {
  return (
    <div>
      <PageHeader eyebrow="Clientes" title="Horas" em="técnicas" sub="Estimativas enviadas para aprovação do cliente e solicitações recebidas." />
      <HorasAdmin />
    </div>
  );
}
