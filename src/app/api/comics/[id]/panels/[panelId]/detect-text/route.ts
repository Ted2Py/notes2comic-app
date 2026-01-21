import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { detectTextBoxes } from "@/lib/comic-generator";
import { db } from "@/lib/db";
import { panels, comics } from "@/lib/schema";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; panelId: string }> }
) {
  try {
    const { id, panelId } = await params;
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const comic = await db.query.comics.findFirst({
      where: eq(comics.id, id),
    });

    if (!comic || comic.userId !== session.user.id) {
      return NextResponse.json({ error: "Comic not found" }, { status: 404 });
    }

    const panel = await db.query.panels.findFirst({
      where: and(eq(panels.id, panelId), eq(panels.comicId, id)),
    });

    if (!panel) {
      return NextResponse.json({ error: "Panel not found" }, { status: 404 });
    }

    // Detect text boxes
    const detectedBoxes = await detectTextBoxes(panel.imageUrl);

    // Update panel with detected text boxes
    await db
      .update(panels)
      .set({ detectedTextBoxes: detectedBoxes })
      .where(eq(panels.id, panelId));

    return NextResponse.json({ success: true, textBoxes: detectedBoxes });
  } catch (error) {
    console.error("Text detection error:", error);
    return NextResponse.json(
      { error: "Failed to detect text" },
      { status: 500 }
    );
  }
}
