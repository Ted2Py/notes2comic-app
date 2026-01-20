import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { generateComic } from "@/lib/comic-generator";
import { db } from "@/lib/db";
import { comics, panels } from "@/lib/schema";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { comicId, inputUrl, inputType, options } = body;

    if (!comicId || !inputUrl || !inputType || !options) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify comic belongs to user
    const comic = await db.query.comics.findFirst({
      where: eq(comics.id, comicId),
    });

    if (!comic || comic.userId !== session.user.id) {
      return NextResponse.json({ error: "Comic not found" }, { status: 404 });
    }

    // Start generation in background
    const generateOptions = {
      ...options,
      outputFormat: comic.outputFormat,
      pageSize: comic.pageSize,
      requestedPanelCount: comic.requestedPanelCount,
      borderStyle: comic.borderStyle,
      showCaptions: comic.showCaptions,
    };
    generateComic(comicId, inputUrl, inputType, generateOptions).catch((error) => {
      console.error("Background generation error:", error);
    });

    return NextResponse.json({
      success: true,
      comicId,
      message: "Comic generation started",
    });
  } catch (error) {
    console.error("Generate API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error details:", errorMessage);
    return NextResponse.json(
      { error: "Failed to start generation", details: errorMessage },
      { status: 500 }
    );
  }
}

// GET endpoint for polling status
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const comicId = searchParams.get("comicId");

    if (!comicId) {
      return NextResponse.json(
        { error: "Comic ID required" },
        { status: 400 }
      );
    }

    const comic = await db.query.comics.findFirst({
      where: eq(comics.id, comicId),
    });

    if (!comic || comic.userId !== session.user.id) {
      return NextResponse.json({ error: "Comic not found" }, { status: 404 });
    }

    // Fetch panels separately
    const comicPanels = await db.query.panels.findMany({
      where: eq(panels.comicId, comicId),
      orderBy: [asc(panels.panelNumber)],
    });

    return NextResponse.json({
      status: comic.status,
      panels: comicPanels,
      metadata: comic.metadata,
    });
  } catch (error) {
    console.error("Status API error:", error);
    return NextResponse.json(
      { error: "Failed to get status" },
      { status: 500 }
    );
  }
}
