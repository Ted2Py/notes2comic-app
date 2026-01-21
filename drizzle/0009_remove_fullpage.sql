-- Remove fullpage from output_format enum
-- First, update any existing rows that have 'fullpage' to use 'separate' instead
UPDATE "comics" SET "output_format" = 'separate' WHERE "output_format" = 'fullpage';

-- Drop the old check constraint
ALTER TABLE "comics" DROP CONSTRAINT IF EXISTS "comics_output_format_check";

-- Add the new check constraint without fullpage
ALTER TABLE "comics" ADD CONSTRAINT "comics_output_format_check" CHECK ("output_format" IN ('strip', 'separate'));
