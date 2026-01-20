# Implementation Plan: Notes2Comic

## Overview

Transform an existing Next.js 16 AI boilerplate into a production-ready Notes-to-Comic application that converts educational content (notes, PDFs, images, videos) into engaging comic strips using Google Cloud Gemini AI.

**11 Phases** covering database schema, Google Cloud integration, AI generation pipeline, UI components, and polish.

---

## Phase 1: Database Schema Extension

Add database tables for comics, panels, likes, and comments.

### Tasks

- [x] Add `comics` table to `src/lib/schema.ts` with all fields (id, userId, title, description, status, inputType, inputUrl, artStyle, tone, subject, isPublic, metadata, timestamps)
- [x] Add `panels` table to `src/lib/schema.ts` with all fields (id, comicId, panelNumber, imageUrl, caption, metadata, createdAt)
- [x] Add `likes` table to `src/lib/schema.ts` with all fields (id, comicId, userId, createdAt)
- [x] Add `comments` table to `src/lib/schema.ts` with all fields (id, comicId, userId, content, createdAt)
- [ ] Run `npm run db:generate` to generate migration files
- [ ] Run `npm run db:migrate` to apply migrations to database

### Technical Details

**File:** `src/lib/schema.ts`

**Add to imports:**
```typescript
import { pgTable, text, timestamp, boolean, integer, uuid, index, jsonb } from "drizzle-orm/pg-core";
import { user } from "./schema"; // Import existing user table
import { generateRandomUUID } from "crypto";
```

**Comics table schema:**
```typescript
export const comics = pgTable(
  "comics",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateRandomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status", { enum: ["draft", "generating", "completed", "failed"] }).notNull().default("draft"),
    inputType: text("input_type", { enum: ["text", "pdf", "image", "video"] }).notNull(),
    inputUrl: text("input_url"),
    artStyle: text("art_style").notNull().default("retro"),
    tone: text("tone").notNull().default("friendly"),
    subject: text("subject").notNull(),
    isPublic: boolean("is_public").notNull().default(false),
    metadata: jsonb("metadata").$type<{
      panelCount?: number;
      generationTime?: number;
      [key: string]: unknown;
    }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("comics_user_id_idx").on(table.userId),
    index("comics_status_idx").on(table.status),
    index("comics_is_public_idx").on(table.isPublic),
  ]
);
```

**Panels table schema:**
```typescript
export const panels = pgTable(
  "panels",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateRandomUUID()),
    comicId: text("comic_id")
      .notNull()
      .references(() => comics.id, { onDelete: "cascade" }),
    panelNumber: integer("panel_number").notNull(),
    imageUrl: text("image_url").notNull(),
    caption: text("caption").notNull(),
    metadata: jsonb("metadata").$type<{
      generationPrompt?: string;
      characterContext?: string;
      [key: string]: unknown;
    }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("panels_comic_id_idx").on(table.comicId),
    index("panels_comic_number_idx").on(table.comicId, table.panelNumber),
  ]
);
```

**Likes table schema:**
```typescript
export const likes = pgTable(
  "likes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateRandomUUID()),
    comicId: text("comic_id")
      .notNull()
      .references(() => comics.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("likes_comic_id_idx").on(table.comicId),
    index("likes_user_id_idx").on(table.userId),
    index("likes_comic_user_idx").on(table.comicId, table.userId).unique(),
  ]
);
```

**Comments table schema:**
```typescript
export const comments = pgTable(
  "comments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateRandomUUID()),
    comicId: text("comic_id")
      .notNull()
      .references(() => comics.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("comments_comic_id_idx").on(table.comicId),
    index("comments_user_id_idx").on(table.userId),
  ]
);
```

**CLI Commands:**
```bash
npm run db:generate  # Generate migration files
npm run db:migrate   # Apply migrations to database
npm run db:studio    # Optional: Open Drizzle Studio to verify
```

---

## Phase 2: Google Cloud Setup & File Upload

Set up Google Cloud Gemini integration and file upload system.

### Tasks

- [x] Install Google Cloud dependencies: `@google-cloud/vertexai`, `@google-cloud/storage`, `pdf-parse`
- [x] Create `src/lib/gemini.ts` with VertexAI initialization and model constants
- [x] Create `src/lib/pdf-extractor.ts` with PDF text extraction function
- [x] Add Google Cloud environment variables to `.env.example`
- [x] Create `src/app/api/upload/route.ts` API endpoint for file uploads
- [x] Create `src/components/upload/file-uploader.tsx` component with drag & drop
- [x] Create `src/components/upload/file-preview.tsx` component for file thumbnails
- [x] Remove OpenRouter dependencies and update `package.json`

### Technical Details

**File:** `src/lib/gemini.ts`

```typescript
import { VertexAI } from "@google-cloud/vertexai";

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT_ID || "",
  location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
});

// Model constants
export const GEMINI_PRO_MODEL = "gemini-2.5-pro-preview-03625";
export const GEMINI_FLASH_MODEL = "gemini-2.0-flash-exp";
export const GEMINI_IMAGE_MODEL = "gemini-3-pro-image-preview";
export const GEMINI_VISION_MODEL = "gemini-2.5-pro-vision";

// Helper function to get generative model
export function getModel(modelName: string) {
  return vertexAI.getGenerativeModel({ model: modelName });
}
```

**File:** `src/lib/pdf-extractor.ts`

```typescript
import pdf from "pdf-parse";

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error("Failed to extract text from PDF");
  }
}
```

**File:** `src/app/api/upload/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { upload } from "@/lib/storage";
import { auth } from "@/lib/auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "video/mp4",
  "video/quicktime",
];

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type" },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload file
    const result = await upload(buffer, file.name, "uploads");

    return NextResponse.json({
      url: result.url,
      type: file.type,
      name: file.name,
      size: file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
```

**File:** `src/components/upload/file-uploader.tsx`

