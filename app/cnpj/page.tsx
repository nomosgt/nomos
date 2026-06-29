import { redirect } from "next/navigation";

/**
 * Pagina /cnpj redireciona para /simulador.
 * A analise de CNPJ agora vive como Etapa 1 do simulador unificado.
 */
export default function CnpjPage() {
  redirect("/simulador");
}
