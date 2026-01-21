import { inngest } from "@/lib/inngest";
import { generateComic } from "@/lib/comic-generator";

/**
 * Inngest job for asynchronous comic generation
 *
 * This job handles the full comic generation process outside of the
 * serverless request/response cycle, avoiding Vercel's timeout limits.
 *
 * Features:
 * - Runs asynchronously (no timeout limits)
 * - Automatic retries on failure (up to 3 times)
 * - Updates comic status in database for progress tracking
 * - Sends completion events when done
 */
export const comicGenerationJob = inngest.createFunction(
  {
    id: "comic-generation",
    name: "Comic Generation",
    // Retry up to 3 times with exponential backoff
    retries: 3,
  },
  {
    event: "comic/generate",
  },
  async ({ event, step }) => {
    const { comicId, inputUrl, inputType, options } = event.data;

    // Step 1: Update status to generating
    await step.run("update-status-generating", async () => {
      const { db } = await import("@/lib/db");
      const { comics } = await import("@/lib/schema");
      const { eq } = await import("drizzle-orm");

      await db
        .update(comics)
        .set({ status: "generating" })
        .where(eq(comics.id, comicId));
    });

    // Step 2: Generate the comic (this can take several minutes)
    await step.run("generate-comic", async () => {
      await generateComic(comicId, inputUrl, inputType, options);
    });

    return {
      success: true,
      comicId,
      message: "Comic generated successfully",
    };
  }
);

/**
 * Inngest job for regenerating a single panel
 *
 * Used when user wants to regenerate a specific panel in the editor.
 */
export const panelRegenerationJob = inngest.createFunction(
  {
    id: "panel-regeneration",
    name: "Panel Regeneration",
    retries: 3,
  },
  {
    event: "panel/regenerate",
  },
  async ({ event, step }) => {
    const { comicId, panelId, includeContext } = event.data;

    await step.run("regenerate-panel", async () => {
      const { generatePanelImage } = await import("@/lib/comic-generator");
      const { db } = await import("@/lib/db");
      const { comics, panels } = await import("@/lib/schema");
      const { eq } = await import("drizzle-orm");

      // Get comic and panel
      const comic = await db.query.comics.findFirst({
        where: eq(comics.id, comicId),
      });

      const panel = await db.query.panels.findFirst({
        where: eq(panels.id, panelId),
      });

      if (!comic || !panel) {
        throw new Error("Comic or panel not found");
      }

      // Build context from previous panel
      let adjacentContext = "";
      if (includeContext && panel.panelNumber > 1) {
        const prevPanel = await db.query.panels.findFirst({
          where: eq(panels.comicId, comicId),
        });

        if (prevPanel) {
          adjacentContext = `Previous panel: ${prevPanel.textBox || prevPanel.metadata?.generationPrompt || ""}`;
        }
      }

      // Generate new image
      const imageUrl = await generatePanelImage(
        {
          panelNumber: panel.panelNumber,
          description: panel.textBox || panel.metadata?.generationPrompt || "",
          dialogue: panel.caption,
          visualElements: comic.artStyle,
        },
        comic.artStyle,
        comic.characterReference || undefined,
        comic.outputFormat,
        comic.pageSize,
        comic.borderStyle,
        comic.showCaptions,
        adjacentContext
      );

      // Update panel with new image
      await db
        .update(panels)
        .set({
          imageUrl,
          regenerationCount: (panel.regenerationCount || 0) + 1,
        })
        .where(eq(panels.id, panelId));
    });

    return {
      success: true,
      panelId,
      message: "Panel regenerated successfully",
    };
  }
);
