-- Add drawing_data column to panels table
ALTER TABLE "panels" ADD COLUMN "drawing_data" text;
--> statement-breakpoint
-- Add drawing_data column to panel_history table
ALTER TABLE "panel_history" ADD COLUMN "drawing_data" text;
