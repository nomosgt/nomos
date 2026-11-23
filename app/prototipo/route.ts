import { redirect } from "next/navigation";

/** URL limpa para o protótipo navegável: /prototipo → /prototipo.html */
export function GET() {
  redirect("/prototipo.html");
}
