import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const form = await req.formData();
  const path = String(form.get("path") || "");
  if (!path) return NextResponse.json({ error: "Path ausente" }, { status: 400 });

  // RLS na case_documents já filtra. Aqui só assinamos a URL.
  const { data, error } = await supabase.storage
    .from("case-documents")
    .createSignedUrl(path, 60);
  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Erro gerando link" },
      { status: 500 },
    );
  }
  return NextResponse.redirect(data.signedUrl, { status: 303 });
}
