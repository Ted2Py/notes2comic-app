import { NextRequest, NextResponse } from "next/server";
import { eq, desc, count, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comics, panels } from "@/lib/schema";

// GET - List user's comics
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const offset = (page - 1) * limit;

    const userComics = await db.query.comics.findMany({
      where: eq(comics.userId, session.user.id),
      orderBy: [desc(comics.createdAt)],
      limit,
      offset,
      with: {
        panels: {
          limit: 1, // Just get first panel for thumbnail
          orderBy: [asc(panels.panelNumber)],
        },
      },
    });

    // Get total count for pagination
    const totalCount = await db
      .select({ count: count() })
      .from(comics)
      .where(eq(comics.userId, session.user.id));

    return NextResponse.json({
      comics: userComics,
      pagination: {
        page,
        limit,
        total: totalCount[0]?.count || 0,
        totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("List comics error:", error);
    return NextResponse.json(
      { error: "Failed to list comics" },
      { status: 500 }
    );
  }
}

// Note: Comic creation is handled by POST /api/comics/create
// This endpoint is for listing and deleting only

// DELETE - Delete a comic
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const comicId = searchParams.get("id");

    if (!comicId) {
      return NextResponse.json(
        { error: "Comic ID required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const comic = await db.query.comics.findFirst({
      where: eq(comics.id, comicId),
    });

    if (!comic || comic.userId !== session.user.id) {
      return NextResponse.json({ error: "Comic not found" }, { status: 404 });
    }

    await db.delete(comics).where(eq(comics.id, comicId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete comic error:", error);
    return NextResponse.json(
      { error: "Failed to delete comic" },
      { status: 500 }
    );
  }
}
