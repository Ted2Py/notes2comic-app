import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comics, likes } from "@/lib/schema";

// POST - Like a comic
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

    // Check if already liked
    const existingLike = await db.query.likes.findFirst({
      where: and(
        eq(likes.comicId, id),
        eq(likes.userId, session.user.id)
      ),
    });

    if (existingLike) {
      return NextResponse.json({ error: "Already liked" }, { status: 400 });
    }

    await db.insert(likes).values({
      id: randomUUID(),
      comicId: id,
      userId: session.user.id,
    });

    // Update comic metadata
    const comic = await db.query.comics.findFirst({
      where: eq(comics.id, id),
    });

    const currentLikes = (comic?.metadata?.likes as number) || 0;
    await db
      .update(comics)
      .set({
        metadata: {
          ...(comic?.metadata || {}),
          likes: currentLikes + 1,
        },
      })
      .where(eq(comics.id, id));

    return NextResponse.json({ success: true, likes: currentLikes + 1 });
  } catch (error) {
    console.error("Like error:", error);
    return NextResponse.json(
      { error: "Failed to like comic" },
      { status: 500 }
    );
  }
}

// DELETE - Unlike a comic
export async function DELETE(
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

    await db
      .delete(likes)
      .where(
        and(
          eq(likes.comicId, id),
          eq(likes.userId, session.user.id)
        )
      );

    // Update comic metadata
    const comic = await db.query.comics.findFirst({
      where: eq(comics.id, id),
    });

    const currentLikes = (comic?.metadata?.likes as number) || 1;
    await db
      .update(comics)
      .set({
        metadata: {
          ...(comic?.metadata || {}),
          likes: Math.max(0, currentLikes - 1),
        },
      })
      .where(eq(comics.id, id));

    return NextResponse.json({ success: true, likes: Math.max(0, currentLikes - 1) });
  } catch (error) {
    console.error("Unlike error:", error);
    return NextResponse.json(
      { error: "Failed to unlike comic" },
      { status: 500 }
    );
  }
}
