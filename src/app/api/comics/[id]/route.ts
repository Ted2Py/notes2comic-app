import { headers } from "next/headers";
import { eq, and, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comics, panels } from "@/lib/schema";

// GET - Fetch comic data (for viewing)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });

  const { id } = await params;

  // Fetch comic with panels and user info
  const comic = await db.query.comics.findFirst({
    where: eq(comics.id, id),
    with: {
      panels: {
        orderBy: [asc(panels.panelNumber)],
      },
      user: {
        columns: {
          id: true,
          name: true,
          image: true,
          bio: true,
        },
      },
    },
  });

  if (!comic) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Check if user can view this comic
  if (!comic.isPublic && (!session || comic.userId !== session.user.id)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json(comic);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { panels: panelsData, isPublic } = body;

  // Verify ownership
  const comic = await db.query.comics.findFirst({
    where: eq(comics.id, id),
  });

  if (!comic || comic.userId !== session.user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Handle panels if provided
  if (Array.isArray(panelsData)) {
    // Get all existing panels for this comic
    const existingPanels = await db.query.panels.findMany({
      where: eq(panels.comicId, id),
    });

    const existingPanelIds = new Set(existingPanels.map(p => p.id));
    const newPanelIds = new Set(panelsData.map(p => p.id));

    // Delete panels that were removed
    const panelsToDelete = existingPanels.filter(p => !newPanelIds.has(p.id));
    for (const panelToDelete of panelsToDelete) {
      await db.delete(panels)
        .where(
          and(
            eq(panels.id, panelToDelete.id),
            eq(panels.comicId, id)
          )
        );
    }

    // Update existing panels
    for (const panel of panelsData) {
      // Only update panels that already exist (skip newly created panels)
      if (existingPanelIds.has(panel.id)) {
        await db.update(panels)
          .set({
            panelNumber: panel.panelNumber,
            textBox: panel.textBox,
            speechBubbles: panel.speechBubbles,
            bubblePositions: panel.bubblePositions,
            drawingData: panel.drawingData,
          })
          .where(
            and(
              eq(panels.id, panel.id),
              eq(panels.comicId, id)
            )
          );
      }
    }
  }

  // Update comic visibility if provided
  if (typeof isPublic === "boolean") {
    await db.update(comics)
      .set({ isPublic })
      .where(eq(comics.id, id));
  }

  return Response.json({ success: true });
}
