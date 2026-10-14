import "server-only";

import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";

export type HostUser = { id: string; email?: string };

export function expectedRsvpOrigin(request: Request): string {
  const internal = new URL(request.url);
  const host = request.headers.get("host");
  // Next.js can expose an internal localhost URL. The HTTP Host preserves
  // the visitor's authority; Vercel serves deployment requests over HTTPS.
  if (host && host.length <= 255) {
    try {
      const origin = new URL(`${process.env.VERCEL === "1" ? "https:" : internal.protocol}//${host}`);
      if (origin.host === host.toLowerCase() && !origin.username && !origin.password
        && origin.pathname === "/" && !origin.search && !origin.hash) return origin.origin;
    } catch { /* Fall back to the request URL for an invalid authority. */ }
  }
  return internal.origin;
}

export function hostIsConfigured(): boolean {
  return isSupabaseConfigured() && Boolean(process.env.HOST_EMAIL?.trim());
}

export function isAuthorizedHost(user: HostUser | null): boolean {
  const email = process.env.HOST_EMAIL?.trim().toLowerCase();
  return Boolean(email && user?.id && user.email?.trim().toLowerCase() === email);
}

export async function getVerifiedUser(): Promise<HostUser | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  // Verify the session with Supabase; never trust browser identity headers.
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}

export const privateResponseHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};
