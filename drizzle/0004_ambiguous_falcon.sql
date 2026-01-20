ALTER TABLE "comics" ADD COLUMN "border_style" text DEFAULT 'straight' NOT NULL;--> statement-breakpoint
ALTER TABLE "comics" ADD COLUMN "show_captions" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "comics" ADD COLUMN "tags" text[];