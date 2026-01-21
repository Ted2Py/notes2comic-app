import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { commentLikes, comments } from "@/lib/schema";

// POST - Toggle like on a comment
export async function POST(
  req: NextRequest,
  _params: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId } = await req.json();

    if (!commentId) {
      return NextResponse.json(
        { error: "Comment ID required" },
        { status: 400 }
      );
    }

    // Verify comment exists
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId),
      with: {
        likes: {
          columns: {
            userId: true,
          },
        },
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Check if user already liked this comment
    const existingLike = await db.query.commentLikes.findFirst({
      where: and(
        eq(commentLikes.commentId, commentId),
        eq(commentLikes.userId, session.user.id)
      ),
    });

    if (existingLike) {
      // Unlike: remove the like
      await db
        .delete(commentLikes)
        .where(
          and(
            eq(commentLikes.commentId, commentId),
            eq(commentLikes.userId, session.user.id)
          )
        );

      // Return updated like count
      const updatedLikes = await db.query.commentLikes.findMany({
        where: eq(commentLikes.commentId, commentId),
      });

      return NextResponse.json({ liked: false, likesCount: updatedLikes.length });
    } else {
      // Like: add a new like
      await db.insert(commentLikes).values({
        id: randomUUID(),
        commentId,
        userId: session.user.id,
      });

      // Return updated like count
      const updatedLikes = await db.query.commentLikes.findMany({
        where: eq(commentLikes.commentId, commentId),
      });

      return NextResponse.json({ liked: true, likesCount: updatedLikes.length });
    }
  } catch (error) {
    console.error("Toggle like error:", error);
    return NextResponse.json(
      { error: "Failed to toggle like" },
      { status: 500 }
    );
  }
}
