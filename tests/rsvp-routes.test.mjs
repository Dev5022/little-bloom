import test, { beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// Run the actual API routes and Supabase SDK against a deterministic HTTP
// fixture. Hosted Postgres/RLS and real credentials are verified at deployment.
const root = fileURLToPath(new URL("../", import.meta.url));
const key = Symbol.for("little-bloom-supabase-test");
const state = { rows: new Map(), requests: [], token: undefined, failWrites: false,
  failReads: false, registered: true };
process.env.HOST_EMAIL = "host@example.test";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

async function restFetch(input, init) {
  const request = new Request(input, init);
  const url = new URL(request.url);
  state.requests.push({ path: url.pathname, method: request.method });
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  const admin = request.headers.get("apikey") === "sb_secret_test";
  if (url.pathname === "/auth/v1/user") {
    if (!["verified-host", "verified-other"].includes(token)) return json({ message: "Invalid session" }, 401);
    return json({ id: "41bfb200-b196-4c14-976a-2bbf12271c0a", email: token === "verified-host" ? "host@example.test" : "other@example.test", aud: "authenticated", role: "authenticated", created_at: "2026-10-14T00:00:00Z" });
  }
  if (url.pathname.endsWith("/rpc/is_baby_shower_host")) return json(token === "verified-host" && state.registered);
  assert.equal(url.pathname, "/rest/v1/baby_shower_rsvps");
  if (request.method === "POST") {
    assert.ok(admin, "Only the server secret may write RSVPs");
    if (state.failWrites) return json({ code: "XX000", message: "Storage unavailable" }, 503);
    const row = await request.json();
    if (state.rows.has(row.id)) return json({ code: "23505", message: "Duplicate id" }, 409);
    state.rows.set(row.id, { ...row, created_at: "2026-10-14T10:11:12.123+00:00" });
    return json({ id: row.id }, 201);
  }
  assert.ok(admin || (token === "verified-host" && state.registered), "Guest rows require an authorized identity");
  if (state.failReads) return json({ code: "XX000", message: "Storage unavailable" }, 503);
  const id = url.searchParams.get("id")?.replace(/^eq\./, "");
  if (id) return state.rows.has(id) ? json(state.rows.get(id)) : json({ code: "PGRST116", message: "No rows" }, 406);
  let rows = [...state.rows.values()].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
  const filter = url.searchParams.get("or");
  if (filter) {
    const match = filter.match(/^\(created_at\.lt\.([^,]+),and\(created_at\.eq\.([^,]+),id\.lt\.([0-9a-f-]+)\)\)$/);
    assert.ok(match, "Cursor must have the expected bounded PostgREST shape");
    rows = rows.filter(row => new Date(row.created_at) < new Date(match[1])
      || (Date.parse(row.created_at) === Date.parse(match[2]) && row.id < match[3]));
  }
  return json(rows.slice(0, Number(url.searchParams.get("limit") || 201)));
}

function sdk(admin = false) {
  const client = createClient("https://test.supabase.co", admin ? "sb_secret_test" : "sb_publishable_test", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: restFetch, headers: state.token && !admin ? { Authorization: `Bearer ${state.token}` } : {} },
  });
  if (!admin) {
    const getUser = client.auth.getUser.bind(client.auth);
    client.auth.getUser = () => getUser(state.token);
  }
  return client;
}

globalThis[key] = { admin: () => sdk(true), server: () => sdk(false) };
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: "fixture:server-only", shortCircuit: true };
    if (specifier === "@/lib/supabase/admin") return { url: "fixture:admin", shortCircuit: true };
    if (specifier === "@/lib/supabase/server" || (specifier === "./supabase/server" && context.parentURL?.endsWith("rsvp-server.ts"))) return { url: "fixture:server", shortCircuit: true };
    let candidate;
    if (specifier.startsWith("@/")) candidate = resolve(root, specifier.slice(2));
    else if (specifier.startsWith(".") && context.parentURL?.endsWith(".ts")) candidate = fileURLToPath(new URL(specifier, context.parentURL));
    if (candidate) for (const filename of [candidate, `${candidate}.ts`]) if (existsSync(filename) && filename.endsWith(".ts")) return { url: pathToFileURL(filename).href, shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === "fixture:server-only") return { format: "module", source: "export {};", shortCircuit: true };
    if (url === "fixture:admin") return { format: "module", source: 'export const createAdminClient = () => globalThis[Symbol.for("little-bloom-supabase-test")].admin();', shortCircuit: true };
    if (url === "fixture:server") return { format: "module", source: 'export const createClient = async () => globalThis[Symbol.for("little-bloom-supabase-test")].server();', shortCircuit: true };
    return next(url, context);
  },
});
const { POST } = await import("../app/api/rsvp/route.ts");
const { GET } = await import("../app/api/host/rsvps/route.ts");
hooks.deregister();

beforeEach(() => {
  state.rows.clear(); state.requests.length = 0; state.token = undefined;
  state.failWrites = false; state.failReads = false; state.registered = true;
  process.env.HOST_EMAIL = "host@example.test";
  delete process.env.VERCEL;
});
after(() => { delete globalThis[key]; });

