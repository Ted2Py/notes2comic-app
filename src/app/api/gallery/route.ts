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
    const inputType = searchParams.get("inputType");
    const pageSize = searchParams.get("pageSize");
    const sortBy = searchParams.get("sort") || "recent"; // recent, popular

    let orderBy = desc(comics.createdAt);
    if (sortBy === "popular") {
      orderBy = sql`CAST(COALESCE(comics.metadata->>'likes', '0') AS INTEGER) DESC`;
    }

    // Build where clause with filters
    const conditions = [eq(comics.isPublic, true)];
    if (subject) {
      conditions.push(eq(comics.subject, subject));
    }
    if (inputType) {
      conditions.push(eq(comics.inputType, inputType as any));
    }
    if (pageSize) {
      conditions.push(eq(comics.pageSize, pageSize as any));
    }
    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

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
        user: {
          columns: {
            id: true,
            name: true,
            image: true,
          },
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
