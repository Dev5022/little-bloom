export const MAX_RSVP_BODY_BYTES = 12_288;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type RsvpInput = {
  id: string;
  name: string;
  attendance: "yes" | "no";
  guests: number;
  message: string;
};

export class RsvpRequestError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "RsvpRequestError";
    this.status = status;
  }
}

export function isAllowedOrigin(origin: string | null, expected: string): boolean {
  if (!origin || origin.length > 2048) return false;
  try {
    const source = new URL(origin);
    const target = new URL(expected);
    return ["https:", "http:"].includes(source.protocol)
      && source.origin === target.origin
      && !source.username && !source.password
      && source.pathname === "/" && !source.search && !source.hash;
  } catch {
    return false;
  }
}

export async function readRsvpJson(request: Request): Promise<unknown> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) {
    throw new RsvpRequestError("Please submit the RSVP form as JSON.", 415);
  }
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_RSVP_BODY_BYTES)) {
    throw new RsvpRequestError("The RSVP is too large.", 413);
  }
  if (!request.body) throw new RsvpRequestError("Please complete the RSVP form.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RSVP_BODY_BYTES) {
        await reader.cancel();
        throw new RsvpRequestError("The RSVP is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new RsvpRequestError("The RSVP could not be read. Please try again.");
  }
}

export function validateRsvp(payload: unknown): RsvpInput {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new RsvpRequestError("Please complete the RSVP form.");
  }
  const input = payload as Record<string, unknown>;
  if (typeof input.id !== "string" || !UUID_PATTERN.test(input.id)) {
    throw new RsvpRequestError("Please refresh the invitation and try again.");
  }
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name || name.length > 100 || /[\u0000-\u001f\u007f-\u009f]/.test(name)) {
    throw new RsvpRequestError("Please enter a name of up to 100 characters.");
  }
  if (input.attendance !== "yes" && input.attendance !== "no") {
    throw new RsvpRequestError("Please let us know whether you can attend.");
  }
  if (!Number.isInteger(input.guests)
      || (input.attendance === "yes" && (Number(input.guests) < 1 || Number(input.guests) > 10))
      || (input.attendance === "no" && input.guests !== 0)) {
    throw new RsvpRequestError("Please choose 1 to 10 guests, or 0 if you cannot attend.");
  }
  const message = input.message === undefined ? ""
    : typeof input.message === "string" ? input.message.trim() : null;
  if (message === null || message.length > 1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/.test(message)) {
    throw new RsvpRequestError("Please keep your wishes to 1,000 characters.");
  }
  return { id: input.id.toLowerCase(), name, attendance: input.attendance,
    guests: input.guests as number, message };
}