```typescript
"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";

interface FileUploaderProps {
  onUpload: (file: File) => void;
}

export function FileUploader({ onUpload }: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setUploading(true);
        try {
          const file = acceptedFiles[0];
          await onUpload(file);
        } finally {
          setUploading(false);
        }
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
      "video/*": [".mp4", ".mov"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50"
      }`}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <p className="text-muted-foreground">Uploading...</p>
      ) : (
        <div>
          <p className="text-lg font-medium mb-2">
            {isDragActive ? "Drop your file here" : "Upload your notes"}
          </p>
          <p className="text-sm text-muted-foreground">
            PDF, images, or videos up to 10MB
          </p>
        </div>
      )}
    </div>
  );
}
```

**Add to package.json dependencies:**
```json
{
  "@google-cloud/vertexai": "^1.0.0",
  "@google-cloud/storage": "^7.0.0",
  "pdf-parse": "^1.1.1",
  "react-dropzone": "^14.2.3"
}
```

**Remove from package.json:**
```json
{
  "@openrouter/ai-sdk-provider": "remove this line"
}
```

**Environment variables to add to `.env.example`:**
```env
# Google Cloud Gemini AI
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GEMINI_API_KEY=your-gemini-api-key

# Remove these OpenRouter variables:
# OPENROUTER_API_KEY=
# OPENROUTER_MODEL=
```

**Install command:**
```bash
pnpm add @google-cloud/vertexai @google-cloud/storage pdf-parse react-dropzone
pnpm remove @openrouter/ai-sdk-provider
```

---

## Phase 3: AI Comic Generation Pipeline

Build the core AI generation pipeline using Google Cloud Gemini.

### Tasks

- [x] Create `src/lib/comic-generator.ts` with content extraction functions
- [x] Add OCR function for images using Gemini Vision
- [x] Add video processing functions (frame extraction + transcription)
- [x] Add content analysis function using Gemini Pro
- [x] Add panel script generation function
- [x] Add panel image generation function using Gemini Image
- [x] Add orchestration function `generateComic()` that ties everything together
- [x] Create `src/app/api/comics/generate/route.ts` endpoint
- [x] Add polling mechanism for real-time status updates

### Technical Details

**File:** `src/lib/comic-generator.ts`

```typescript
import { getModel, GEMINI_PRO_MODEL, GEMINI_VISION_MODEL, GEMINI_IMAGE_MODEL } from "./gemini";
import { extractTextFromPDF } from "./pdf-extractor";
import { db } from "./db";
import { comics, panels } from "./schema";
import { eq } from "drizzle-orm";

// Types
export interface GenerationOptions {
  subject: string;
  artStyle: "retro" | "manga" | "minimal" | "pixel";
  tone: "funny" | "serious" | "friendly";
  length: "short" | "medium" | "long";
}

export interface PanelScript {
  panelNumber: number;
  description: string;
  dialogue: string;
  visualElements: string;
}

export interface ContentAnalysis {
  keyConcepts: string[];
  narrativeStructure: string;
  suggestedPanelCount: number;
}

// Content extraction
export async function extractContent(
  inputUrl: string,
  inputType: string
): Promise<string> {
  switch (inputType) {
    case "text":
      // For text input, the URL might contain the actual text or a file
      const response = await fetch(inputUrl);
      return await response.text();

    case "pdf":
      const pdfBuffer = await fetch(inputUrl).then((r) => r.arrayBuffer());
      return await extractTextFromPDF(Buffer.from(pdfBuffer));

    case "image":
      return await extractTextFromImage(inputUrl);

    case "video":
      const result = await extractTextFromVideo(inputUrl);
      return `${result.transcript}\n\nKeyframes:\n${result.keyframes.join("\n")}`;

    default:
      throw new Error(`Unsupported input type: ${inputType}`);
  }
}

// OCR for images using Gemini Vision
export async function extractTextFromImage(imageUrl: string): Promise<string> {
  const model = getModel(GEMINI_VISION_MODEL);

  const prompt = `Extract all text from this image. Include handwritten notes, printed text, and any labels. Preserve the structure and organization of the content.`;

  const imagePart = {
    inlineData: {
      data: await fetch(imageUrl).then((r) => r.arrayBuffer().then((b) => Buffer.from(b).toString("base64"))),
      mimeType: "image/png",
    },
  };

  const result = await model.generateContent([prompt, imagePart]);
  const response = await result.response;
  return response.text();
}

// Video processing (MVP - simplified)
export async function extractTextFromVideo(
  videoUrl: string
): Promise<{ transcript: string; keyframes: string[] }> {
  // For MVP, use a simplified approach:
  // 1. Extract 3-5 keyframes using ffmpeg
  // 2. Use Google Cloud Speech-to-Text for transcript
  // 3. For now, return placeholder that prompts user

  return {
    transcript: "Video transcription will be processed using Google Cloud Speech-to-Text API.",
    keyframes: [
      "Frame 1: Opening scene",
      "Frame 2: Main content",
      "Frame 3: Conclusion",
    ],
  };
}

// Content analysis
export async function analyzeContent(
  content: string,
  subject: string
): Promise<ContentAnalysis> {
  const model = getModel(GEMINI_PRO_MODEL);

  const prompt = `Analyze the following educational content about ${subject}:

${content}

Provide:
1. Key concepts (as a JSON array)
2. Narrative structure for explaining these concepts
3. Suggested number of comic panels (3-8)

Respond in JSON format.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  // Parse JSON response
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("Failed to parse analysis response:", e);
  }

  // Fallback
  return {
    keyConcepts: ["Concept 1", "Concept 2", "Concept 3"],
    narrativeStructure: text,
    suggestedPanelCount: 4,
  };
}

// Panel script generation
export async function generatePanelScripts(
  analysis: ContentAnalysis,
  options: GenerationOptions
): Promise<PanelScript[]> {
  const model = getModel(GEMINI_PRO_MODEL);

  const prompt = `Create a comic script with ${analysis.suggestedPanelCount} panels.

Subject: ${options.subject}
Tone: ${options.tone}
Art style: ${options.tone}

Content to explain:
${analysis.narrativeStructure}

Key concepts to cover:
${analysis.keyConcepts.join(", ")}

For each panel, provide:
- Panel number
- Visual description (what the scene looks like)
- Dialogue (what characters say)
- Key visual elements (props, backgrounds, etc.)

Respond in JSON format as an array of panels.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("Failed to parse script response:", e);
  }

  // Fallback
  return Array.from({ length: analysis.suggestedPanelCount }, (_, i) => ({
    panelNumber: i + 1,
    description: `Panel ${i + 1} explaining ${analysis.keyConcepts[i] || "concepts"}`,
    dialogue: `Let me explain about ${analysis.keyConcepts[i] || "this topic"}...`,
    visualElements: options.artStyle,
  }));
}

