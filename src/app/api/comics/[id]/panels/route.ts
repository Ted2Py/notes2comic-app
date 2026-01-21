import { NextRequest, NextResponse } from "next/server";
import { eq, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { generatePanelImage } from "@/lib/comic-generator";
import { db } from "@/lib/db";
import { comics, panels } from "@/lib/schema";

const MAX_PANELS = 12;

// POST - Add a new panel to the comic
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Verify ownership
    const comic = await db.query.comics.findFirst({
      where: eq(comics.id, id),
    });

    if (!comic || comic.userId !== session.user.id) {
      return NextResponse.json({ error: "Comic not found" }, { status: 404 });
    }

    // Check current panel count
    const panelCountResult = await db
      .select({ count: count() })
      .from(panels)
      .where(eq(panels.comicId, id));

    const currentPanelCount = panelCountResult[0]?.count || 0;

    if (currentPanelCount >= MAX_PANELS) {
      return NextResponse.json(
        { error: `Maximum panel limit of ${MAX_PANELS} reached` },
        { status: 400 }
      );
    }

    // Get the last panel for context
    const lastPanel = await db.query.panels.findFirst({
      where: eq(panels.comicId, id),
      orderBy: [panels.panelNumber],
      with: {
        comic: true,
      },
    });

    // Build character context
    const characterContext = comic.characterReference
      ? `Character reference: ${comic.characterReference}`
      : lastPanel?.metadata?.characterContext || "";

    // Build adjacent context from last panel
    const adjacentContext = lastPanel
      ? `Previous panel: ${lastPanel.textBox || lastPanel.metadata?.generationPrompt || ""}`
      : "";

    // Generate the new panel image
    const newPanelNumber = currentPanelCount + 1;
    const imageUrl = await generatePanelImage(
      {
        panelNumber: newPanelNumber,
        description: prompt,
        dialogue: "", // No dialogue for user-generated panels initially
        visualElements: comic.artStyle,
      },
      comic.artStyle,
      characterContext,
      undefined, // outputFormat
      undefined, // pageSize
      undefined, // borderStyle
      undefined, // includeCaptions
      adjacentContext // adjacent panels context for narrative continuity
    );

    // Insert the new panel
    const newPanelId = `panel-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    await db.insert(panels).values({
      id: newPanelId,
      comicId: id,
      panelNumber: newPanelNumber,
      imageUrl,
      caption: prompt, // Use the prompt as the caption
      textBox: prompt, // Store the prompt as the scene description
      speechBubbles: [],
      bubblePositions: [],
      regenerationCount: 0,
      metadata: {
        generationPrompt: prompt,
        characterContext,
      },
    });

    // Fetch the created panel to return
    const createdPanel = await db.query.panels.findFirst({
      where: eq(panels.id, newPanelId),
    });

    if (!createdPanel) {
      return NextResponse.json(
        { error: "Failed to create panel" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      panel: createdPanel,
    });
  } catch (error) {
    console.error("Add panel error:", error);
    return NextResponse.json(
      { error: "Failed to add panel" },
      { status: 500 }
    );
  }
}
