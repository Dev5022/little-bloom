import { createAdminClient } from "@/lib/supabase/admin";
import { expectedRsvpOrigin, privateResponseHeaders } from "@/lib/rsvp-server";
import { isAllowedOrigin, readRsvpJson, RsvpRequestError, validateRsvp } from "@/lib/rsvp-validation";
import { RSVP_TABLE, sameRsvp, type DatabaseRsvp } from "@/lib/rsvp-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAllowedOrigin(request.headers.get("origin"), expectedRsvpOrigin(request))) {
    return Response.json({ error: "Please send your RSVP from the invitation website." }, {
      status: 403, headers: privateResponseHeaders,
    });
  }
  try {
    const input = validateRsvp(await readRsvpJson(request));
    const supabase = createAdminClient();
    const inserted = await supabase.from(RSVP_TABLE).insert(input).select("id").single();
    if (inserted.error) {
      if (inserted.error.code !== "23505") throw new Error("RSVP write failed");
      const saved = await supabase.from(RSVP_TABLE).select("*").eq("id", input.id).single();
      if (saved.error || !saved.data) throw new Error("RSVP persistence could not be confirmed");
      if (!sameRsvp(saved.data as DatabaseRsvp, input)) {
        return Response.json({ error: "This RSVP was already sent with different details." }, {
          status: 409, headers: privateResponseHeaders,
        });
      }
      return Response.json({ ok: true, id: input.id }, { headers: privateResponseHeaders });
    }
    if (inserted.data?.id !== input.id) throw new Error("RSVP persistence could not be confirmed");
    return Response.json({ ok: true, id: input.id }, { status: 201, headers: privateResponseHeaders });
  } catch (error) {
    if (error instanceof RsvpRequestError) {
      return Response.json({ error: error.message }, { status: error.status, headers: privateResponseHeaders });
    }
    console.error("RSVP storage request failed");
    return Response.json({ error: "Your RSVP could not be confirmed. Please try again in a moment." }, {
      status: 503, headers: { ...privateResponseHeaders, "Retry-After": "10" },
    });
  }
}
