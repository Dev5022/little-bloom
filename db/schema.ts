import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const rsvps = sqliteTable("rsvps", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  attendance: text("attendance", { enum: ["yes", "no"] }).notNull(),
  guests: integer("guests").notNull(),
  message: text("message").notNull().default(""),
  createdAt: text("created_at").notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
}, (table) => [
  check("rsvps_name_length", sql`length(${table.name}) BETWEEN 1 AND 100`),
  check("rsvps_attendance", sql`${table.attendance} IN ('yes', 'no')`),
  check("rsvps_guest_count", sql`(${table.attendance} = 'yes' AND ${table.guests} BETWEEN 1 AND 10) OR (${table.attendance} = 'no' AND ${table.guests} = 0)`),
  check("rsvps_message_length", sql`length(${table.message}) <= 1000`),
  index("rsvps_created_id_idx").on(table.createdAt, table.id),
]);
