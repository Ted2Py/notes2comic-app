# Implementation Plan: Comic Editor Improvements

## Overview

Enhance the Notes2Comic editor with context-aware panel regeneration, AI-recognized editable text boxes, Canva-style speech bubble customization, free drawing tools, and improved navigation. The implementation follows existing patterns (React useState, Drizzle ORM, Next.js 16 App Router, shadcn/ui components).

---

## Phase 1: Database Schema Foundation

Update the database schema to support new features: detected text boxes, enhanced speech bubbles with customization options, and drawing layers.

### Tasks

- [ ] Add new TypeScript interfaces to `src/lib/schema.ts` (DetectedTextBox, EnhancedSpeechBubble, EnhancedBubblePosition, DrawingLayer, Stroke, Point)
- [ ] Modify the `panels` table to add `detectedTextBoxes` and `drawingLayers` columns
- [ ] Update `speechBubbles` and `bubblePositions` column types to use enhanced interfaces
- [ ] Add context fields to panel metadata (previousPanelContext, nextPanelContext)
- [ ] Generate database migration with `pnpm run db:generate`
- [ ] Apply migration with `pnpm run db:migrate`
- [ ] Verify new columns exist in database

### Technical Details

**File: `src/lib/schema.ts`**

Add these interfaces after line 282:

```typescript
// AI-recognized text boxes for editable overlays
export interface DetectedTextBox {
  id: string;
  text: string;
  x: number;      // Percentage position (0-100)
  y: number;      // Percentage position (0-100)
  width: number;  // Percentage width (0-100)
  height: number; // Percentage height (0-100)
  confidence: number; // 0-1 confidence score from OCR
}

// Enhanced speech bubble with Canva-style options
export interface EnhancedSpeechBubble extends SpeechBubble {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900";
  shadow?: {
    enabled: boolean;
    blur?: number;
    offsetX?: number;
    offsetY?: number;
    color?: string;
  };
}

// Enhanced bubble position with tail customization
export interface EnhancedBubblePosition extends BubblePosition {
  tailPosition?: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right" | "left" | "right" | "none";
  tailLength?: number; // Percentage (0-20)
  rotation?: number; // Degrees (-180 to 180)
}

// Drawing layers for canvas strokes
export interface DrawingLayer {
  id: string;
  strokes: Stroke[];
  visible: boolean;
  opacity: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  tool: "pen" | "eraser";
  timestamp: number;
}

export interface Point {
  x: number; // Percentage (0-100)
  y: number; // Percentage (0-100)
}
```

Modify the `panels` table definition (around line 132-159):

```typescript
export const panels = pgTable(
  "panels",
  {
    id: text("id").primaryKey(),
    comicId: text("comic_id")
      .notNull()
      .references(() => comics.id, { onDelete: "cascade" }),
    panelNumber: integer("panel_number").notNull(),
    imageUrl: text("image_url").notNull(),
    caption: text("caption").notNull(),
    // Customization fields
    textBox: text("text_box"),
    speechBubbles: jsonb("speech_bubbles").$type<EnhancedSpeechBubble[]>(),  // Changed type
    bubblePositions: jsonb("bubble_positions").$type<EnhancedBubblePosition[]>(),  // Changed type
    // NEW: AI-recognized text boxes
    detectedTextBoxes: jsonb("detected_text_boxes").$type<DetectedTextBox[]>(),
    // NEW: Drawing layers
    drawingLayers: jsonb("drawing_layers").$type<DrawingLayer[]>(),
    regenerationCount: integer("regeneration_count").default(0).notNull(),
    metadata: jsonb("metadata").$type<{
      generationPrompt?: string;
      characterContext?: string;
      // NEW: Store context for regeneration
      previousPanelContext?: string;
      nextPanelContext?: string;
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

**CLI Commands:**
```bash
pnpm run db:generate  # Generates migration file in drizzle/
pnpm run db:migrate   # Applies migration to database
```

---

## Phase 2: Context-Aware Panel Regeneration

Modify the regeneration endpoint to include context from adjacent panels when generating a new panel image.

### Tasks

- [ ] Modify `src/app/api/comics/[id]/regenerate/route.ts` to accept `includeContext` parameter
- [ ] Add logic to fetch previous and next panels when context is enabled
- [ ] Build context string from adjacent panel textBox fields
- [ ] Pass context to `generatePanelImage` function
- [ ] Update `src/components/comic/comic-editor.tsx` to add "Include Context" checkbox
- [ ] Test regeneration with and without context

### Technical Details

**File: `src/app/api/comics/[id]/regenerate/route.ts`**

Modify the POST handler (around line 23-35):

```typescript
const body = await req.json();
const { panelId, options, includeContext } = body;  // Add includeContext
```

Add context fetching after panel validation (after line 48):

```typescript
// Fetch adjacent panels for context
let contextString = "";
if (includeContext) {
  const previousPanel = await db.query.panels.findFirst({
    where: and(
      eq(panels.comicId, id),
      eq(panels.panelNumber, panel.panelNumber - 1)
    ),
  });

  const nextPanel = await db.query.panels.findFirst({
    where: and(
      eq(panels.comicId, id),
      eq(panels.panelNumber, panel.panelNumber + 1)
    ),
  });

  const contextParts = [
    previousPanel?.textBox || previousPanel?.metadata?.generationPrompt,
    nextPanel?.textBox || nextPanel?.metadata?.generationPrompt
  ].filter(Boolean);

  contextString = contextParts.join(" | ");
}
```

Modify the `generatePanelImage` call (around line 52-61):

```typescript
const newImageUrl = await generatePanelImage(
  {
    panelNumber: panel.panelNumber,
    description: panel.textBox || (panel.metadata?.generationPrompt as string) || "",
    dialogue: panel.caption,
    visualElements: comic.artStyle,
  },
  options?.artStyle || comic.artStyle,
  comic.characterReference || options?.characterContext as string,
  undefined,  // outputFormat
  undefined,  // pageSize
  undefined,  // borderStyle
  undefined,  // includeCaptions
  contextString  // NEW: adjacent panels context
);
```

**File: `src/lib/comic-generator.ts`**

Update `generatePanelImage` function signature (around line 362) to accept context:

```typescript
export async function generatePanelImage(
  script: PanelScript,
  artStyle: string,
  characterContext?: string,
  outputFormat?: "strip" | "separate" | "fullpage",
  _pageSize?: "letter" | "a4" | "tabloid" | "a3",
  borderStyle?: "straight" | "jagged" | "zigzag" | "wavy",
  includeCaptions?: boolean,
  adjacentContext?: string  // NEW parameter
): Promise<string>
```

Add context to prompt (around line 374-422, insert before "QUALITY REQUIREMENTS"):

```typescript
${adjacentContext ? `ADJACENT PANELS CONTEXT (for narrative continuity):
${adjacentContext}

Use this context to ensure the scene flows naturally with surrounding panels while maintaining the specific scene description above.` : ""}
```

**File: `src/components/comic/comic-editor.tsx`**

Add state for context toggle (around line 17-23):

```typescript
const [includeContext, setIncludeContext] = useState(true);
```

Add checkbox in regenerate button section (around line 240-245):

```typescript
<div className="flex items-center gap-2 mb-2">
  <Switch
    checked={includeContext}
    onCheckedChange={setIncludeContext}
  />
  <label className="text-sm">Include adjacent panel context</label>
