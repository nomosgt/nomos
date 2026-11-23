import { PageHeader } from "@/components/shell/proto-ui";
import { IndicacoesAdmin } from "@/components/admin/indicacoes-admin";

export const dynamic = "force-dynamic";

export default function IndicacoesPage() {
  return (
    <div>
      <PageHeader eyebrow="Gestão" title="Indicações de" em="parceiros" sub="Empresas indicadas pela rede — trabalhe o funil até a conversão." />
      <IndicacoesAdmin />
    </div>
  );
}
