import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { rsvps } from "@/db/schema";
import { expectedRsvpOrigin, privateResponseHeaders } from "@/lib/rsvp-server";
import { isAllowedOrigin, readRsvpJson, RsvpRequestError, validateRsvp } from "@/lib/rsvp-validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAllowedOrigin(request.headers.get("origin"), expectedRsvpOrigin(request))) {
    return Response.json({ error: "Please send your RSVP from the invitation website." }, {
      status: 403, headers: privateResponseHeaders,
    });
  }
  try {
    const input = validateRsvp(await readRsvpJson(request));
    const db = getDb();
    const inserted = await db.insert(rsvps).values(input)
      .onConflictDoNothing({ target: rsvps.id }).returning({ id: rsvps.id });

    if (!inserted.length) {
      const [saved] = await db.select().from(rsvps).where(eq(rsvps.id, input.id)).limit(1);
      if (!saved) throw new Error("RSVP persistence could not be confirmed");
      if (saved.name !== input.name || saved.attendance !== input.attendance
          || saved.guests !== input.guests || saved.message !== input.message) {
        return Response.json({ error: "This RSVP was already sent with different details. Refresh the invitation to send a new response." }, {
          status: 409, headers: privateResponseHeaders,
        });
      }
    }

    return Response.json({ ok: true, id: input.id }, {
      status: inserted.length ? 201 : 200, headers: privateResponseHeaders,
    });
  } catch (error) {
    if (error instanceof RsvpRequestError) {
      return Response.json({ error: error.message }, { status: error.status, headers: privateResponseHeaders });
    }
    // Avoid logging submitted names and wishes when storage is unavailable.
    console.error("RSVP storage request failed");
    return Response.json({ error: "Your RSVP could not be confirmed. Please try again in a moment." }, {
      status: 503, headers: { ...privateResponseHeaders, "Retry-After": "10" },
    });
  }
}
