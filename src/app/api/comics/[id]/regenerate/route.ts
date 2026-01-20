import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { generatePanelImage, generateComic } from "@/lib/comic-generator";
import { db } from "@/lib/db";
import { comics, panels } from "@/lib/schema";

// POST - Regenerate specific panel or entire comic
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
    const { panelId, options } = body;

    // Verify ownership
    const comic = await db.query.comics.findFirst({
      where: eq(comics.id, id),
    });

    if (!comic || comic.userId !== session.user.id) {
      return NextResponse.json({ error: "Comic not found" }, { status: 404 });
    }

    if (panelId) {
      // Regenerate single panel
      const panel = await db.query.panels.findFirst({
        where: and(
          eq(panels.id, panelId),
          eq(panels.comicId, id)
        ),
      });

      if (!panel) {
        return NextResponse.json(
          { error: "Panel not found" },
          { status: 404 }
        );
      }

      // Generate new image with character reference for consistency
      const newImageUrl = await generatePanelImage(
        {
          panelNumber: panel.panelNumber,
          description: panel.textBox || (panel.metadata?.generationPrompt as string) || "",
          dialogue: panel.caption,
          visualElements: comic.artStyle,
        },
        options?.artStyle || comic.artStyle,
        comic.characterReference || options?.characterContext as string
      );

      // Update panel with regeneration count
      await db
        .update(panels)
        .set({
          imageUrl: newImageUrl,
          regenerationCount: (panel.regenerationCount || 0) + 1,
        })
        .where(eq(panels.id, panelId));

      return NextResponse.json({ success: true, imageUrl: newImageUrl });
    } else {
      // Regenerate entire comic
      // Trigger background regeneration
      generateComic(
        id,
        comic.inputUrl || "",
        comic.inputType,
        options || {
          subject: comic.subject,
          artStyle: comic.artStyle as any,
          tone: comic.tone as any,
          length: "medium",
        }
      ).catch(console.error);

      return NextResponse.json({
        success: true,
        message: "Comic regeneration started",
      });
    }
  } catch (error) {
    console.error("Regenerate error:", error);
    return NextResponse.json(
      { error: "Failed to regenerate" },
      { status: 500 }
    );
  }
}
