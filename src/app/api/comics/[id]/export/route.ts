import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { exportComicToPDF } from "@/lib/pdf-exporter";
import { comics } from "@/lib/schema";
import type { ComicWithPanels } from "@/lib/pdf-exporter";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const comic = await db.query.comics.findFirst({
      where: eq(comics.id, id),
      with: {
        panels: {
          orderBy: (panel: any, { asc }: any) => [asc(panel.panelNumber)],
        },
      },
    });

    if (!comic) {
      return NextResponse.json({ error: "Comic not found" }, { status: 404 });
    }

    // Check access
    if (comic.userId !== session.user.id && !comic.isPublic) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const options = {
      watermark: comic.isPublic,
    };

    // Type assertion to match expected ComicWithPanels structure
    const comicForExport: ComicWithPanels = {
      id: comic.id,
      title: comic.title,
      description: comic.description,
      subject: comic.subject,
      artStyle: comic.artStyle,
      tone: comic.tone,
      isPublic: comic.isPublic,
      outputFormat: comic.outputFormat,
      pageSize: comic.pageSize,
      showCaptions: comic.showCaptions,
      panels: (comic.panels as any[]).map((p: any) => ({
        id: p.id,
        panelNumber: p.panelNumber,
        imageUrl: p.imageUrl,
        caption: p.caption,
      })),
    };

    const pdfBlob = await exportComicToPDF(comicForExport, options);

    return new NextResponse(pdfBlob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${sanitizeFilename(comic.title)}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export comic" },
      { status: 500 }
    );
  }
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase()
    .slice(0, 50);
}
