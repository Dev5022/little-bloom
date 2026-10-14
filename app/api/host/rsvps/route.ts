import { and, desc, eq, lt, or } from "drizzle-orm";
import { getDb } from "@/db";
import { rsvps } from "@/db/schema";
import { hostIsConfigured, isAuthorizedHost, privateResponseHeaders, requestHost } from "@/lib/rsvp-server";
import { UUID_PATTERN } from "@/lib/rsvp-validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = requestHost(request);
  if (!hostIsConfigured()) {
    return Response.json({ error: "The host guest list is being prepared. Please try again soon." }, {
      status: 503, headers: privateResponseHeaders,
    });
  }
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
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed) || parsed.length !== 2
          || typeof parsed[0] !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(parsed[0])
          || typeof parsed[1] !== "string" || !UUID_PATTERN.test(parsed[1])) throw new Error("Invalid cursor");
      cursor = [parsed[0], parsed[1]];
    } catch {
      return Response.json({ error: "Please refresh the guest list." }, { status: 400, headers: privateResponseHeaders });
    }
  }

  try {
    const rows = await getDb().select().from(rsvps).where(cursor ? or(
      lt(rsvps.createdAt, cursor[0]),
      and(eq(rsvps.createdAt, cursor[0]), lt(rsvps.id, cursor[1])),
    ) : undefined).orderBy(desc(rsvps.createdAt), desc(rsvps.id)).limit(201);
    const visible = rows.slice(0, 200);
    const last = visible[visible.length - 1];
    return Response.json({ rsvps: visible, nextCursor: rows.length > 200 && last
      ? JSON.stringify([last.createdAt, last.id]) : null }, { headers: privateResponseHeaders });
  } catch {
    console.error("Host guest list request failed");
    return Response.json({ error: "The guest list is unavailable right now. Please try again." }, {
      status: 503, headers: privateResponseHeaders,
    });
  }
}
