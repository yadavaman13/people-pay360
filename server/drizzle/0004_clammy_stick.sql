ALTER TABLE "users" DROP CONSTRAINT "users_google_id_unique";--> statement-breakpoint
DROP INDEX "users_google_id_idx";--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "max_punches_per_day" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "google_id";--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "chk_contracts_max_punches_positive" CHECK ("contracts"."max_punches_per_day" > 0);