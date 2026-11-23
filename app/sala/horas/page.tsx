import { PageHeader } from "@/components/shell/proto-ui";
import { HorasSala } from "@/components/sala/horas-sala";

export const dynamic = "force-dynamic";

export default function SalaHorasPage() {
  return (
    <div>
      <PageHeader eyebrow="Sala Arché" title="Horas" em="técnicas" sub="Aprove estimativas da Arché e solicite novos trabalhos." />
      <HorasSala />
    </div>
  );
}
