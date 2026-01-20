import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comics } from "@/lib/schema";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, inputType, inputUrl, artStyle, tone, subject, outputFormat, pageSize, requestedPanelCount, isPublic, tags, borderStyle, showCaptions } = body;

    // Validate required fields
    if (!title || !inputType || !subject) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate title
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 2 || trimmedTitle.length > 100) {
      return NextResponse.json(
        { error: "Title must be between 2 and 100 characters" },
        { status: 400 }
      );
    }

    // Validate subject
    const trimmedSubject = subject.trim();
    if (trimmedSubject.length < 2 || trimmedSubject.length > 100) {
      return NextResponse.json(
        { error: "Subject must be between 2 and 100 characters" },
        { status: 400 }
      );
    }

    // Validate inputType
    const validInputTypes = ["text", "pdf", "image", "video"];
    if (!validInputTypes.includes(inputType)) {
      return NextResponse.json(
        { error: `Invalid inputType. Must be one of: ${validInputTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate artStyle if provided
    const validArtStyles = ["retro", "manga", "minimal", "pixel", "noir", "watercolor", "anime", "popart"];
    if (artStyle && !validArtStyles.includes(artStyle)) {
      return NextResponse.json(
        { error: `Invalid artStyle. Must be one of: ${validArtStyles.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate tone if provided
    const validTones = ["funny", "serious", "friendly", "adventure", "romantic", "horror"];
    if (tone && !validTones.includes(tone)) {
      return NextResponse.json(
        { error: `Invalid tone. Must be one of: ${validTones.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate output format if provided
    const validOutputFormats = ["strip", "separate", "fullpage"];
    if (outputFormat && !validOutputFormats.includes(outputFormat)) {
      return NextResponse.json(
        { error: `Invalid outputFormat. Must be one of: ${validOutputFormats.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate page size if provided
    const validPageSizes = ["letter", "a4", "tabloid", "a3"];
    if (pageSize && !validPageSizes.includes(pageSize)) {
      return NextResponse.json(
        { error: `Invalid pageSize. Must be one of: ${validPageSizes.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate border style if provided
    const validBorderStyles = ["straight", "jagged", "zigzag", "wavy"];
    if (borderStyle && !validBorderStyles.includes(borderStyle)) {
      return NextResponse.json(
        { error: `Invalid borderStyle. Must be one of: ${validBorderStyles.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate panel count if provided
    if (requestedPanelCount && (requestedPanelCount < 1 || requestedPanelCount > 12)) {
      return NextResponse.json(
        { error: "Panel count must be between 1 and 12" },
        { status: 400 }
      );
    }

    const [comic] = await db
      .insert(comics)
      .values({
        id: randomUUID(),
        userId: session.user.id,
        title: trimmedTitle,
        description: description?.trim() || null,
        inputType,
        inputUrl,
        artStyle: artStyle || "retro",
        tone: tone || "friendly",
        subject: trimmedSubject,
        outputFormat: outputFormat || "separate",
        pageSize: pageSize || "letter",
        requestedPanelCount: requestedPanelCount || null,
        status: "draft",
        isPublic: isPublic ?? false,
        borderStyle: borderStyle || "straight",
        showCaptions: showCaptions ?? false,
        tags: tags || [trimmedSubject],
      })
      .returning();

    return NextResponse.json({ comic });
  } catch (error) {
    console.error("Create comic error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error details:", errorMessage);
    return NextResponse.json(
      { error: "Failed to create comic", details: errorMessage },
      { status: 500 }
    );
  }
}
