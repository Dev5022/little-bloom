import test, { after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

// Execute the real routes and Drizzle SQL against SQLite through a small D1
// adapter. Only the Worker runtime binding and Node's TS/alias resolution differ.
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const runtime = { HOST_EMAIL: "host@example.test", PUBLIC_SITE_ORIGIN: "https://baby.example" };
const runtimeKey = Symbol.for("little-bloom-route-test-runtime");
globalThis[runtimeKey] = runtime;

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") return { url: "test:workers", shortCircuit: true };
    let candidate;
    if (specifier.startsWith("@/")) candidate = resolve(projectRoot, specifier.slice(2));
    else if (specifier.startsWith(".") && context.parentURL?.endsWith(".ts")) {
      candidate = fileURLToPath(new URL(specifier, context.parentURL));
    }
    if (candidate) {
      for (const path of [candidate, `${candidate}.ts`, resolve(candidate, "index.ts")]) {
        if (existsSync(path) && path.endsWith(".ts")) return { url: pathToFileURL(path).href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === "test:workers") return { format: "module", source: 'export const env = globalThis[Symbol.for("little-bloom-route-test-runtime")];', shortCircuit: true };
    return nextLoad(url, context);
  },
});

const { POST } = await import("../app/api/rsvp/route.ts");
const { GET } = await import("../app/api/host/rsvps/route.ts");
hooks.deregister();
let sqlite;
let failWrites = false;

function adapter(database) {
  return {
    prepare(sql) {
      return {
        bind(...values) {
          function query(arrays) {
            if (failWrites && /^insert\b/i.test(sql)) throw new Error("Simulated D1 write outage");
            const statement = database.prepare(sql);
            statement.setReturnArrays(arrays);
            return statement.all(...values);
          }
          return {
            raw: async () => query(true),
            all: async () => ({ success: true, results: query(false), meta: {} }),
            run: async () => ({ success: true, results: [], meta: database.prepare(sql).run(...values) }),
          };
        },
      };
    },
  };
}

beforeEach(() => {
  sqlite?.close();
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("../drizzle/0000_long_ink.sql", import.meta.url), "utf8"));
  runtime.DB = adapter(sqlite);
  runtime.HOST_EMAIL = "host@example.test";
  runtime.PUBLIC_SITE_ORIGIN = "https://baby.example";
  failWrites = false;
});
after(() => { sqlite?.close(); delete globalThis[runtimeKey]; });

const input = () => ({ id: randomUUID(), name: "આશા પટેલ", attendance: "yes", guests: 3, message: "A little love ♡" });
const request = (payload, origin = "https://baby.example") => new Request("https://internal-worker.example/api/rsvp", {
  method: "POST", headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) },
  body: JSON.stringify(payload),
});
const hostRequest = (email = "host@example.test", cursor) => new Request(`https://baby.example/api/host/rsvps${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, {
  headers: email ? { "oai-authenticated-user-id": "test-site-user", "oai-authenticated-user-email": email } : {},
});
const countRows = () => sqlite.prepare("SELECT count(*) AS n FROM rsvps").get().n;

test("POST stores one response and an unchanged retry is idempotent", async () => {
  const payload = input();
  const initial = await POST(request(payload));
  assert.equal(initial.status, 201);
  assert.deepEqual(await initial.json(), { ok: true, id: payload.id });
  assert.equal(countRows(), 1);
  const saved = sqlite.prepare("SELECT * FROM rsvps WHERE id = ?").get(payload.id);
  assert.equal(saved.name, payload.name);
  assert.equal(saved.guests, payload.guests);
  assert.match(saved.created_at, /^\d{4}-\d{2}-\d{2}T.+Z$/);
  const retry = await POST(request(payload));
  assert.equal(retry.status, 200);
  assert.deepEqual(await retry.json(), { ok: true, id: payload.id });
  assert.equal(countRows(), 1);
});

test("a changed retry cannot overwrite the original response", async () => {
  const payload = input();
  assert.equal((await POST(request(payload))).status, 201);
  const conflict = await POST(request({ ...payload, guests: 7 }));
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).ok, undefined);
  assert.equal(sqlite.prepare("SELECT guests FROM rsvps WHERE id = ?").get(payload.id).guests, 3);
  assert.equal(countRows(), 1);
});

test("public origin verification uses the configured host and rejects cross-site/missing origins", async () => {
  assert.equal((await POST(request(input(), "https://evil.example"))).status, 403);
  assert.equal((await POST(request(input(), null))).status, 403);
  assert.equal(countRows(), 0);
  // Request URL deliberately uses a different internal Worker host.
  assert.equal((await POST(request(input()))).status, 201);
});

test("invalid guest counts never write, and storage failures never return success", async () => {
  const payload = input();
  assert.equal((await POST(request({ ...payload, attendance: "no", guests: 3 }))).status, 400);
  assert.equal(countRows(), 0);
  failWrites = true;
  const outage = await POST(request(payload));
  assert.equal(outage.status, 503);
  assert.equal((await outage.json()).ok, undefined);
  assert.equal(countRows(), 0);
  failWrites = false;
  assert.equal((await POST(request(payload))).status, 201);
});

test("guest-list reads require both dispatch identity and the host email", async () => {
  await POST(request(input()));
  assert.equal((await GET(hostRequest(null))).status, 401);
  assert.equal((await GET(hostRequest("guest@example.test"))).status, 403);
  const emailOnly = new Request("https://baby.example/api/host/rsvps", { headers: { "oai-authenticated-user-email": "host@example.test" } });
  assert.equal((await GET(emailOnly)).status, 401);
  const authorized = await GET(hostRequest(" HOST@EXAMPLE.TEST "));
  assert.equal(authorized.status, 200);
  assert.match(authorized.headers.get("cache-control"), /private.*no-store/);
  assert.equal((await authorized.json()).rsvps.length, 1);
  runtime.HOST_EMAIL = "";
  assert.equal((await GET(hostRequest())).status, 503);
});

test("owner pagination returns all rows once, including matching timestamps", async () => {
  const insert = sqlite.prepare("INSERT INTO rsvps (id,name,attendance,guests,message,created_at) VALUES (?,?,?,?,?,?)");
  for (let i = 0; i < 203; i++) insert.run(randomUUID(), `Guest ${i}`, "yes", 1, "", "2026-10-14T12:00:00.000Z");
  const first = await (await GET(hostRequest())).json();
  assert.equal(first.rsvps.length, 200);
  assert.ok(first.nextCursor);
  const second = await (await GET(hostRequest("host@example.test", first.nextCursor))).json();
  assert.equal(second.rsvps.length, 3);
  assert.equal(second.nextCursor, null);
  assert.equal(new Set([...first.rsvps, ...second.rsvps].map(row => row.id)).size, 203);
  assert.equal((await GET(hostRequest("host@example.test", "bad cursor"))).status, 400);
});
