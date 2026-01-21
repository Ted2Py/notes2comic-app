-- Add drawing_data column to panels table
ALTER TABLE panels ADD COLUMN IF NOT EXISTS drawing_data text;

-- Add drawing_data column to panel_history table
ALTER TABLE panel_history ADD COLUMN IF NOT EXISTS drawing_data text;