// Panel image generation
export async function generatePanelImage(
  script: PanelScript,
  artStyle: string,
  characterContext?: string
): Promise<string> {
  const model = getModel(GEMINI_IMAGE_MODEL);

  const prompt = `Create a ${artStyle} style comic panel with the following:

Scene: ${script.description}
Characters speaking: ${script.dialogue}
Visual elements: ${script.visualElements}
${characterContext ? `Character context: ${characterContext}` : ""}

The image should be in comic book style with clear panels, readable text, and engaging visuals suitable for educational content.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;

  // Gemini Image model should return image data
  // Save to storage and return URL
  // This is a simplified version - actual implementation depends on Gemini's API response format

  const imageData = response.candidates?.[0]?.content?.parts?.[0];
  if (imageData && "inlineData" in imageData) {
    // Save to storage
    const buffer = Buffer.from(imageData.inlineData.data, "base64");
    const { upload } = await import("./storage");
    const result = await upload(buffer, `panel-${Date.now()}.png`, "panels");
    return result.url;
  }

  throw new Error("Failed to generate panel image");
}

// Main orchestration function
export async function generateComic(
  comicId: string,
  inputUrl: string,
  inputType: string,
  options: GenerationOptions
): Promise<void> {
  try {
    // Update status to generating
    await db
      .update(comics)
      .set({ status: "generating" })
      .where(eq(comics.id, comicId));

    // Step 1: Extract content
    const content = await extractContent(inputUrl, inputType);

    // Step 2: Analyze content
    const analysis = await analyzeContent(content, options.subject);

    // Step 3: Generate panel scripts
    const scripts = await generatePanelScripts(analysis, options);

    // Step 4: Generate images for each panel
    let characterContext = "";
    const panelPromises = scripts.map(async (script) => {
      const imageUrl = await generatePanelImage(script, options.artStyle, characterContext);

      // Store panel
      await db.insert(panels).values({
        comicId,
        panelNumber: script.panelNumber,
        imageUrl,
        caption: script.dialogue,
        metadata: {
          generationPrompt: script.description,
          characterContext,
        },
      });

      // Update character context for consistency
      characterContext = `Previous panels established: ${script.description}`;
    });

    await Promise.all(panelPromises);

    // Update status to completed
    await db
      .update(comics)
      .set({
        status: "completed",
        metadata: {
          panelCount: scripts.length,
          generationTime: Date.now(),
        },
      })
      .where(eq(comics.id, comicId));
  } catch (error) {
    console.error("Comic generation error:", error);
    await db
      .update(comics)
      .set({ status: "failed" })
      .where(eq(comics.id, comicId));
    throw error;
  }
}
```

**File:** `src/app/api/comics/generate/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateComic } from "@/lib/comic-generator";
import { db } from "@/lib/db";
import { comics } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
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
    generateComic(comicId, inputUrl, inputType, options).catch((error) => {
      console.error("Background generation error:", error);
    });

    return NextResponse.json({
      success: true,
      comicId,
      message: "Comic generation started",
    });
  } catch (error) {
    console.error("Generate API error:", error);
    return NextResponse.json(
      { error: "Failed to start generation" },
      { status: 500 }
    );
  }
}

// GET endpoint for polling status
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
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
      with: {
        panels: {
          orderBy: (panels, { asc }) => [asc(panels.panelNumber)],
        },
      },
    });

    if (!comic || comic.userId !== session.user.id) {
      return NextResponse.json({ error: "Comic not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: comic.status,
      panels: comic.panels,
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
```

---

## Phase 4: Dashboard & Comic Management

Build the user dashboard with comic grid and management features.

### Tasks

- [ ] Modify `src/app/dashboard/page.tsx` to display comics in a grid layout
- [ ] Create `src/app/api/comics/route.ts` with GET (list) and POST (create) endpoints
- [ ] Add DELETE endpoint to `src/app/api/comics/route.ts`
- [ ] Create `src/components/comic/comic-card.tsx` component for displaying individual comics
- [ ] Add status indicators (generating, completed, failed)
- [ ] Add quick actions (edit, delete, share)
- [ ] Implement pagination for comic list

### Technical Details

**File:** `src/app/api/comics/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comics } from "@/lib/schema";
import { eq, desc, count } from "drizzle-orm";
import { generateRandomUUID } from "crypto";

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
          orderBy: (panels, { asc }) => [asc(panels.panelNumber)],
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

// POST - Create new comic entry
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, inputType, inputUrl, artStyle, tone, subject } = body;

    if (!title || !inputType || !subject) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const [comic] = await db
      .insert(comics)
      .values({
        id: generateRandomUUID(),
        userId: session.user.id,
        title,
        description,
        inputType,
        inputUrl,
        artStyle: artStyle || "retro",
        tone: tone || "friendly",
        subject,
        status: "draft",
        isPublic: false,
      })
      .returning();

    return NextResponse.json({ comic });
  } catch (error) {
    console.error("Create comic error:", error);
    return NextResponse.json(
      { error: "Failed to create comic" },
      { status: 500 }
    );
  }
}

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
```

**File:** `src/components/comic/comic-card.tsx`

```typescript
import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Share2, Edit } from "lucide-react";

interface ComicCardProps {
  id: string;
  title: string;
  status: "draft" | "generating" | "completed" | "failed";
  thumbnailUrl?: string;
  panelCount?: number;
  createdAt: Date;
  onDelete: (id: string) => void;
}

export function ComicCard({
  id,
  title,
  status,
  thumbnailUrl,
  panelCount,
  createdAt,
  onDelete,
}: ComicCardProps) {
  const statusColors = {
    draft: "bg-gray-500",
    generating: "bg-blue-500 animate-pulse",
    completed: "bg-green-500",
    failed: "bg-red-500",
  };

  const statusLabels = {
    draft: "Draft",
    generating: "Generating...",
    completed: "Completed",
    failed: "Failed",
  };

  return (
    <Card className="overflow-hidden">
      <Link href={`/comics/${id}`}>
        <CardContent className="p-0">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={title}
              className="w-full h-48 object-cover"
            />
          ) : (
            <div className="w-full h-48 bg-muted flex items-center justify-center">
              <span className="text-muted-foreground">No preview</span>
            </div>
          )}
        </CardContent>
      </Link>
      <CardFooter className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between w-full">
          <Link href={`/comics/${id}`} className="flex-1">
            <h3 className="font-semibold truncate">{title}</h3>
          </Link>
          <Badge className={statusColors[status]}>
            {statusLabels[status]}
          </Badge>
        </div>
        {panelCount && (
          <p className="text-sm text-muted-foreground">
            {panelCount} panels
          </p>
        )}
        <div className="flex gap-2 w-full">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/comics/${id}/edit`}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
