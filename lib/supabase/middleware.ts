import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // /admin/* (exceto login) — só admins
  if (path.startsWith("/admin") && !path.startsWith("/admin/login")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
    const { data: profile } = await supabase
      .from("admin_profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("erro", "sem_permissao");
      return NextResponse.redirect(url);
    }
  }

  // /sala/* (exceto login) — só clientes
  if (path.startsWith("/sala") && !path.startsWith("/sala/login")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/sala/login";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
    const { data: clientProfile } = await supabase
      .from("client_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!clientProfile) {
      const url = request.nextUrl.clone();
      url.pathname = "/sala/login";
      url.searchParams.set("erro", "sem_permissao");
      return NextResponse.redirect(url);
    }
  }

  // Já logado tentando ir pra tela de login — redireciona pro painel
  if (path === "/admin/login" && user) {
    const { data: profile } = await supabase
      .from("admin_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profile) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }
  if (path === "/sala/login" && user) {
    const { data: clientProfile } = await supabase
      .from("client_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (clientProfile) {
      const url = request.nextUrl.clone();
      url.pathname = "/sala";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
