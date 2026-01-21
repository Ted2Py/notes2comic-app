CREATE TABLE "panel_history" (
	"id" text PRIMARY KEY NOT NULL,
	"panel_id" text NOT NULL,
	"comic_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"image_url" text NOT NULL,
	"caption" text NOT NULL,
	"text_box" text,
	"speech_bubbles" jsonb,
	"bubble_positions" jsonb,
	"detected_text_boxes" jsonb,
	"drawing_layers" jsonb,
	"drawing_data" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "panel_history" ADD CONSTRAINT "panel_history_panel_id_panels_id_fk" FOREIGN KEY ("panel_id") REFERENCES "public"."panels"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "panel_history" ADD CONSTRAINT "panel_history_comic_id_comics_id_fk" FOREIGN KEY ("comic_id") REFERENCES "public"."comics"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "panel_history_panel_id_idx" ON "panel_history" USING btree ("panel_id");
--> statement-breakpoint
CREATE INDEX "panel_history_comic_id_idx" ON "panel_history" USING btree ("comic_id");
--> statement-breakpoint
CREATE INDEX "panel_history_version_idx" ON "panel_history" USING btree ("panel_id","version_number");
