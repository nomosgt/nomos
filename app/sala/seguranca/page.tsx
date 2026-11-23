import { PageHeader } from "@/components/shell/proto-ui";
import { SegurancaSala } from "@/components/sala/seguranca-sala";

export const dynamic = "force-dynamic";

export default function SalaSegurancaPage() {
  return (
    <div>
      <PageHeader eyebrow="Sala Arché" title="Proteção contra" em="fraudes" sub="Token financeiro, verificação de cobranças e canais oficiais." />
      <SegurancaSala />
    </div>
  );
}
