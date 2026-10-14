import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser, hostIsConfigured, isAuthorizedHost, privateResponseHeaders } from "@/lib/rsvp-server";
import { UUID_PATTERN } from "@/lib/rsvp-validation";
import { guestResponse, RSVP_TABLE, type DatabaseRsvp } from "@/lib/rsvp-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!hostIsConfigured()) {
    return Response.json({ error: "The host guest list has not been configured yet." }, {
      status: 503, headers: privateResponseHeaders,
    });
  }
  try {
    const user = await getVerifiedUser();
    if (!isAuthorizedHost(user)) {
      return Response.json({ error: user ? "This guest list is available to the host only." : "Please sign in to view the guest list." }, {
        status: user ? 403 : 401, headers: privateResponseHeaders,
      });
    }
    let cursor: [string, string] | null = null;
    const value = new URL(request.url).searchParams.get("cursor");
    if (value) {
      try {
        if (value.length > 256) throw new Error("Invalid cursor");
        const parsed: unknown = JSON.parse(value);
        if (!Array.isArray(parsed) || parsed.length !== 2
          || typeof parsed[0] !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(parsed[0])
          || !Number.isFinite(Date.parse(parsed[0])) || typeof parsed[1] !== "string"
          || !UUID_PATTERN.test(parsed[1])) throw new Error("Invalid cursor");
        cursor = parsed as [string, string];
      } catch {
        return Response.json({ error: "Please refresh the guest list." }, { status: 400, headers: privateResponseHeaders });
      }
    }
    const supabase = await createClient();
    const access = await supabase.rpc("is_baby_shower_host");
    if (access.error) throw new Error("Host access check failed");
    if (access.data !== true) {
      return Response.json({ error: "This account has not been enabled as the host in Supabase." }, {
        status: 403, headers: privateResponseHeaders,
      });
    }
    let query = supabase.from(RSVP_TABLE).select("id,name,attendance,guests,message,created_at")
      .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(201);
    if (cursor) query = query.or(`created_at.lt.${cursor[0]},and(created_at.eq.${cursor[0]},id.lt.${cursor[1]})`);
    const result = await query;
    if (result.error || !result.data) throw new Error("Guest list read failed");
    const rows = (result.data as DatabaseRsvp[]).map(guestResponse);
    const visible = rows.slice(0, 200);
    const last = visible.at(-1);
    return Response.json({ rsvps: visible, nextCursor: rows.length > 200 && last
      ? JSON.stringify([last.createdAt, last.id]) : null }, { headers: privateResponseHeaders });
  } catch {
    console.error("Host guest list request failed");
    return Response.json({ error: "The guest list is unavailable right now. Please try again." }, {
      status: 503, headers: privateResponseHeaders,
    });
  }
}