const input = () => ({ id: randomUUID(), name: "આશા પટેલ", attendance: "yes", guests: 3, message: "A little love ♡" });
const request = (body, origin = "https://baby.example") => new Request("https://baby.example/api/rsvp", {
  method: "POST", headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify(body),
});
const hostRequest = () => new Request("https://baby.example/api/host/rsvps");

test("successful writes are acknowledged once and unchanged retries are idempotent", async () => {
  const body = input();
  assert.equal((await POST(request(body))).status, 201);
  assert.equal(state.rows.get(body.id).name, body.name);
  assert.equal((await POST(request(body))).status, 200);
  assert.equal(state.rows.size, 1);
});

test("changed retries cannot overwrite a saved guest response", async () => {
  const body = input(); await POST(request(body));
  assert.equal((await POST(request({ ...body, guests: 4 }))).status, 409);
  assert.equal(state.rows.get(body.id).guests, 3);
});

test("storage failures never report that the RSVP succeeded", async () => {
  state.failWrites = true;
  const response = await POST(request(input()));
  assert.equal(response.status, 503); assert.equal((await response.json()).ok, undefined);
  assert.equal(state.rows.size, 0);
});

test("cross-site, missing-origin and invalid submissions do not write", async () => {
  assert.equal((await POST(request(input(), "https://evil.test"))).status, 403);
  assert.equal((await POST(request(input(), null))).status, 403);
  assert.equal((await POST(request({ ...input(), guests: 20 }))).status, 400);
  assert.equal(state.rows.size, 0); assert.equal(state.requests.length, 0);
});

test("preview deployments validate against their own origin", async () => {
  const response = await POST(new Request("https://preview-123.vercel.app/api/rsvp", {
    method: "POST", headers: { Origin: "https://preview-123.vercel.app", "Content-Type": "application/json" }, body: JSON.stringify(input()),
  }));
  assert.equal(response.status, 201);
});

test("forged Sites identity headers cannot expose the guest list", async () => {
  const response = await GET(new Request("https://baby.example/api/host/rsvps", {
    headers: { "oai-authenticated-user-id": "forged", "oai-authenticated-user-email": "host@example.test" },
  }));
  assert.equal(response.status, 401);
  assert.ok(!state.requests.some(row => row.path.startsWith("/rest/")));
});

test("local and Vercel requests use the visitor Host instead of an internal hostname", async () => {
  const local = await POST(new Request("http://localhost:3100/api/rsvp", {
    method: "POST", headers: { Host: "127.0.0.1:3100", Origin: "http://127.0.0.1:3100", "Content-Type": "application/json" }, body: JSON.stringify(input()),
  }));
  assert.equal(local.status, 201);
  process.env.VERCEL = "1";
  const preview = await POST(new Request("http://localhost:3000/api/rsvp", {
    method: "POST", headers: { Host: "preview-123.vercel.app", Origin: "https://preview-123.vercel.app", "Content-Type": "application/json" }, body: JSON.stringify(input()),
  }));
  assert.equal(preview.status, 201);
  const foreign = await POST(new Request("http://localhost:3000/api/rsvp", {
    method: "POST", headers: { Host: "preview-123.vercel.app", Origin: "https://evil.test", "Content-Type": "application/json" }, body: JSON.stringify(input()),
  }));
  assert.equal(foreign.status, 403);
});

test("a verified user with another email cannot read responses", async () => {
  state.token = "verified-other";
  assert.equal((await GET(hostRequest())).status, 403);
  assert.ok(!state.requests.some(row => row.path.startsWith("/rest/")));
});

test("host email matching alone cannot bypass the database host allowlist", async () => {
  state.token = "verified-host"; state.registered = false;
  assert.equal((await GET(hostRequest())).status, 403);
});

test("authorized host reads paginate without duplicates and normalize UTC timestamps", async () => {
  state.token = "verified-host";
  for (let i = 0; i < 203; i++) { const row = input(); state.rows.set(row.id, { ...row, created_at: "2026-10-14T10:11:12.123+00:00" }); }
  const first = await GET(hostRequest()); assert.equal(first.status, 200);
  assert.match(first.headers.get("Cache-Control"), /no-store/);
  const page = await first.json(); assert.equal(page.rsvps.length, 200);
  assert.equal(page.rsvps[0].createdAt, "2026-10-14T10:11:12.123Z");
  const second = await GET(new Request(`https://baby.example/api/host/rsvps?cursor=${encodeURIComponent(page.nextCursor)}`));
  const tail = await second.json(); assert.equal(tail.rsvps.length, 3); assert.equal(tail.nextCursor, null);
  assert.equal(new Set([...page.rsvps, ...tail.rsvps].map(row => row.id)).size, 203);
});

test("invalid cursors and unavailable reads fail without exposing guest rows", async () => {
  state.token = "verified-host";
  assert.equal((await GET(new Request("https://baby.example/api/host/rsvps?cursor=invalid"))).status, 400);
  state.failReads = true;
  assert.equal((await GET(hostRequest())).status, 503);
});
