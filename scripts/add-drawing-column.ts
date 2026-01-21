import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function addDrawingColumn() {
  try {
    console.log("Adding drawing_data column to panels table...");
    await db.execute(sql`ALTER TABLE panels ADD COLUMN IF NOT EXISTS drawing_data text`);
    console.log("✓ Added drawing_data to panels");

    console.log("Adding drawing_data column to panel_history table...");
    await db.execute(sql`ALTER TABLE panel_history ADD COLUMN IF NOT EXISTS drawing_data text`);
    console.log("✓ Added drawing_data to panel_history");

    console.log("\n✓ Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

addDrawingColumn();
