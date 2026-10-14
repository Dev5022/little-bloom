import type { RsvpInput } from "./rsvp-validation";
import type { GuestResponse } from "./rsvp-export";

export const RSVP_TABLE = "baby_shower_rsvps";

export type DatabaseRsvp = {
  id: string;
  name: string;
  attendance: "yes" | "no";
  guests: number;
  message: string;
  created_at: string;
};

export function sameRsvp(saved: DatabaseRsvp, input: RsvpInput): boolean {
  return saved.id === input.id && saved.name === input.name
    && saved.attendance === input.attendance && saved.guests === input.guests
    && saved.message === input.message;
}

export function guestResponse(row: DatabaseRsvp): GuestResponse {
  return { id: row.id, name: row.name, attendance: row.attendance, guests: row.guests,
    message: row.message, createdAt: new Date(row.created_at).toISOString() };
}
