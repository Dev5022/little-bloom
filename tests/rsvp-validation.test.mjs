import test from "node:test";
import assert from "node:assert/strict";
import { isAllowedOrigin, MAX_RSVP_BODY_BYTES, readRsvpJson, RsvpRequestError, validateRsvp } from "../lib/rsvp-validation.ts";
import { csvCell, guestListCsv } from "../lib/rsvp-export.ts";

const valid = {
  id: "370e8cdf-50d0-4a93-9251-fcc22fc7c645", name: "  આશા પટેલ  ",
  attendance: "yes", guests: 2, message: "  Many loving wishes ♡  ",
};

test("RSVP validation preserves Gujarati and normalizes bounded fields", () => {
  assert.deepEqual(validateRsvp(valid), { ...valid, name: "આશા પટેલ", message: "Many loving wishes ♡" });
  assert.equal(validateRsvp({ ...valid, attendance: "no", guests: 0 }).guests, 0);
});

test("malformed, out-of-range and inconsistent responses are rejected", () => {
  for (const payload of [null, [], { ...valid, id: "bad" }, { ...valid, name: " " },
    { ...valid, name: "x".repeat(101) }, { ...valid, name: "name\nInjected" },
    { ...valid, attendance: "maybe" }, { ...valid, guests: 0 }, { ...valid, guests: 11 },
    { ...valid, guests: "2" }, { ...valid, guests: 1.5 }, { ...valid, attendance: "no", guests: 1 },
    { ...valid, message: "x".repeat(1001) }, { ...valid, message: 3 }, { ...valid, message: "\u0000" }]) {
    assert.throws(() => validateRsvp(payload), RsvpRequestError);
  }
});

test("only the intended origin can submit RSVP", () => {
  assert.equal(isAllowedOrigin("https://baby.example", "https://baby.example/"), true);
  for (const origin of [null, "null", "https://other.example", "https://baby.example.evil.test", "https://baby.example/path", "https://user@baby.example"]) {
    assert.equal(isAllowedOrigin(origin, "https://baby.example"), false);
  }
  assert.equal(isAllowedOrigin("http://localhost:5173", "http://localhost:5173/"), true);
});

test("JSON reading rejects wrong content type, oversized declared and streamed bodies", async () => {
  const request = body => new Request("https://baby.example/api/rsvp", {
    method: "POST", headers: { "Content-Type": "application/json" }, body,
  });
  assert.deepEqual(await readRsvpJson(request(JSON.stringify(valid))), valid);
  await assert.rejects(readRsvpJson(new Request("https://baby.example", { method: "POST", body: "name=Asha" })), error => error.status === 415);
  await assert.rejects(readRsvpJson(new Request("https://baby.example", { method: "POST", headers: { "Content-Type": "application/json", "Content-Length": String(MAX_RSVP_BODY_BYTES + 1) }, body: "{}" })), error => error.status === 413);
  await assert.rejects(readRsvpJson(request(" ".repeat(MAX_RSVP_BODY_BYTES + 1))), error => error.status === 413);
  await assert.rejects(readRsvpJson(request("{bad")), error => error.status === 400);
});

test("CSV escapes quotes, retains Gujarati and neutralizes spreadsheet formulas", () => {
  assert.equal(csvCell('=HYPERLINK("evil")'), '"\'=HYPERLINK(""evil"")"');
  assert.equal(csvCell("  +SUM(1,2)"), '"\'  +SUM(1,2)"');
  assert.equal(csvCell("\ttext"), '"\'\ttext"');
  assert.equal(csvCell('A "quoted" name'), '"A ""quoted"" name"');
  const csv = guestListCsv([{ ...valid, createdAt: "2026-10-14T12:00:00.000Z" }]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes("આશા પટેલ"));
});
