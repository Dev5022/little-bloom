CREATE TABLE `rsvps` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`attendance` text NOT NULL,
	`guests` integer NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "rsvps_name_length" CHECK(length("rsvps"."name") BETWEEN 1 AND 100),
	CONSTRAINT "rsvps_attendance" CHECK("rsvps"."attendance" IN ('yes', 'no')),
	CONSTRAINT "rsvps_guest_count" CHECK(("rsvps"."attendance" = 'yes' AND "rsvps"."guests" BETWEEN 1 AND 10) OR ("rsvps"."attendance" = 'no' AND "rsvps"."guests" = 0)),
	CONSTRAINT "rsvps_message_length" CHECK(length("rsvps"."message") <= 1000)
);
--> statement-breakpoint
CREATE INDEX `rsvps_created_id_idx` ON `rsvps` (`created_at`,`id`);