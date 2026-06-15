import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Roda em tudo MENOS:
     * - _next/static, _next/image
     * - favicons, manifests, sitemap, robots
     * - imagens / assets em /public
     */
    "/((?!_next/static|_next/image|favicon.ico|apple-icon|icon|manifest|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
