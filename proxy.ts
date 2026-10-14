import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const { url, key } = supabaseConfig();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(values) {
        for (const { name, value } of values) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of values) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getClaims();
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

export const config = { matcher: ["/host/:path*", "/api/host/:path*"] };
