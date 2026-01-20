import { NextRequest, NextResponse } from "next/server";
import { eq, desc, count, sql, and, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { comics, panels } from "@/lib/schema";

// GET - List public comics
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const offset = (page - 1) * limit;
    const subject = searchParams.get("subject");
    const sortBy = searchParams.get("sort") || "recent"; // recent, popular

    let orderBy = desc(comics.createdAt);
    if (sortBy === "popular") {
      orderBy = sql`CAST(COALESCE(comics.metadata->>'likes', '0') AS INTEGER) DESC`;
    }

    let whereClause;
    if (subject) {
      whereClause = and(eq(comics.isPublic, true), eq(comics.subject, subject));
    } else {
      whereClause = eq(comics.isPublic, true);
    }

    const publicComics = await db.query.comics.findMany({
      where: whereClause,
      orderBy: [orderBy],
      limit,
      offset,
      with: {
        panels: {
          limit: 1,
          orderBy: [asc(panels.panelNumber)],
        },
      },
    });

    // Get total count
    const totalCount = await db
      .select({ count: count() })
      .from(comics)
      .where(whereClause);

    return NextResponse.json({
      comics: publicComics,
      pagination: {
        page,
        limit,
        total: totalCount[0]?.count || 0,
        totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Gallery API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch gallery" },
      { status: 500 }
    );
  }
}
