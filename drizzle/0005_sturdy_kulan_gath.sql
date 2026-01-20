ALTER TABLE "comments" ADD COLUMN "is_censored" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "censored_content" text;