</div>
<Button variant="outline" onClick={() => handleRegenerate(includeContext)}>
  <RotateCcw className="h-4 w-4 mr-2" />
  Regenerate This Panel
</Button>
```

Update `handleRegenerate` to pass context (around line 116-133):

```typescript
const handleRegenerate = async (includeContext: boolean = true) => {
  if (!selectedPanel) return;

  try {
    await fetch(`/api/comics/${comic.id}/regenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        panelId: selectedPanel.id,
        preserveBubbles: true,
        includeContext,  // NEW
      }),
    });

    router.refresh();
  } catch (error) {
    console.error("Regenerate failed:", error);
  }
};
```

---

## Phase 3: AI Text Box Detection

Implement OCR-based text detection using Gemini Vision API to identify text boxes in panel images, making them editable without regeneration.

### Tasks

- [ ] Add `detectTextBoxes` function to `src/lib/comic-generator.ts` using Gemini Vision
- [ ] Create `src/app/api/comics/[id]/panels/[panelId]/detect-text/route.ts` POST endpoint
- [ ] Create `src/components/comic/text-box-detector.tsx` component
- [ ] Add "Detect Text" button and overlay display to text-box-detector component
- [ ] Implement click-to-edit functionality for detected text boxes
- [ ] Integrate text-box-detector into comic-editor.tsx
- [ ] Test text detection on various panel types

### Technical Details

**File: `src/lib/comic-generator.ts`**

Add new function after line 109:

```typescript
export async function detectTextBoxes(imageUrl: string): Promise<DetectedTextBox[]> {
  const model = getModel(GEMINI_VISION_MODEL);

  const prompt = `Analyze this comic panel image and identify ALL text regions including:
1. Speech bubbles
2. Thought bubbles
3. Narration/caption boxes
4. Sound effects text
5. Any other text elements

For each text region, provide:
- The exact text content (read exactly what's written)
- Bounding box as PERCENTAGES of image dimensions (x, y, width, height)
  where (0,0) is top-left and (100,100) is bottom-right
- Confidence score (0-1) for detection accuracy

IMPORTANT: Return coordinates as percentages (0-100), not pixels.

Respond in JSON format:
{
  "textBoxes": [
    {
      "text": "exact text content from image",
      "x": 10.5,
      "y": 20.3,
      "width": 30.2,
      "height": 15.8,
      "confidence": 0.95
    }
  ]
}`;

  // Convert relative URL to full URL
  let fullUrl = imageUrl;
  if (imageUrl.startsWith("/uploads/")) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    fullUrl = `${baseUrl}${imageUrl}`;
  }

  const imageResponse = await fetch(fullUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = Buffer.from(imageBuffer).toString("base64");

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: "image/png",
    },
  };

  const result = await model.generateContent([prompt, imagePart]);
  const response = await result.response;
  const text = response.text() || "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.textBoxes && Array.isArray(parsed.textBoxes)) {
        return parsed.textBoxes.map((box: any, index: number) => ({
          id: `detected-${Date.now()}-${index}`,
          text: box.text || "",
          x: box.x || 0,
          y: box.y || 0,
          width: box.width || 10,
          height: box.height || 5,
          confidence: box.confidence || 0.5,
        }));
      }
    }
  } catch (e) {
    console.error("Failed to parse text detection response:", e);
  }

  return [];
}
```

**File: `src/app/api/comics/[id]/panels/[panelId]/detect-text/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { detectTextBoxes } from "@/lib/comic-generator";
import { db } from "@/lib/db";
import { panels, comics } from "@/lib/schema";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; panelId: string }> }
) {
  try {
    const { id, panelId } = await params;
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const comic = await db.query.comics.findFirst({
      where: eq(comics.id, id),
    });

    if (!comic || comic.userId !== session.user.id) {
      return NextResponse.json({ error: "Comic not found" }, { status: 404 });
    }

    const panel = await db.query.panels.findFirst({
      where: and(eq(panels.id, panelId), eq(panels.comicId, id)),
    });

    if (!panel) {
      return NextResponse.json({ error: "Panel not found" }, { status: 404 });
    }

    // Detect text boxes
    const detectedBoxes = await detectTextBoxes(panel.imageUrl);

    // Update panel with detected text boxes
    await db
      .update(panels)
      .set({ detectedTextBoxes: detectedBoxes })
      .where(eq(panels.id, panelId));

    return NextResponse.json({ success: true, textBoxes: detectedBoxes });
  } catch (error) {
    console.error("Text detection error:", error);
    return NextResponse.json(
      { error: "Failed to detect text" },
      { status: 500 }
    );
  }
}
```

**File: `src/components/comic/text-box-detector.tsx`**

```typescript
"use client";

import { useState } from "react";
import { Scan, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DetectedTextBox } from "@/lib/schema";
import { cn } from "@/lib/utils";

interface TextBoxDetectorProps {
  panelId: string;
  comicId: string;
  imageUrl: string;
  detectedBoxes: DetectedTextBox[];
  onBoxesUpdate: (boxes: DetectedTextBox[]) => void;
  onTextEdit: (boxId: string, text: string) => void;
}

export function TextBoxDetector({
  panelId,
  comicId,
  imageUrl,
  detectedBoxes,
  onBoxesUpdate,
  onTextEdit,
}: TextBoxDetectorProps) {
  const [detecting, setDetecting] = useState(false);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);

  const handleDetect = async () => {
    setDetecting(true);
    try {
      const response = await fetch(
        `/api/comics/${comicId}/panels/${panelId}/detect-text`,
        { method: "POST" }
      );
      const data = await response.json();
      if (data.success) {
        onBoxesUpdate(data.textBoxes);
      }
    } catch (error) {
      console.error("Detection failed:", error);
    } finally {
      setDetecting(false);
    }
  };

  const handleBoxClick = (box: DetectedTextBox) => {
    setSelectedBoxId(box.id);
    const newText = prompt("Edit text:", box.text);
    if (newText !== null) {
      onTextEdit(box.id, newText);
    }
    setSelectedBoxId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">AI Text Detection</h3>
        <Button
          size="sm"
          onClick={handleDetect}
          disabled={detecting}
        >
          {detecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Detecting...
            </>
          ) : (
            <>
              <Scan className="h-4 w-4 mr-2" />
              Detect Text
            </>
          )}
        </Button>
      </div>

      {detectedBoxes.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Found {detectedBoxes.length} text region{detectedBoxes.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
```

---

## Phase 4: Enhanced Speech Bubbles (Canva-Style) [complex]

Implement full speech bubble customization with 9+ bubble types, draggable/resizable bubbles, color/font customization, shadow effects, and tail positioning.

### Tasks

- [ ] Create `src/components/comic/bubble-toolbar.tsx` with all customization controls
- [ ] Implement 9+ bubble type styles (dialogue, thought, narration, shout, whisper, whisper-thought, box, rounded-box, burst)
- [ ] Add color pickers for background and border
- [ ] Add font family dropdown (Comic Sans, Arial, Georgia, Courier, Impact)
- [ ] Add font size slider (12-72px) and font weight selector
- [ ] Add shadow controls (enabled, blur, offset, color)
- [ ] Add tail position selector (9 positions + none) and tail length slider
- [ ] Add rotation control (-180 to 180 degrees)
- [ ] Create `src/components/comic/draggable-bubble.tsx` with drag/resize handles
- [ ] Implement pointer event handling for touch support
- [ ] Modify `src/components/comic/speech-bubble-overlay.tsx` to support enhanced styles
- [ ] Add CSS classes for different bubble shapes
- [ ] Update comic-editor.tsx to integrate toolbar and draggable bubbles
- [ ] Add editor mode state (view, bubble, draw, text)

### Technical Details

**File: `src/components/comic/bubble-toolbar.tsx`**

```typescript
"use client";

import { useState } from "react";
import { Palette, Type, Shadow, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EnhancedSpeechBubble, EnhancedBubblePosition } from "@/lib/schema";

interface BubbleToolbarProps {
  bubble: EnhancedSpeechBubble;
  position: EnhancedBubblePosition;
  onBubbleChange: (bubble: EnhancedSpeechBubble) => void;
  onPositionChange: (position: EnhancedBubblePosition) => void;
}

const BUBBLE_TYPES = [
  { value: "dialogue", label: "Dialogue" },
  { value: "thought", label: "Thought" },
  { value: "narration", label: "Narration" },
  { value: "shout", label: "Shout" },
  { value: "whisper", label: "Whisper" },
  { value: "whisper-thought", label: "Whisper Thought" },
  { value: "box", label: "Box" },
  { value: "rounded-box", label: "Rounded Box" },
  { value: "burst", label: "Burst" },
] as const;

const FONT_FAMILIES = [
  { value: "Comic Sans MS", label: "Comic Sans" },
  { value: "Arial", label: "Arial" },
  { value: "Georgia", label: "Georgia" },
  { value: "Courier New", label: "Courier" },
  { value: "Impact", label: "Impact" },
];

const TAIL_POSITIONS = [
  { value: "none", label: "None" },
  { value: "top-left", label: "Top Left" },
  { value: "top-center", label: "Top Center" },
  { value: "top-right", label: "Top Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-center", label: "Bottom Center" },
  { value: "bottom-right", label: "Bottom Right" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
] as const;

const COLOR_PRESETS = [
  "#ffffff", "#f87171", "#fbbf24", "#34d399", "#60a5fa",
  "#818cf8", "#a78bfa", "#f472b6", "#000000", "#6b7280"
];

export function BubbleToolbar({
  bubble,
  position,
  onBubbleChange,
  onPositionChange,
}: BubbleToolbarProps) {
  const [activeSection, setActiveSection] = useState<"style" | "text" | "shadow" | "tail">("style");

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="flex gap-2 border-b pb-2">
        <Button
          size="sm"
          variant={activeSection === "style" ? "default" : "ghost"}
          onClick={() => setActiveSection("style")}
        >
          <Palette className="h-4 w-4 mr-1" />
          Style
        </Button>
        <Button
          size="sm"
          variant={activeSection === "text" ? "default" : "ghost"}
          onClick={() => setActiveSection("text")}
        >
          <Type className="h-4 w-4 mr-1" />
          Text
        </Button>
        <Button
          size="sm"
          variant={activeSection === "shadow" ? "default" : "ghost"}
          onClick={() => setActiveSection("shadow")}
        >
          <Shadow className="h-4 w-4 mr-1" />
          Shadow
        </Button>
        <Button
          size="sm"
          variant={activeSection === "tail" ? "default" : "ghost"}
          onClick={() => setActiveSection("tail")}
        >
          <Move className="h-4 w-4 mr-1" />
          Tail
        </Button>
      </div>

      {activeSection === "style" && (
        <div className="space-y-3">
          <div>
            <Label>Bubble Type</Label>
            <select
              value={bubble.type}
              onChange={(e) => onBubbleChange({ ...bubble, type: e.target.value as any })}
              className="w-full h-10 px-3 border rounded mt-1"
            >
              {BUBBLE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <Label>Background Color</Label>
            <div className="flex gap-2 mt-1">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  className="w-8 h-8 rounded border-2"
                  style={{ backgroundColor: color, borderColor: bubble.backgroundColor === color ? "var(--primary)" : "#ccc" }}
                  onClick={() => onBubbleChange({ ...bubble, backgroundColor: color })}
                />
              ))}
              <Input
                type="color"
                value={bubble.backgroundColor || "#ffffff"}
                onChange={(e) => onBubbleChange({ ...bubble, backgroundColor: e.target.value })}
                className="w-16 h-8 p-0"
              />
            </div>
          </div>

          <div>
            <Label>Border Color</Label>
            <div className="flex gap-2 mt-1">
              {COLOR_PRESETS.slice(0, 5).map((color) => (
                <button
                  key={color}
                  className="w-8 h-8 rounded border-2"
                  style={{ backgroundColor: color, borderColor: bubble.borderColor === color ? "var(--primary)" : "#ccc" }}
                  onClick={() => onBubbleChange({ ...bubble, borderColor: color })}
                />
              ))}
              <Input
                type="color"
                value={bubble.borderColor || "#000000"}
                onChange={(e) => onBubbleChange({ ...bubble, borderColor: e.target.value })}
                className="w-16 h-8 p-0"
              />
            </div>
          </div>

          <div>
            <Label>Border Width: {bubble.borderWidth || 2}px</Label>
            <input
              type="range"
              min="0"
              max="10"
              value={bubble.borderWidth || 2}
              onChange={(e) => onBubbleChange({ ...bubble, borderWidth: Number(e.target.value) })}
              className="w-full"
            />
          </div>

          <div>
            <Label>Rotation: {position.rotation || 0}°</Label>
            <input
              type="range"
              min="-180"
              max="180"
              value={position.rotation || 0}
              onChange={(e) => onPositionChange({ ...position, rotation: Number(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      )}

      {activeSection === "text" && (
        <div className="space-y-3">
          <div>
            <Label>Font Family</Label>
            <select
              value={bubble.fontFamily || "Comic Sans MS"}
              onChange={(e) => onBubbleChange({ ...bubble, fontFamily: e.target.value })}
              className="w-full h-10 px-3 border rounded mt-1"
            >
              {FONT_FAMILIES.map((font) => (
                <option key={font.value} value={font.value}>{font.label}</option>
              ))}
            </select>
          </div>

          <div>
            <Label>Font Size: {bubble.fontSize || 16}px</Label>
            <input
              type="range"
              min="12"
              max="72"
              value={bubble.fontSize || 16}
              onChange={(e) => onBubbleChange({ ...bubble, fontSize: Number(e.target.value) })}
              className="w-full"
            />
          </div>

          <div>
            <Label>Font Weight</Label>
            <select
              value={bubble.fontWeight || "normal"}
              onChange={(e) => onBubbleChange({ ...bubble, fontWeight: e.target.value as any })}
              className="w-full h-10 px-3 border rounded mt-1"
            >
              <option value="normal">Normal</option>
              <option value="bold">Bold</option>
              <option value="300">Light</option>
              <option value="500">Medium</option>
              <option value="700">Bold</option>
              <option value="900">Black</option>
            </select>
          </div>

          <div>
            <Label>Text Color</Label>
            <Input
              type="color"
              value="#000000"
              onChange={(e) => {/* Add textColor to schema if needed */}}
              className="w-16 h-10 p-0"
            />
          </div>
        </div>
      )}

      {activeSection === "shadow" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="shadow-enabled"
              checked={bubble.shadow?.enabled || false}
              onChange={(e) => onBubbleChange({
                ...bubble,
                shadow: { ...bubble.shadow, enabled: e.target.checked }
              })}
            />
            <Label htmlFor="shadow-enabled">Enable Shadow</Label>
          </div>

          {bubble.shadow?.enabled && (
            <>
              <div>
                <Label>Blur: {bubble.shadow.blur || 4}px</Label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={bubble.shadow.blur || 4}
                  onChange={(e) => onBubbleChange({
                    ...bubble,
                    shadow: { ...bubble.shadow, blur: Number(e.target.value) }
                  })}
                  className="w-full"
                />
              </div>

              <div>
                <Label>Offset X: {bubble.shadow.offsetX || 2}px</Label>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  value={bubble.shadow.offsetX || 2}
                  onChange={(e) => onBubbleChange({
                    ...bubble,
                    shadow: { ...bubble.shadow, offsetX: Number(e.target.value) }
                  })}
                  className="w-full"
                />
              </div>

              <div>
                <Label>Offset Y: {bubble.shadow.offsetY || 2}px</Label>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  value={bubble.shadow.offsetY || 2}
                  onChange={(e) => onBubbleChange({
                    ...bubble,
                    shadow: { ...bubble.shadow, offsetY: Number(e.target.value) }
                  })}
                  className="w-full"
                />
              </div>

              <div>
                <Label>Shadow Color</Label>
                <Input
                  type="color"
                  value={bubble.shadow.color || "#000000"}
                  onChange={(e) => onBubbleChange({
                    ...bubble,
                    shadow: { ...bubble.shadow, color: e.target.value }
                  })}
                  className="w-16 h-10 p-0"
                />
              </div>
            </>
          )}
        </div>
      )}

      {activeSection === "tail" && (
        <div className="space-y-3">
          <div>
            <Label>Tail Position</Label>
            <select
              value={position.tailPosition || "none"}
              onChange={(e) => onPositionChange({ ...position, tailPosition: e.target.value as any })}
              className="w-full h-10 px-3 border rounded mt-1"
            >
              {TAIL_POSITIONS.map((pos) => (
                <option key={pos.value} value={pos.value}>{pos.label}</option>
              ))}
            </select>
          </div>

          <div>
            <Label>Tail Length: {position.tailLength || 10}%</Label>
            <input
              type="range"
              min="0"
              max="20"
              value={position.tailLength || 10}
              onChange={(e) => onPositionChange({ ...position, tailLength: Number(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

**File: `src/components/comic/draggable-bubble.tsx`**

```typescript
"use client";

import { useRef, useState } from "react";
import type { EnhancedSpeechBubble, EnhancedBubblePosition } from "@/lib/schema";
import { cn } from "@/lib/utils";

interface DraggableBubbleProps {
  bubble: EnhancedSpeechBubble;
  position: EnhancedBubblePosition;
  imageUrl: string;
  onUpdate: (bubble: EnhancedSpeechBubble, position: EnhancedBubblePosition) => void;
  onSelect: () => void;
  isSelected: boolean;
}

export function DraggableBubble({
  bubble,
  position,
  onUpdate,
  onSelect,
  isSelected,
}: DraggableBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPos, setInitialPos] = useState({ x: position.x, y: position.y });

  const getBubbleStyle = () => {
    const base: React.CSSProperties = {
      left: `${position.x}%`,
      top: `${position.y}%`,
      width: `${position.width}%`,
      minHeight: `${position.height}%`,
      transform: `rotate(${position.rotation || 0}deg)`,
    };

    if (bubble.shadow?.enabled) {
      base.boxShadow = `${bubble.shadow.offsetX || 0}px ${bubble.shadow.offsetY || 0}px ${bubble.shadow.blur || 4}px ${bubble.shadow.color || "rgba(0,0,0,0.3)"}`;
    }

    return base;
  };

  const getBubbleClass = () => {
    const classes = [
      "absolute border-2 p-3 font-comic text-sm leading-tight shadow-md cursor-move",
      isSelected && "ring-2 ring-primary",
    ];

    // Add shape-specific classes
    switch (bubble.type) {
      case "thought":
        classes.push("rounded-full border-dashed");
        break;
      case "shout":
        classes.push("clip-polygon");
        break;
      case "whisper":
        classes.push("rounded-lg border-dashed");
        break;
      case "box":
        classes.push("rounded-none");
        break;
      case "rounded-box":
        classes.push("rounded-2xl");
        break;
      default:
        classes.push("rounded-lg");
    }

    return cn(classes);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).classList.contains("resize-handle")) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPos({ x: position.x, y: position.y });
    onSelect();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const container = bubbleRef.current?.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
    const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;

    const newX = Math.max(0, Math.min(100 - position.width, initialPos.x + deltaX));
    const newY = Math.max(0, Math.min(100 - position.height, initialPos.y + deltaY));

    onUpdate(bubble, { ...position, x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
  };

  const handleResize = (direction: string, e: React.PointerEvent) => {
    e.stopPropagation();
    // Implementation for resize handles
  };

  return (
    <div
      ref={bubbleRef}
      className={getBubbleClass()}
      style={{
        ...getBubbleStyle(),
        backgroundColor: bubble.backgroundColor || "#ffffff",
        borderColor: bubble.borderColor || "#000000",
        borderWidth: `${bubble.borderWidth || 2}px`,
        fontFamily: bubble.fontFamily || "Comic Sans MS",
        fontSize: `${bubble.fontSize || 16}px`,
        fontWeight: bubble.fontWeight || "normal",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {bubble.text}

      {isSelected && (
        <>
          {/* Resize handles */}
          <div className="resize-handle absolute -top-1 -left-1 w-3 h-3 bg-primary rounded-full cursor-nwse-resize" />
          <div className="resize-handle absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full cursor-nesw-resize" />
          <div className="resize-handle absolute -bottom-1 -left-1 w-3 h-3 bg-primary rounded-full cursor-nesw-resize" />
          <div className="resize-handle absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-full cursor-nwse-resize" />
        </>
      )}
    </div>
  );
}
```

**File: `src/components/comic/speech-bubble-overlay.tsx`**

Update to support enhanced bubble types:

```typescript
// Add these styles for different bubble types
// In global CSS or component styles

.bubble-thought {
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
}

.bubble-shout {
  clip-path: polygon(
    0% 0%, 10% 5%, 20% 0%, 30% 5%, 40% 0%, 50% 5%, 60% 0%, 70% 5%, 80% 0%, 90% 5%, 100% 0%,
    95% 10%, 100% 20%, 95% 30%, 100% 40%, 95% 50%, 100% 60%, 95% 70%, 100% 80%, 95% 90%, 100% 100%,
    90% 95%, 80% 100%, 70% 95%, 60% 100%, 50% 95%, 40% 100%, 30% 95%, 20% 100%, 10% 95%, 0% 100%,
    5% 90%, 0% 80%, 5% 70%, 0% 60%, 5% 50%, 0% 40%, 5% 30%, 0% 20%, 5% 10%
  );
}

.bubble-whisper {
  border-style: dashed;
}

.bubble-burst {
  clip-path: polygon(
    50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%
  );
}
```

---

## Phase 5: Free Drawing Tool [complex]

Implement canvas-based free drawing tool with pen/eraser, color/size options, undo/redo, and layer management.

### Tasks

- [ ] Create `src/components/comic/drawing-canvas.tsx` component
- [ ] Implement HTML5 Canvas with pointer events for drawing
- [ ] Add pen tool with variable thickness (1-50px) and color picker
- [ ] Add eraser tool
- [ ] Implement stroke smoothing with Bezier curves
- [ ] Add undo/redo with history stack (max 50 items)
- [ ] Add clear canvas button
- [ ] Add layer visibility toggle and opacity slider
- [ ] Add touch support for mobile/tablet
- [ ] Create `src/app/api/comics/[id]/panels/[panelId]/drawings/route.ts` endpoint
- [ ] Create `src/lib/drawing-utils.ts` helper functions
- [ ] Integrate drawing canvas into comic-editor with mode toggle
- [ ] Test drawing performance and save/load functionality

### Technical Details

**File: `src/components/comic/drawing-canvas.tsx`**

```typescript
"use client";

import { useRef, useEffect, useState } from "react";
import { Pencil, Eraser, Undo, Redo, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DrawingLayer, Stroke } from "@/lib/schema";
import { cn } from "@/lib/utils";

interface DrawingCanvasProps {
  imageUrl: string;
  drawingLayers: DrawingLayer[];
  onLayersUpdate: (layers: DrawingLayer[]) => void;
  width: number;
  height: number;
}

export function DrawingCanvas({
  imageUrl,
  drawingLayers,
  onLayersUpdate,
  width,
  height,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<"pen" | "eraser">("pen");
  const [currentColor, setCurrentColor] = useState("#ef4444");
  const [currentSize, setCurrentSize] = useState(3);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [history, setHistory] = useState<Stroke[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [layerVisible, setLayerVisible] = useState(true);

  const activeLayer = drawingLayers[0];
  const strokes = activeLayer?.strokes || [];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw base image
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      redrawCanvas(ctx);
    };
  }, [imageUrl, drawingLayers, layerVisible]);

  const redrawCanvas = (ctx: CanvasRenderingContext2D) => {
    if (!layerVisible) return;

    strokes.forEach((stroke) => {
      if (stroke.tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }

      if (stroke.points.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(
        (stroke.points[0].x / 100) * ctx.canvas.width,
        (stroke.points[0].y / 100) * ctx.canvas.height
      );

      // Smooth curve drawing
      for (let i = 1; i < stroke.points.length - 1; i++) {
        const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
        const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
        ctx.quadraticCurveTo(
          (stroke.points[i].x / 100) * ctx.canvas.width,
          (stroke.points[i].y / 100) * ctx.canvas.height,
          (xc / 100) * ctx.canvas.width,
          (yc / 100) * ctx.canvas.height
        );
      }

      ctx.stroke();
    });

    // Draw current stroke
    if (currentStroke.length > 1) {
      ctx.globalCompositeOperation = currentTool === "eraser" ? "destination-out" : "source-over";
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = currentSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.moveTo(
        (currentStroke[0].x / 100) * ctx.canvas.width,
        (currentStroke[0].y / 100) * ctx.canvas.height
      );

      for (let i = 1; i < currentStroke.length; i++) {
        ctx.lineTo(
          (currentStroke[i].x / 100) * ctx.canvas.width,
          (currentStroke[i].y / 100) * ctx.canvas.height
        );
      }

      ctx.stroke();
    }
  };

  const getPoint = (e: React.PointerEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: ((e.clientX - rect.left) * scaleX / canvas.width) * 100,
      y: ((e.clientY - rect.top) * scaleY / canvas.height) * 100,
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDrawing(true);
    const point = getPoint(e);
    setCurrentStroke([point]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    const point = getPoint(e);
    setCurrentStroke([...currentStroke, point]);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    redrawCanvas(ctx);
  };

  const handlePointerUp = () => {
    if (!isDrawing || currentStroke.length < 2) {
      setIsDrawing(false);
      setCurrentStroke([]);
      return;
    }

    const newStroke: Stroke = {
      id: `stroke-${Date.now()}`,
      points: currentStroke,
      color: currentColor,
      width: currentSize,
      tool: currentTool,
      timestamp: Date.now(),
    };

    const updatedStrokes = [...strokes, newStroke];
    const updatedLayers = drawingLayers.map((layer, i) =>
      i === 0 ? { ...layer, strokes: updatedStrokes } : layer
    );

    onLayersUpdate(updatedLayers);

    // Update history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(updatedStrokes);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    setIsDrawing(false);
    setCurrentStroke([]);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newStrokes = history[historyIndex - 1];
      const updatedLayers = drawingLayers.map((layer, i) =>
        i === 0 ? { ...layer, strokes: newStrokes } : layer
      );
      onLayersUpdate(updatedLayers);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newStrokes = history[historyIndex + 1];
      const updatedLayers = drawingLayers.map((layer, i) =>
        i === 0 ? { ...layer, strokes: newStrokes } : layer
      );
      onLayersUpdate(updatedLayers);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const handleClear = () => {
    const updatedLayers = drawingLayers.map((layer, i) =>
      i === 0 ? { ...layer, strokes: [] } : layer
    );
    onLayersUpdate(updatedLayers);
    setHistory([...history, []]);
    setHistoryIndex(history.length);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
        <Button
          size="sm"
          variant={currentTool === "pen" ? "default" : "outline"}
          onClick={() => setCurrentTool("pen")}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant={currentTool === "eraser" ? "default" : "outline"}
          onClick={() => setCurrentTool("eraser")}
        >
          <Eraser className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border" />

        <input
          type="color"
          value={currentColor}
          onChange={(e) => setCurrentColor(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer"
          disabled={currentTool === "eraser"}
        />

        <input
          type="range"
          min="1"
          max="50"
          value={currentSize}
          onChange={(e) => setCurrentSize(Number(e.target.value))}
          className="w-20"
        />
        <span className="text-xs text-muted-foreground">{currentSize}px</span>

        <div className="w-px h-6 bg-border" />

        <Button
          size="sm"
          variant="outline"
          onClick={handleUndo}
          disabled={historyIndex <= 0}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRedo}
          disabled={historyIndex >= history.length - 1}
        >
          <Redo className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border" />

        <Button
          size="sm"
          variant="outline"
          onClick={() => setLayerVisible(!layerVisible)}
        >
          {layerVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleClear}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Canvas */}
      <div className="relative border rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full h-auto cursor-crosshair touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
    </div>
  );
}
```

**File: `src/app/api/comics/[id]/panels/[panelId]/drawings/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { panels, comics } from "@/lib/schema";
import type { DrawingLayer } from "@/lib/schema";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; panelId: string }> }
) {
  try {
    const { id, panelId } = await params;
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const comic = await db.query.comics.findFirst({
      where: eq(comics.id, id),
    });

    if (!comic || comic.userId !== session.user.id) {
      return NextResponse.json({ error: "Comic not found" }, { status: 404 });
    }

    const body = await req.json();
    const { drawingLayers }: { drawingLayers: DrawingLayer[] } = body;

    await db
      .update(panels)
      .set({ drawingLayers })
      .where(eq(panels.id, panelId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save drawings error:", error);
    return NextResponse.json(
      { error: "Failed to save drawings" },
      { status: 500 }
    );
  }
}
```

---

## Phase 6: Enhanced Export with Drawings and Overlays

Update the PDF export functionality to include drawing layers and enhanced speech bubble overlays.

### Tasks

- [ ] Add `compositeLayers` function to `src/lib/pdf-exporter.ts`
- [ ] Implement canvas compositing for base image + drawings + bubbles
- [ ] Modify export functions to use compositeLayers
- [ ] Add export options for includeDrawings and includeOverlays
- [ ] Update `src/components/comic/export-button.tsx` with export format dropdown
- [ ] Test export with drawings, bubbles, and text overlays

### Technical Details

**File: `src/lib/pdf-exporter.ts`**

Add compositeLayers function:

```typescript
/**
 * Composite drawing layers and speech bubbles onto base image
 */
async function compositeLayers(
  baseImageUrl: string,
  drawingLayers: DrawingLayer[],
  bubbles: EnhancedSpeechBubble[],
  positions: EnhancedBubblePosition[]
): Promise<string> {
  const sharp = (await import("sharp")).default;

  // Load base image
  const fullUrl = getFullUrl(baseImageUrl);
  const response = await fetch(fullUrl);
  const buffer = Buffer.from(await response.arrayBuffer());

  let image = sharp(buffer);

  // Get image metadata
  const metadata = await image.metadata();
  const width = metadata.width || 1024;
  const height = metadata.height || 1024;

  // Create SVG for drawings and bubbles
  const svgElements: string[] = [];

  // Add drawing strokes
  drawingLayers.forEach((layer) => {
    if (!layer.visible) return;

    layer.strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      const points = stroke.points
        .map((p) => `${(p.x / 100) * width},${(p.y / 100) * height}`)
        .join(" ");

      svgElements.push(
        `<polyline points="${points}" fill="none" stroke="${stroke.color}" stroke-width="${stroke.width}" stroke-linecap="round" stroke-linejoin="round" opacity="${layer.opacity}" />`
      );
    });
  });

  // Add speech bubbles
  bubbles.forEach((bubble) => {
    const pos = positions.find((p) => p.bubbleId === bubble.id);
    if (!pos) return;

    const x = (pos.x / 100) * width;
    const y = (pos.y / 100) * height;
    const w = (pos.width / 100) * width;
    const h = (pos.height / 100) * height;

    const bgColor = bubble.backgroundColor || "#ffffff";
    const borderColor = bubble.borderColor || "#000000";
    const borderWidth = bubble.borderWidth || 2;

    svgElements.push(`
      <rect x="${x}" y="${y}" width="${w}" height="${h}"
        fill="${bgColor}" stroke="${borderColor}" stroke-width="${borderWidth}"
        rx="${bubble.type === "thought" ? w / 2 : 8}" />
      <text x="${x + w / 2}" y="${y + h / 2}"
        font-family="${bubble.fontFamily || "Arial"}"
        font-size="${bubble.fontSize || 16}"
        font-weight="${bubble.fontWeight || "normal"}"
        fill="#000000" text-anchor="middle" dominant-baseline="middle">
        ${bubble.text}
      </text>
    `);
  });

  // Composite SVG onto image
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${svgElements.join("\n")}
    </svg>
  `;

  const svgBuffer = Buffer.from(svg);

  image = image.composite([
    {
      input: svgBuffer,
      top: 0,
      left: 0,
    },
  ]);

  // Convert to base64 data URL
  const compositedBuffer = await image.png().toBuffer();
  const base64 = `data:image/png;base64,${compositedBuffer.toString("base64")}`;

  return base64;
}
```

Modify export functions to accept new options and use compositeLayers.

**File: `src/components/comic/export-button.tsx`**

Add export options dropdown:

```typescript
const [exportOptions, setExportOptions] = useState({
  includeDrawings: true,
  includeOverlays: true,
});

// In the export button handler, pass these options to the API
```

---

## Phase 7: Improved Navigation and Layout

Enhance the editor layout with improved panel thumbnails, keyboard shortcuts, and mode-based editing.

### Tasks

- [ ] Create `src/components/comic/panel-thumbnail.tsx` component
- [ ] Add panel preview image and number badge
- [ ] Add unsaved changes indicator
- [ ] Add hover preview functionality
- [ ] Create `src/components/comic/keyboard-shortcuts.tsx` hook
- [ ] Implement keyboard shortcuts (arrows, Ctrl+S, Ctrl+Z, Delete, B, D, E, Escape)
- [ ] Update comic-editor.tsx with mode state (view, bubble, draw, text)
- [ ] Add editor mode toolbar
- [ ] Integrate panel thumbnails in sidebar
- [ ] Test keyboard navigation and mode switching

### Technical Details

**File: `src/components/comic/panel-thumbnail.tsx`**

```typescript
"use client";

import { cn } from "@/lib/utils";
import type { Panel } from "@/lib/schema";

interface PanelThumbnailProps {
  panel: Panel;
  isSelected: boolean;
  hasUnsavedChanges: boolean;
  onClick: () => void;
}

export function PanelThumbnail({
  panel,
  isSelected,
  hasUnsavedChanges,
  onClick,
}: PanelThumbnailProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-2 mb-2 rounded border text-left transition-all relative",
        isSelected
          ? "border-primary bg-primary/10"
          : "border-border hover:border-primary/50"
      )}
    >
      <div className="aspect-square bg-muted rounded overflow-hidden mb-2 relative">
        <img
          src={panel.imageUrl}
          alt={`Panel ${panel.panelNumber}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
          {panel.panelNumber}
        </div>
      </div>
      <div className="text-xs font-medium truncate">
        {panel.textBox?.substring(0, 30) || "No description"}
      </div>
      {hasUnsavedChanges && (
        <div className="absolute top-3 right-3 w-2 h-2 bg-orange-500 rounded-full" />
      )}
    </button>
  );
}
```

**File: `src/components/comic/keyboard-shortcuts.tsx`**

```typescript
"use client";

import { useEffect } from "react";

interface KeyboardShortcutsProps {
  onNextPanel?: () => void;
  onPreviousPanel?: () => void;
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDelete?: () => void;
  onAddBubble?: () => void;
  onToggleDraw?: () => void;
  onToggleEraser?: () => void;
  onDeselect?: () => void;
}

export function useKeyboardShortcuts({
  onNextPanel,
  onPreviousPanel,
  onSave,
  onUndo,
  onRedo,
  onDelete,
  onAddBubble,
  onToggleDraw,
  onToggleEraser,
  onDeselect,
}: KeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (e.key === "ArrowRight" && onNextPanel) {
        e.preventDefault();
        onNextPanel();
      } else if (e.key === "ArrowLeft" && onPreviousPanel) {
        e.preventDefault();
        onPreviousPanel();
      } else if (modKey && e.key === "s" && onSave) {
        e.preventDefault();
        onSave();
      } else if (modKey && e.key === "z" && onUndo) {
        e.preventDefault();
        if (e.shiftKey) {
          onRedo?.();
        } else {
          onUndo();
        }
      } else if (e.key === "Delete" && onDelete) {
        e.preventDefault();
        onDelete();
      } else if (e.key === "b" && onAddBubble) {
        e.preventDefault();
        onAddBubble();
      } else if (e.key === "d" && onToggleDraw) {
        e.preventDefault();
        onToggleDraw();
      } else if (e.key === "e" && onToggleEraser) {
        e.preventDefault();
        onToggleEraser();
      } else if (e.key === "Escape" && onDeselect) {
        e.preventDefault();
        onDeselect();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    onNextPanel,
    onPreviousPanel,
    onSave,
    onUndo,
    onRedo,
    onDelete,
    onAddBubble,
    onToggleDraw,
    onToggleEraser,
    onDeselect,
  ]);
}
```

**File: `src/components/comic/comic-editor.tsx`**

Update with mode state and keyboard shortcuts integration (after line 23):

```typescript
const [editorMode, setEditorMode] = useState<"view" | "bubble" | "draw" | "text">("view");
const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
const [drawingHistory, setDrawingHistory] = useState<Stroke[][]>([]);
const [historyIndex, setHistoryIndex] = useState(-1);

// Keyboard shortcuts
useKeyboardShortcuts({
  onNextPanel: () => {
    const currentIndex = panels.findIndex(p => p.id === selectedPanelId);
    if (currentIndex < panels.length - 1) {
      setSelectedPanelId(panels[currentIndex + 1].id);
    }
  },
  onPreviousPanel: () => {
    const currentIndex = panels.findIndex(p => p.id === selectedPanelId);
    if (currentIndex > 0) {
      setSelectedPanelId(panels[currentIndex - 1].id);
    }
  },
  onSave: handleSave,
  onUndo: () => {/* handle drawing undo */},
  onRedo: () => {/* handle drawing redo */},
  onDelete: () => {
    if (selectedBubbleId && editorMode === "bubble") {
      handleRemoveBubble(selectedBubbleId);
      setSelectedBubbleId(null);
    }
  },
  onAddBubble: () => {
    if (editorMode !== "bubble") {
      setEditorMode("bubble");
    }
    handleAddBubble();
  },
  onToggleDraw: () => {
    setEditorMode(editorMode === "draw" ? "view" : "draw");
  },
  onToggleEraser: () => {
    if (editorMode === "draw") {
      // Toggle eraser in drawing component
    }
  },
  onDeselect: () => {
    setSelectedBubbleId(null);
    setEditorMode("view");
  },
});
```

Add mode toolbar (in main editor section):

```typescript
<div className="flex gap-2 mb-4">
  <Button
    size="sm"
    variant={editorMode === "view" ? "default" : "outline"}
    onClick={() => setEditorMode("view")}
  >
    View
  </Button>
  <Button
    size="sm"
    variant={editorMode === "bubble" ? "default" : "outline"}
    onClick={() => setEditorMode("bubble")}
  >
    Bubbles
  </Button>
  <Button
    size="sm"
    variant={editorMode === "draw" ? "default" : "outline"}
    onClick={() => setEditorMode("draw")}
  >
    Draw
  </Button>
  <Button
    size="sm"
    variant={editorMode === "text" ? "default" : "outline"}
    onClick={() => setEditorMode("text")}
  >
    Text
  </Button>
</div>
```

---

## Phase 8: Polish and Testing

Final polish, performance optimization, and comprehensive testing of all features.

### Tasks

- [ ] Run `pnpm run lint` and fix any linting errors
- [ ] Run `pnpm run typecheck` and fix any type errors
- [ ] Test context-aware regeneration with various comics
- [ ] Test text detection on different panel styles
- [ ] Test all 9+ bubble types and customization options
- [ ] Test drawing tool (pen, eraser, undo/redo, save/load)
- [ ] Test keyboard shortcuts on desktop
- [ ] Test touch interactions on mobile/tablet
- [ ] Test PDF export with drawings and overlays
- [ ] Optimize image loading with lazy loading
- [ ] Add loading states for async operations
- [ ] Add error handling for API failures
- [ ] Test accessibility with keyboard navigation
- [ ] Add ARIA labels for screen readers

---

## Dependencies Between Phases

- Phase 2 (Context Regeneration) can proceed independently after Phase 1
- Phase 3 (Text Detection) depends on Phase 1 (schema)
- Phase 4 (Enhanced Bubbles) depends on Phase 1 (schema)
- Phase 5 (Drawing Tool) depends on Phase 1 (schema)
- Phase 6 (Export) depends on Phase 4 and Phase 5
- Phase 7 (Navigation) can proceed independently
- Phase 8 (Testing) depends on all previous phases

## Implementation Order Recommendation

1. **Phase 1** (Foundation - must be first)
2. **Phase 2** (Context Regeneration - independent)
3. **Phase 3** (Text Detection - independent)
4. **Phase 7** (Navigation - independent, quick wins)
5. **Phase 4** (Enhanced Bubbles - complex, but standalone)
6. **Phase 5** (Drawing Tool - complex, but standalone)
7. **Phase 6** (Export - integrates 4 & 5)
8. **Phase 8** (Polish - must be last)
