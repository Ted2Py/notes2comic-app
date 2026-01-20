CREATE TABLE "comics" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"input_type" text NOT NULL,
	"input_url" text,
	"art_style" text DEFAULT 'retro' NOT NULL,
	"tone" text DEFAULT 'friendly' NOT NULL,
	"subject" text NOT NULL,
	"output_format" text DEFAULT 'separate' NOT NULL,
	"requested_panel_count" integer,
	"character_reference" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" text PRIMARY KEY NOT NULL,
	"comic_id" text NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "likes" (
	"id" text PRIMARY KEY NOT NULL,
	"comic_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "likes_comic_user_unique" UNIQUE("comic_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "panels" (
	"id" text PRIMARY KEY NOT NULL,
	"comic_id" text NOT NULL,
	"panel_number" integer NOT NULL,
	"image_url" text NOT NULL,
	"caption" text NOT NULL,
	"text_box" text,
	"speech_bubbles" jsonb,
	"bubble_positions" jsonb,
	"regeneration_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comics" ADD CONSTRAINT "comics_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_comic_id_comics_id_fk" FOREIGN KEY ("comic_id") REFERENCES "public"."comics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_comic_id_comics_id_fk" FOREIGN KEY ("comic_id") REFERENCES "public"."comics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "panels" ADD CONSTRAINT "panels_comic_id_comics_id_fk" FOREIGN KEY ("comic_id") REFERENCES "public"."comics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comics_user_id_idx" ON "comics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "comics_status_idx" ON "comics" USING btree ("status");--> statement-breakpoint
CREATE INDEX "comics_is_public_idx" ON "comics" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "comments_comic_id_idx" ON "comments" USING btree ("comic_id");--> statement-breakpoint
CREATE INDEX "comments_user_id_idx" ON "comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "likes_comic_id_idx" ON "likes" USING btree ("comic_id");--> statement-breakpoint
CREATE INDEX "likes_user_id_idx" ON "likes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "panels_comic_id_idx" ON "panels" USING btree ("comic_id");--> statement-breakpoint
CREATE INDEX "panels_comic_number_idx" ON "panels" USING btree ("comic_id","panel_number");