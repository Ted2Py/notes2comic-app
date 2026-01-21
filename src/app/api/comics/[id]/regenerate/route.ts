import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { inngest } from "@/lib/inngest";
import { generatePanelImage } from "@/lib/comic-generator";
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
    const { panelId, options, includeContext, editedText } = body;

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

      // Fetch adjacent panels for context
      let contextString = "";
      if (includeContext) {
        const previousPanel = await db.query.panels.findFirst({
          where: and(
            eq(panels.comicId, id),
            eq(panels.panelNumber, panel.panelNumber - 1)
          ),
        });

        const nextPanel = await db.query.panels.findFirst({
          where: and(
            eq(panels.comicId, id),
            eq(panels.panelNumber, panel.panelNumber + 1)
          ),
        });

        const contextParts = [
          previousPanel?.textBox || previousPanel?.metadata?.generationPrompt,
          nextPanel?.textBox || nextPanel?.metadata?.generationPrompt
        ].filter(Boolean);

        contextString = contextParts.join(" | ");
      }

      // Generate new image with character reference for consistency
      // Use edited text if provided, otherwise use panel's caption
      const dialogueText = editedText || panel.caption;

      const newImageUrl = await generatePanelImage(
        {
          panelNumber: panel.panelNumber,
          description: panel.textBox || (panel.metadata?.generationPrompt as string) || "",
          dialogue: dialogueText,
          visualElements: comic.artStyle,
        },
        options?.artStyle || comic.artStyle,
        comic.characterReference || options?.characterContext as string,
        undefined,  // outputFormat
        undefined,  // pageSize
        undefined,  // borderStyle
        undefined,  // includeCaptions
        contextString  // NEW: adjacent panels context
      );

      // Update panel with regeneration count and new caption if edited text was provided
      await db
        .update(panels)
        .set({
          imageUrl: newImageUrl,
          caption: dialogueText,
          regenerationCount: (panel.regenerationCount || 0) + 1,
        })
        .where(eq(panels.id, panelId));

      return NextResponse.json({ success: true, imageUrl: newImageUrl });
    } else {
      // Regenerate entire comic using Inngest
      await inngest.send({
        name: "comic/generate",
        data: {
          comicId: id,
          inputUrl: comic.inputUrl || "",
          inputType: comic.inputType,
          options: options || {
            subject: comic.subject,
            artStyle: comic.artStyle as any,
            tone: comic.tone as any,
            length: "medium",
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: "Comic regeneration started in background",
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