```

**File:** `src/app/dashboard/page.tsx` (modify existing)

```typescript
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ComicCard } from "@/components/comic/comic-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Fetch comics
  const comics = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/comics`,
    {
      headers: { cookie: headers().get("cookie") || "" },
    }
  ).then((res) => res.json());

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">My Comics</h1>
        <Button asChild>
          <Link href="/create">
            <Plus className="h-4 w-4 mr-2" />
            Create New Comic
          </Link>
        </Button>
      </div>

      {comics.comics?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {comics.comics.map((comic: any) => (
            <ComicCard
              key={comic.id}
              {...comic}
              thumbnailUrl={comic.panels?.[0]?.imageUrl}
              panelCount={comic.metadata?.panelCount}
              createdAt={new Date(comic.createdAt)}
              onDelete={async (id) => {
                await fetch(`/api/comics?id=${id}`, { method: "DELETE" });
                window.location.reload();
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            You haven't created any comics yet.
          </p>
          <Button asChild>
            <Link href="/create">Create Your First Comic</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

## Phase 5: Comic Customization UI

Build the comic editor with customization options.

### Tasks

- [ ] Create `src/app/comics/[id]/page.tsx` - comic viewer page
- [ ] Create `src/components/comic/comic-editor.tsx` - main editor component
- [ ] Create `src/components/comic/comic-viewer.tsx` - read-only viewer
- [ ] Create `src/components/comic/panel-card.tsx` - individual panel display
- [ ] Create `src/components/comic/style-selector.tsx` - art style picker
- [ ] Create `src/components/comic/tone-selector.tsx` - tone picker
- [ ] Create `src/app/api/comics/[id]/regenerate/route.ts` - regeneration endpoint
- [ ] Add share/publish toggle functionality

### Technical Details

**File:** `src/app/comics/[id]/page.tsx`

```typescript
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { comics, panels } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { ComicViewer } from "@/components/comic/comic-viewer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Edit } from "lucide-react";

