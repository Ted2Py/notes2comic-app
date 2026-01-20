import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comics, panels } from "@/lib/schema";

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
  const { panels: panelsData } = body;

  // Verify ownership
  const comic = await db.query.comics.findFirst({
    where: eq(comics.id, id),
  });

  if (!comic || comic.userId !== session.user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Update each panel
  for (const panel of panelsData) {
    await db.update(panels)
      .set({
        textBox: panel.textBox,
        speechBubbles: panel.speechBubbles,
        bubblePositions: panel.bubblePositions,
      })
      .where(
        and(
          eq(panels.id, panel.id),
          eq(panels.comicId, id)
        )
      );
  }

  return Response.json({ success: true });
}
