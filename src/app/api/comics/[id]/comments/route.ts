import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { moderateComment } from "@/lib/comment-moderation";
import { db } from "@/lib/db";
import { comments, comics } from "@/lib/schema";

// GET - List comments for a comic
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const comicComments = await db.query.comments.findMany({
      where: eq(comments.comicId, id),
      orderBy: (comments, { desc }) => [desc(comments.createdAt)],
      with: {
        user: true,
      },
    });

    return NextResponse.json({ comments: comicComments });
  } catch (error) {
    console.error("List comments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// POST - Add a comment
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

    const { content } = await req.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content required" },
        { status: 400 }
      );
    }

    // Verify comic exists
    const comic = await db.query.comics.findFirst({
      where: eq(comics.id, id),
    });

    if (!comic) {
      return NextResponse.json({ error: "Comic not found" }, { status: 404 });
    }

    // Moderate the comment content
    const trimmedContent = content.trim();
    const moderationResult = moderateComment(trimmedContent);

    const insertedComments = await db
      .insert(comments)
      .values({
        id: randomUUID(),
        comicId: id,
        userId: session.user.id,
        content: trimmedContent,
        isCensored: moderationResult.isCensored,
        censoredContent: moderationResult.isCensored ? moderationResult.censoredContent : null,
      })
      .returning();

    const insertedComment = insertedComments[0];
    if (!insertedComment) {
      throw new Error("Failed to create comment");
    }

    // Fetch the comment with user relation populated
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, insertedComment.id),
      with: {
        user: true,
      },
    });

    return NextResponse.json({ comment });
  } catch (error) {
    console.error("Create comment error:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a comment (only by comment owner)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Comic ID from params (unused but required by route structure)
    await params;
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("commentId");

    if (!commentId) {
      return NextResponse.json(
        { error: "Comment ID required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId),
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden - not your comment" },
        { status: 403 }
      );
    }

    await db
      .delete(comments)
      .where(and(eq(comments.id, commentId), eq(comments.userId, session.user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete comment error:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