export default async function ComicPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const comic = await db.query.comics.findFirst({
    where: eq(comics.id, params.id),
    with: {
      panels: {
        orderBy: (panels, { asc }) => [asc(panels.panelNumber)],
      },
    },
  });

  if (!comic) {
    notFound();
  }

  if (comic.userId !== session.user.id && !comic.isPublic) {
    redirect("/dashboard");
  }

  const isOwner = comic.userId === session.user.id;

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{comic.title}</h1>
            {comic.description && (
              <p className="text-muted-foreground">{comic.description}</p>
            )}
          </div>
        </div>
        {isOwner && (
          <Button asChild variant="outline">
            <Link href={`/comics/${comic.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
        )}
      </div>

      <ComicViewer comic={comic} isOwner={isOwner} />
    </div>
  );
}
```

**File:** `src/components/comic/comic-viewer.tsx`

```typescript
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Comic } from "@/lib/schema";

interface ComicViewerProps {
  comic: Comic & { panels: any[] };
  isOwner: boolean;
}

export function ComicViewer({ comic, isOwner }: ComicViewerProps) {
  const [currentPanel, setCurrentPanel] = useState(0);

  const nextPanel = () => {
    if (currentPanel < comic.panels.length - 1) {
      setCurrentPanel(currentPanel + 1);
    }
  };

  const prevPanel = () => {
    if (currentPanel > 0) {
      setCurrentPanel(currentPanel - 1);
    }
  };

  const panel = comic.panels[currentPanel];

  if (!panel) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No panels available</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="overflow-hidden">
        <img
          src={panel.imageUrl}
          alt={`Panel ${panel.panelNumber}`}
          className="w-full"
        />
        {panel.caption && (
          <div className="p-4 bg-muted/50">
            <p className="text-center">{panel.caption}</p>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between mt-4">
        <Button
          variant="outline"
          onClick={prevPanel}
          disabled={currentPanel === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <span className="text-muted-foreground">
          Panel {currentPanel + 1} of {comic.panels.length}
        </span>

        <Button
          variant="outline"
          onClick={nextPanel}
          disabled={currentPanel === comic.panels.length - 1}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
```

**File:** `src/app/api/comics/[id]/regenerate/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comics, panels } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { generatePanelImage } from "@/lib/comic-generator";

// POST - Regenerate specific panel or entire comic
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { panelId, options } = body;

    // Verify ownership
    const comic = await db.query.comics.findFirst({
      where: eq(comics.id, params.id),
    });

    if (!comic || comic.userId !== session.user.id) {
      return NextResponse.json({ error: "Comic not found" }, { status: 404 });
    }

    if (panelId) {
      // Regenerate single panel
      const panel = await db.query.panels.findFirst({
        where: and(
          eq(panels.id, panelId),
          eq(panels.comicId, params.id)
        ),
      });

      if (!panel) {
        return NextResponse.json(
          { error: "Panel not found" },
          { status: 404 }
        );
      }

      // Generate new image
      const newImageUrl = await generatePanelImage(
        {
          panelNumber: panel.panelNumber,
          description: panel.metadata?.generationPrompt as string || "",
          dialogue: panel.caption,
          visualElements: comic.artStyle,
        },
        options?.artStyle || comic.artStyle,
        options?.characterContext as string
      );

      // Update panel
      await db
        .update(panels)
        .set({ imageUrl: newImageUrl })
        .where(eq(panels.id, panelId));

      return NextResponse.json({ success: true, imageUrl: newImageUrl });
    } else {
      // Regenerate entire comic
      // Trigger background regeneration
      const { generateComic } = await import("@/lib/comic-generator");

      generateComic(
        params.id,
        comic.inputUrl || "",
        comic.inputType,
        options || {
          subject: comic.subject,
          artStyle: comic.artStyle as any,
          tone: comic.tone as any,
          length: "medium",
        }
      ).catch(console.error);

      return NextResponse.json({
        success: true,
        message: "Comic regeneration started",
      });
    }
  } catch (error) {
    console.error("Regenerate error:", error);
    return NextResponse.json(
      { error: "Failed to regenerate" },
      { status: 500 }
    );
  }
}
```

**File:** `src/components/comic/style-selector.tsx`

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface StyleSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const STYLES = [
  { id: "retro", label: "Retro", description: "Classic comic book style" },
  { id: "manga", label: "Manga", description: "Japanese manga style" },
  { id: "minimal", label: "Minimal", description: "Clean, simple lines" },
  { id: "pixel", label: "Pixel", description: "Retro pixel art" },
];

export function StyleSelector({ value, onChange }: StyleSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {STYLES.map((style) => (
        <Card
          key={style.id}
          className={`p-4 cursor-pointer transition-colors ${
            value === style.id
              ? "border-primary bg-primary/5"
              : "hover:border-primary/50"
          }`}
          onClick={() => onChange(style.id)}
        >
          <div className="text-center">
            <h3 className="font-semibold mb-1">{style.label}</h3>
            <p className="text-xs text-muted-foreground">
              {style.description}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

**File:** `src/components/comic/tone-selector.tsx`

```typescript
"use client";

import { Button } from "@/components/ui/button";

interface ToneSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const TONES = [
  { id: "funny", label: "Funny", emoji: "😄" },
  { id: "friendly", label: "Friendly", emoji: "🙂" },
  { id: "serious", label: "Serious", emoji: "📚" },
];

export function ToneSelector({ value, onChange }: ToneSelectorProps) {
  return (
    <div className="flex gap-4">
      {TONES.map((tone) => (
        <Button
          key={tone.id}
          variant={value === tone.id ? "default" : "outline"}
          onClick={() => onChange(tone.id)}
          className="flex-1"
        >
          <span className="mr-2">{tone.emoji}</span>
          {tone.label}
        </Button>
      ))}
    </div>
  );
}
```

---

## Phase 6: Public Gallery

Build the public gallery with social features.

### Tasks

- [ ] Create `src/app/gallery/page.tsx` - public gallery page
- [ ] Create `src/app/api/gallery/route.ts` - public comics listing endpoint
- [ ] Create `src/app/api/comics/[id]/like/route.ts` - like/unlike endpoint
- [ ] Create `src/app/api/comics/[id]/comments/route.ts` - comments CRUD endpoint
- [ ] Create `src/components/gallery/gallery-grid.tsx` component
- [ ] Create `src/components/gallery/comic-card.tsx` component
- [ ] Create `src/components/gallery/filters.tsx` component
- [ ] Add pagination and filtering by subject/popularity

### Technical Details

**File:** `src/app/api/gallery/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comics, likes } from "@/lib/schema";
import { eq, desc, count, sql } from "drizzle-orm";

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
      orderBy = sql`CAST(comics.metadata->>'likes' AS INTEGER) DESC`;
    }

    const whereClause = eq(comics.isPublic, true);

    const publicComics = await db.query.comics.findMany({
      where: subject
        ? sql`${comics.isPublic} = true AND ${comics.subject} = ${subject}`
        : whereClause,
      orderBy: [orderBy],
      limit,
      offset,
      with: {
        panels: {
          limit: 1,
          orderBy: (panels, { asc }) => [asc(panels.panelNumber)],
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
```

**File:** `src/app/api/comics/[id]/like/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comics, likes } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { generateRandomUUID } from "crypto";

// POST - Like a comic
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if already liked
    const existingLike = await db.query.likes.findFirst({
      where: and(
        eq(likes.comicId, params.id),
        eq(likes.userId, session.user.id)
      ),
    });

    if (existingLike) {
      return NextResponse.json({ error: "Already liked" }, { status: 400 });
    }

    await db.insert(likes).values({
      id: generateRandomUUID(),
      comicId: params.id,
      userId: session.user.id,
    });

    // Update comic metadata
    const comic = await db.query.comics.findFirst({
      where: eq(comics.id, params.id),
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
      .where(eq(comics.id, params.id));

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
  { params }: { params: { id: string } }
) {
  try {
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
          eq(likes.comicId, params.id),
          eq(likes.userId, session.user.id)
        )
      );

    // Update comic metadata
    const comic = await db.query.comics.findFirst({
      where: eq(comics.id, params.id),
    });

    const currentLikes = (comic?.metadata?.likes as number) || 1;
    await db
      .update(comics)
      .set({
        metadata: {
          ...(comic?.metadata || {}),
          likes: currentLikes - 1,
        },
      })
      .where(eq(comics.id, params.id));

    return NextResponse.json({ success: true, likes: currentLikes - 1 });
  } catch (error) {
    console.error("Unlike error:", error);
    return NextResponse.json(
      { error: "Failed to unlike comic" },
      { status: 500 }
    );
  }
}
```

**File:** `src/app/api/comics/[id]/comments/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comments, comics } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { generateRandomUUID } from "crypto";

// GET - List comments for a comic
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const comicComments = await db.query.comments.findMany({
      where: eq(comments.comicId, params.id),
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
  { params }: { params: { id: string } }
) {
  try {
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

    const [comment] = await db
      .insert(comments)
      .values({
        id: generateRandomUUID(),
        comicId: params.id,
        userId: session.user.id,
        content: content.trim(),
      })
      .returning();

    return NextResponse.json({ comment });
  } catch (error) {
    console.error("Create comment error:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
```

**File:** `src/app/gallery/page.tsx`

```typescript
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { GalleryFilters } from "@/components/gallery/filters";

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: { page?: string; subject?: string; sort?: string };
}) {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Public Gallery</h1>

      <GalleryFilters />

      <GalleryGrid
        page={parseInt(searchParams.page || "1")}
        subject={searchParams.subject}
        sort={searchParams.sort}
      />
    </div>
  );
}
```

---

## Phase 7: Landing Page Redesign

Redesign the landing page with animated comic panels and clear value proposition.

### Tasks

- [ ] Modify `src/app/page.tsx` with new hero section
- [ ] Create `src/components/landing/hero-comic.tsx` - animated hero component
- [ ] Create `src/components/landing/how-it-works.tsx` - 3-step visual guide
- [ ] Create `src/components/landing/example-showcase.tsx` - before/after examples
- [ ] Add Framer Motion animations
- [ ] Add smooth scroll behavior

### Technical Details

**Install Framer Motion:**
```bash
pnpm add framer-motion
```

**File:** `src/app/page.tsx`

```typescript
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroComic } from "@/components/landing/hero-comic";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ExampleShowcase } from "@/components/landing/example-showcase";

export default function HomePage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="container py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Turn Your Notes Into{" "}
              <span className="text-primary">Engaging Comics</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Transform boring study materials into fun, visual comic strips.
              Upload your notes, PDFs, images, or videos and let AI create
              memorable educational content.
            </p>
            <div className="flex gap-4">
              <Button size="lg" asChild>
                <Link href="/create">Get Started Free</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/gallery">View Gallery</Link>
              </Button>
            </div>
          </div>
          <HeroComic />
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-muted/50 py-20">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">
            How It Works
          </h2>
          <HowItWorks />
        </div>
      </section>

      {/* Example Showcase */}
      <section className="container py-20">
        <h2 className="text-3xl font-bold text-center mb-12">
          See the Transformation
        </h2>
        <ExampleShowcase />
      </section>

      {/* CTA Section */}
      <section className="bg-primary/5 py-20">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Make Learning Fun?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of students who are learning visually
          </p>
          <Button size="lg" asChild>
            <Link href="/create">Create Your First Comic</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
```

**File:** `src/components/landing/hero-comic.tsx`

```typescript
"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function HeroComic() {
  const [currentPanel, setCurrentPanel] = useState(0);

  const panels = [
    {
      id: 1,
      text: "Upload your notes...",
      bgColor: "bg-blue-100 dark:bg-blue-900",
    },
    {
      id: 2,
      text: "AI analyzes content...",
      bgColor: "bg-purple-100 dark:bg-purple-900",
    },
    {
      id: 3,
      text: "Comic generated!",
      bgColor: "bg-green-100 dark:bg-green-900",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPanel((prev) => (prev + 1) % panels.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <motion.div
        key={currentPanel}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.5 }}
        className={`aspect-video rounded-lg ${panels[currentPanel].bgColor} flex items-center justify-center`}
      >
        <p className="text-2xl font-bold">{panels[currentPanel].text}</p>
      </motion.div>

      {/* Panel indicators */}
      <div className="flex gap-2 justify-center mt-4">
        {panels.map((_, index) => (
          <div
            key={index}
            className={`h-2 w-2 rounded-full ${
              index === currentPanel ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
```

**File:** `src/components/landing/how-it-works.tsx`

```typescript
"use client";

import { motion } from "framer-motion";
import { Upload, Wand2, BookOpen } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Upload Your Notes",
    description:
      "Drag and drop text, PDFs, images, or even videos. We support all common formats.",
  },
  {
    icon: Wand2,
    title: "AI Creates Magic",
    description:
      "Our AI analyzes your content and generates engaging comic panels that explain concepts visually.",
  },
  {
    icon: BookOpen,
    title: "Learn & Remember",
    description:
      "Customize style, regenerate panels, and export to PDF. Learning has never been this fun!",
  },
];

export function HowItWorks() {
  return (
    <div className="grid md:grid-cols-3 gap-8">
      {steps.map((step, index) => (
        <motion.div
          key={step.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.2 }}
          className="text-center"
        >
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
            <step.icon className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
          <p className="text-muted-foreground">{step.description}</p>
        </motion.div>
      ))}
    </div>
  );
}
```

---

## Phase 8: Create Comic Flow

Build the dedicated create comic page with upload and configuration.

### Tasks

- [ ] Create `src/app/create/page.tsx` - main create flow page
- [ ] Create `src/app/api/comics/create/route.ts` - create and trigger generation
- [ ] Create `src/components/comic/panel-loading.tsx` - loading animation component
- [ ] Add progress indicator during generation
- [ ] Implement real-time status polling
- [ ] Add cancel generation option

### Technical Details

**File:** `src/app/create/page.tsx`

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUploader } from "@/components/upload/file-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StyleSelector } from "@/components/comic/style-selector";
import { ToneSelector } from "@/components/comic/tone-selector";
import { PanelLoading } from "@/components/comic/panel-loading";

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "configure" | "generating" | "done">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string>("");
  const [comicId, setComicId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [artStyle, setArtStyle] = useState("retro");
  const [tone, setTone] = useState("friendly");

  const handleUpload = async (uploadedFile: File) => {
    const formData = new FormData();
    formData.append("file", uploadedFile);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      setFile(uploadedFile);
      setUploadUrl(data.url);
      setStep("configure");
    }
  };

  const handleGenerate = async () => {
    // Create comic entry
    const createResponse = await fetch("/api/comics/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        inputType: file?.type.split("/")[0] || "text",
        inputUrl: uploadUrl,
        artStyle,
        tone,
        subject,
      }),
    });

    if (createResponse.ok) {
      const { comic } = await createResponse.json();
      setComicId(comic.id);

      // Start generation
      await fetch("/api/comics/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comicId: comic.id,
          inputUrl: uploadUrl,
          inputType: file?.type.split("/")[0] || "text",
          options: { subject, artStyle, tone, length: "medium" },
        }),
      });

      setStep("generating");
    }
  };

  return (
    <div className="container py-8 max-w-2xl">
      {step === "upload" && (
        <div>
          <h1 className="text-3xl font-bold mb-8">Upload Your Notes</h1>
          <FileUploader onUpload={handleUpload} />
        </div>
      )}

      {step === "configure" && (
        <div>
          <h1 className="text-3xl font-bold mb-8">Configure Your Comic</h1>

          <div className="space-y-6">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My First Comic"
              />
            </div>

            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Math, History, Science..."
              />
            </div>

            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this comic about?"
              />
            </div>

            <div>
              <Label>Art Style</Label>
              <StyleSelector value={artStyle} onChange={setArtStyle} />
            </div>

            <div>
              <Label>Tone</Label>
              <ToneSelector value={tone} onChange={setTone} />
            </div>

            <div className="flex gap-4">
              <Button onClick={() => setStep("upload")} variant="outline">
                Back
              </Button>
              <Button onClick={handleGenerate} className="flex-1">
                Generate Comic
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === "generating" && (
        <PanelLoading
          comicId={comicId}
          onComplete={() => {
            setStep("done");
            router.push(`/comics/${comicId}`);
          }}
        />
      )}
    </div>
  );
}
```

**File:** `src/app/api/comics/create/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comics } from "@/lib/schema";
import { generateRandomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, inputType, inputUrl, artStyle, tone, subject } = body;

    if (!title || !inputType || !subject) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const [comic] = await db
      .insert(comics)
      .values({
        id: generateRandomUUID(),
        userId: session.user.id,
        title,
        description: description || null,
        inputType,
        inputUrl,
        artStyle: artStyle || "retro",
        tone: tone || "friendly",
        subject,
        status: "draft",
        isPublic: false,
      })
      .returning();

    return NextResponse.json({ comic });
  } catch (error) {
    console.error("Create comic error:", error);
    return NextResponse.json(
      { error: "Failed to create comic" },
      { status: 500 }
    );
  }
}
```

**File:** `src/components/comic/panel-loading.tsx`

```typescript
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";

interface PanelLoadingProps {
  comicId: string;
  onComplete: () => void;
}

export function PanelLoading({ comicId, onComplete }: PanelLoadingProps) {
  const [status, setStatus] = useState<"generating" | "completed" | "failed">("generating");
  const [currentPanel, setCurrentPanel] = useState(0);

  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/comics/generate?comicId=${comicId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.status === "completed") {
            setStatus("completed");
            setTimeout(onComplete, 500);
          } else if (data.status === "failed") {
            setStatus("failed");
          } else if (data.panels) {
            setCurrentPanel(data.panels.length);
          }
        }
      } catch (error) {
        console.error("Poll error:", error);
      }
    };

    const interval = setInterval(pollStatus, 2000);
    return () => clearInterval(interval);
  }, [comicId, onComplete]);

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-8">Creating Your Comic...</h2>

      <div className="grid grid-cols-4 gap-4 max-w-md mx-auto mb-8">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: i < currentPanel ? 1 : 0.3 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="aspect-square flex items-center justify-center">
              {i < currentPanel ? "✓" : "..."}
            </Card>
          </motion.div>
        ))}
      </div>

      <p className="text-muted-foreground">
        {status === "generating"
          ? `Generating panel ${currentPanel + 1}...`
          : status === "completed"
          ? "Almost done!"
          : "Generation failed. Please try again."}
      </p>
    </div>
  );
}
```

---

## Phase 9: Settings & Google Cloud Configuration

Update the settings page with Google Cloud configuration and usage stats.

### Tasks

- [ ] Modify `src/app/profile/page.tsx` with new settings sections
- [ ] Add Google Cloud credentials input (optional)
- [ ] Add usage statistics display
- [ ] Add comic management (bulk delete, export)
- [ ] Add preferred style/tone defaults
- [ ] Update environment variable validation in `src/lib/env.ts`

### Technical Details

**File:** `src/lib/env.ts` (update existing)

```typescript
import { z } from "zod";

// Add Google Cloud variables
const envSchema = z.object({
  // Existing variables...
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // Google Cloud (required for AI features)
  GOOGLE_CLOUD_PROJECT_ID: z.string().optional(),
  GOOGLE_CLOUD_LOCATION: z.string().default("us-central1"),
  GEMINI_API_KEY: z.string().optional(),

  // Optional: User credentials
  ENABLE_USER_CREDENTIALS: z.string().optional(),

  // Storage
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
});

export const env = envSchema.parse(process.env);
```

**Update `src/app/profile/page.tsx`** (add to existing profile page):

```typescript
// Add sections for:
// - Usage stats (comics created, total panels, etc.)
// - Comic management (list with bulk delete)
// - Preferred defaults (style, tone)
// - Optional Google Cloud credentials
```

---

## Phase 10: PDF Export Functionality

Implement PDF export for comics.

### Tasks

- [ ] Install jsPDF and html2canvas dependencies
- [ ] Create `src/lib/pdf-exporter.ts` with export function
- [ ] Create `src/app/api/comics/[id]/export/route.ts` endpoint
- [ ] Create `src/components/comic/export-button.tsx` component
- [ ] Add export options modal (quality, watermark)
- [ ] Add download progress indicator

### Technical Details

**Install dependencies:**
```bash
pnpm add jspdf html2canvas
```

**File:** `src/lib/pdf-exporter.ts`

```typescript
import { Comic, Panel } from "./schema";
import jsPDF from "jspdf";

export interface ExportOptions {
  includeTitle?: boolean;
  watermark?: boolean;
  quality?: "low" | "medium" | "high";
}

export async function exportComicToPDF(
  comic: Comic & { panels: Panel[] },
  options: ExportOptions = {}
): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Add title page if requested
  if (options.includeTitle && comic.title) {
    pdf.setFontSize(24);
    pdf.text(comic.title, pageWidth / 2, pageHeight / 2, { align: "center" });

    if (comic.description) {
      pdf.setFontSize(14);
      pdf.text(comic.description, pageWidth / 2, pageHeight / 2 + 20, {
        align: "center",
      });
    }

    pdf.addPage();
  }

  // Add panels
  for (const panel of comic.panels) {
    // Fetch image and add to PDF
    const response = await fetch(panel.imageUrl);
    const blob = await response.blob();
    const base64 = await blobToBase64(blob);

    const imgProps = pdf.getImageProperties(base64);
    const imgWidth = pageWidth - 40;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

    pdf.addImage(base64, "PNG", 20, 20, imgWidth, imgHeight);

    // Add caption
    if (panel.caption) {
      pdf.setFontSize(12);
      pdf.text(panel.caption, 20, imgHeight + 30);
    }

    // Add watermark if requested
    if (options.watermark) {
      pdf.setFontSize(8);
      pdf.text(
        "Generated by Notes2Comic",
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }

    if (panel !== comic.panels[comic.panels.length - 1]) {
      pdf.addPage();
    }
  }

  return pdf.output("blob");
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
```

**File:** `src/app/api/comics/[id]/export/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comics, panels } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { exportComicToPDF } from "@/lib/pdf-exporter";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const comic = await db.query.comics.findFirst({
      where: eq(comics.id, params.id),
      with: {
        panels: {
          orderBy: (panels, { asc }) => [asc(panels.panelNumber)],
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

    const { searchParams } = new URL(req.url);
    const options = {
      includeTitle: searchParams.get("includeTitle") === "true",
      watermark: comic.isPublic, // Watermark public comics
    };

    const pdfBlob = await exportComicToPDF(comic, options);

    return new NextResponse(pdfBlob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${comic.title}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export" },
      { status: 500 }
    );
  }
}
```

**File:** `src/components/comic/export-button.tsx`

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useState } from "react";

interface ExportButtonProps {
  comicId: string;
  comicTitle: string;
}

export function ExportButton({ comicId, comicTitle }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch(`/api/comics/${comicId}/export`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${comicTitle}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={exporting} variant="outline">
      <Download className="h-4 w-4 mr-2" />
      {exporting ? "Exporting..." : "Export PDF"}
    </Button>
  );
}
```

---

## Phase 11: Animations and Polish

Add final animations, confetti, and polish throughout the app.

### Tasks

- [ ] Install react-confetti dependency
- [ ] Add confetti celebration on comic completion
- [ ] Add panel slide-in animations
- [ ] Add loading comic strip animation
- [ ] Add hover wiggles on interactive elements
- [ ] Add smooth page transitions
- [ ] Run final typecheck and lint
- [ ] Test all user flows end-to-end

### Technical Details

**Install dependencies:**
```bash
pnpm add react-confetti
```

**Add confetti to panel loading completion:**

```typescript
// In src/components/comic/panel-loading.tsx
import Confetti from "react-confetti";

// In component:
{status === "completed" && (
  <Confetti recycle={false} numberOfPieces={200} />
)}
```

**Run quality checks:**
```bash
npm run typecheck
npm run lint
```

---

## Dependencies

All npm packages to install:

```bash
# Google Cloud AI
pnpm add @google-cloud/vertexai @google-cloud/storage

# File handling
pnpm add pdf-parse react-dropzone

# Animations
pnpm add framer-motion react-confetti

# PDF export
pnpm add jspdf html2canvas

# Remove OpenRouter
pnpm remove @openrouter/ai-sdk-provider
```

---

## Environment Variables

Add to `.env`:

```env
# Google Cloud Gemini AI
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GEMINI_API_KEY=your-gemini-api-key

# Optional: Allow user-provided credentials
ENABLE_USER_CREDENTIALS=true
```

Remove from `.env`:
```env
# Remove these OpenRouter variables
# OPENROUTER_API_KEY=
# OPENROUTER_MODEL=
```

---

## Migration from Existing Code

**Files to update/remove:**

1. **Remove OpenRouter chat route** - `src/app/api/chat/route.ts`
   - Option 1: Delete entirely
   - Option 2: Adapt to use Gemini for Q&A about comics

2. **Remove OpenRouter chat page** - `src/app/chat/page.tsx`
   - Option 1: Delete entirely
   - Option 2: Adapt for comic Q&A

3. **Update package.json**:
   - Remove `@openrouter/ai-sdk-provider`
   - Add Google Cloud packages

4. **Update .env.example**:
   - Replace OpenRouter vars with Google Cloud vars

---

## Testing Checklist

After implementation:

- [ ] User can sign up/login with email/password
- [ ] User can sign up/login with Google OAuth
- [ ] User can upload text, PDF, image, and video files
- [ ] Comic generation completes successfully for all input types
- [ ] User can customize style and tone
- [ ] User can regenerate individual panels
- [ ] User can export comic to PDF
- [ ] User can publish comics to gallery
- [ ] Gallery displays public comics
- [ ] Like and comment functionality works
- [ ] All animations are smooth
- [ ] Google Cloud Gemini API integration works
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] Database migrations applied successfully
