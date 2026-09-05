CREATE TABLE "attendance_punches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendance_record_id" uuid NOT NULL,
	"check_in_time" timestamp with time zone NOT NULL,
	"check_out_time" timestamp with time zone,
	"worked_hours" numeric(5, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_punch_time_order" CHECK ("attendance_punches"."check_out_time" IS NULL OR "attendance_punches"."check_in_time" < "attendance_punches"."check_out_time"),
	CONSTRAINT "chk_punch_worked_hours_non_negative" CHECK ("attendance_punches"."worked_hours" IS NULL OR "attendance_punches"."worked_hours" >= 0)
);
--> statement-breakpoint
ALTER TABLE "attendance_punches" ADD CONSTRAINT "attendance_punches_attendance_record_id_attendance_records_id_fk" FOREIGN KEY ("attendance_record_id") REFERENCES "public"."attendance_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_punches_record_idx" ON "attendance_punches" USING btree ("attendance_record_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_punches_active_unique_idx" ON "attendance_punches" USING btree ("attendance_record_id") WHERE "attendance_punches"."check_out_time" IS NULL;--> statement-breakpoint
INSERT INTO "attendance_punches" ("attendance_record_id", "check_in_time", "check_out_time", "worked_hours", "notes", "created_at", "updated_at")
SELECT "id", "check_in_time", "check_out_time", "worked_hours", "notes", "created_at", "updated_at"
FROM "attendance_records"
WHERE "check_in_time" IS NOT NULL;