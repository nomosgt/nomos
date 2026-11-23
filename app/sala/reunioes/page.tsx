import { PageHeader } from "@/components/shell/proto-ui";
import { ReunioesSala } from "@/components/sala/reunioes-sala";

export const dynamic = "force-dynamic";

export default function SalaReunioesPage() {
  return (
    <div>
      <PageHeader eyebrow="Sala Arché" title="Reuniões" sub="Solicite um horário com a equipe e acompanhe as confirmações." />
      <ReunioesSala />
    </div>
  );
}
