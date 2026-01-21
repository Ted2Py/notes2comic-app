import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comics, panels, panelHistory } from "@/lib/schema";

// GET - Get panel history
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; panelId: string }> }
) {
  try {
    const { id, panelId } = await params;
    const session = await auth.api.getSession({
      headers: req.headers,
    });

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

    // Get panel history ordered by version number (newest first)
    const history = await db.query.panelHistory.findMany({
      where: eq(panelHistory.panelId, panelId),
      orderBy: [desc(panelHistory.versionNumber)],
    });

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Get panel history error:", error);
    return NextResponse.json(
      { error: "Failed to get panel history" },
      { status: 500 }
    );
  }
}

// POST - Restore panel from history
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; panelId: string }> }
) {
  try {
    const { id, panelId } = await params;
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { historyId } = body;

    if (!historyId) {
      return NextResponse.json({ error: "historyId is required" }, { status: 400 });
    }

    // Verify ownership
    const comic = await db.query.comics.findFirst({
      where: eq(comics.id, id),
    });

    if (!comic || comic.userId !== session.user.id) {
      return NextResponse.json({ error: "Comic not found" }, { status: 404 });
    }

    // Get the history entry
    const historyEntry = await db.query.panelHistory.findFirst({
      where: eq(panelHistory.id, historyId),
    });

    if (!historyEntry || historyEntry.panelId !== panelId) {
      return NextResponse.json({ error: "History entry not found" }, { status: 404 });
    }

    // Restore panel from history (no need to save current state - user is just navigating history)
    await db
      .update(panels)
      .set({
        imageUrl: historyEntry.imageUrl,
        caption: historyEntry.caption,
        textBox: historyEntry.textBox,
        speechBubbles: historyEntry.speechBubbles,
        bubblePositions: historyEntry.bubblePositions,
        detectedTextBoxes: historyEntry.detectedTextBoxes,
        drawingLayers: historyEntry.drawingLayers,
        drawingData: historyEntry.drawingData,
        metadata: historyEntry.metadata,
      })
      .where(eq(panels.id, panelId));

    return NextResponse.json({
      success: true,
      panel: {
        imageUrl: historyEntry.imageUrl,
        caption: historyEntry.caption,
        textBox: historyEntry.textBox,
        speechBubbles: historyEntry.speechBubbles,
        bubblePositions: historyEntry.bubblePositions,
        detectedTextBoxes: historyEntry.detectedTextBoxes,
        drawingLayers: historyEntry.drawingLayers,
        drawingData: historyEntry.drawingData,
        metadata: historyEntry.metadata,
      },
    });
  } catch (error) {
    console.error("Restore panel history error:", error);
    return NextResponse.json(
      { error: "Failed to restore panel from history" },
      { status: 500 }
    );
  }
}
