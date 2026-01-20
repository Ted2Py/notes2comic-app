# Implementation Plan: Comic Customization Features

## Overview

This implementation adds six major features to the notes-to-comic app:

1. **Output Format Selection** - Choose between comic strip, separate panels, or full page
2. **Panel Count Selection** - User-selectable panel count (1-12)
3. **Text Boxes** - Scene description text for each panel
4. **Character Consistency** - Character reference system for consistent appearance
5. **Hybrid Speech Bubbles** - AI-generated empty bubbles + HTML/CSS text overlays
6. **Post-Generation Editor** - Dedicated edit page at `/comics/[id]/edit`

---

## Phase 1: Database Schema Foundation

Add new fields to support the customization features.

### Tasks

- [ ] Add `outputFormat`, `requestedPanelCount`, `characterReference` fields to comics table in `src/lib/schema.ts`
- [ ] Add `textBox`, `speechBubbles`, `bubblePositions`, `regenerationCount` fields to panels table in `src/lib/schema.ts`
- [ ] Add `SpeechBubble` and `BubblePosition` TypeScript interfaces to `src/lib/schema.ts`
- [ ] Generate database migration with `pnpm run db:generate`
- [ ] Run database migration with `pnpm run db:migrate`

### Technical Details

**File: `src/lib/schema.ts`**

Add to `comics` table definition (after line 101, after `subject` field):

```typescript
export const comics = pgTable(
  "comics",
  {
    // ... existing fields ...
    subject: text("subject").notNull(),

    // NEW FIELDS:
    outputFormat: text("output_format", { enum: ["strip", "separate", "fullpage"] }).notNull().default("separate"),
    requestedPanelCount: integer("requested_panel_count"),
    characterReference: text("character_reference"),

    isPublic: boolean("is_public").notNull().default(false),
    // ... rest of existing fields ...
  }
);
```

Add to `panels` table definition (after line 133, after `caption` field):

```typescript
export const panels = pgTable(
  "panels",
  {
    // ... existing fields ...
    caption: text("caption").notNull(),

    // NEW FIELDS:
    textBox: text("text_box"),
    speechBubbles: jsonb("speech_bubbles").$type<SpeechBubble[]>(),
    bubblePositions: jsonb("bubble_positions").$type<BubblePosition[]>(),
    regenerationCount: integer("regeneration_count").default(0).notNull(),

    metadata: jsonb("metadata").$type<{
      generationPrompt?: string;
      characterContext?: string;
      [key: string]: unknown;
    }>(),
    // ... rest of existing fields ...
  }
);
```

Add type definitions at the end of the file (after line 250):

```typescript
// Speech bubble and position types for comic customization
export interface SpeechBubble {
  id: string;
  text: string;
  character?: string;
  type: "dialogue" | "thought" | "narration";
}

export interface BubblePosition {
  bubbleId: string;
  x: number;      // Percentage position (0-100)
  y: number;      // Percentage position (0-100)
  width: number;  // Percentage width (0-100)
  height: number; // Percentage height (0-100)
  tailDirection?: "top" | "bottom" | "left" | "right" | "none";
}
```

**CLI Commands:**

```bash
# Generate migration from schema changes
pnpm run db:generate

# Apply migration to database
pnpm run db:migrate
```

---

## Phase 2: Create Flow UI Components

Add UI components for selecting output format and panel count during creation.

### Tasks

- [ ] Create `src/components/comic/output-format-selector.tsx` component
- [ ] Create `src/components/comic/panel-count-selector.tsx` component
- [ ] Add `outputFormat` and `panelCount` state to `src/app/create/page.tsx`
- [ ] Add OutputFormatSelector to configure step in `src/app/create/page.tsx`
- [ ] Add PanelCountSelector to configure step in `src/app/create/page.tsx`
- [ ] Update handleGenerate in `src/app/create/page.tsx` to include new fields

### Technical Details

**File: `src/components/comic/output-format-selector.tsx`** (NEW)

```typescript
"use client";

import { cn } from "@/lib/utils";

interface OutputFormatSelectorProps {
  value: "strip" | "separate" | "fullpage";
  onChange: (value: "strip" | "separate" | "fullpage") => void;
}

const FORMATS = [
  { id: "strip", label: "Comic Strip", description: "Panels connected with borders" },
  { id: "separate", label: "Separate Panels", description: "Individual standalone images" },
  { id: "fullpage", label: "Full Page", description: "Single combined image" }
];

export function OutputFormatSelector({ value, onChange }: OutputFormatSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {FORMATS.map((format) => (
        <button
          key={format.id}
          onClick={() => onChange(format.id as any)}
          className={cn(
            "p-4 border-2 rounded-lg text-left transition-all",
            value === format.id
              ? "border-primary bg-primary/10"
              : "border-muted hover:border-primary/50"
          )}
        >
          <div className="font-medium">{format.label}</div>
          <div className="text-sm text-muted-foreground">{format.description}</div>
        </button>
      ))}
    </div>
  );
}
```

**File: `src/components/comic/panel-count-selector.tsx`** (NEW)

```typescript
"use client";

import { cn } from "@/lib/utils";

interface PanelCountSelectorProps {
  value: number;
  suggestedCount?: number;
  onChange: (value: number) => void;
}

export function PanelCountSelector({ value, suggestedCount, onChange }: PanelCountSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Number of Panels</span>
        {suggestedCount && (
          <span className="text-xs text-muted-foreground">
            AI suggests: {suggestedCount}
          </span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
          <button
            key={num}
            onClick={() => onChange(num)}
            className={cn(
              "py-2 px-3 rounded border text-sm transition-all",
              value === num
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted hover:border-primary/50"
            )}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
}
```

**File: `src/app/create/page.tsx`** (MODIFY)

Add imports (around line 15):
```typescript
import { OutputFormatSelector } from "@/components/comic/output-format-selector";
import { PanelCountSelector } from "@/components/comic/panel-count-selector";
```

Add state (around line 41, after existing state):
```typescript
const [outputFormat, setOutputFormat] = useState<"strip" | "separate" | "fullpage">("separate");
const [panelCount, setPanelCount] = useState(4);
```

Add to configure step JSX (after Tone selector, around line 247):
```tsx
{/* Output Format */}
<div className="space-y-3">
  <Label>Output Format</Label>
  <OutputFormatSelector value={outputFormat} onChange={setOutputFormat} />
</div>

{/* Panel Count */}
<div className="space-y-3">
  <PanelCountSelector value={panelCount} onChange={setPanelCount} />
</div>
```

Update handleGenerate body (around line 84):
```typescript
body: JSON.stringify({
  title: title.trim(),
  description: description.trim() || null,
  inputType: getInputType(file),
  inputUrl: uploadUrl,
  artStyle,
  tone,
  subject: subject.trim(),
  outputFormat,           // NEW
  requestedPanelCount: panelCount,  // NEW
}),
```

---

## Phase 3: API Route Updates

Update API routes to handle new fields.

### Tasks

- [ ] Update `src/app/api/comics/create/route.ts` to validate and store `outputFormat` and `requestedPanelCount`
- [ ] Update `src/app/api/comics/generate/route.ts` to pass new options to generator

### Technical Details

**File: `src/app/api/comics/create/route.ts`** (MODIFY)

Add validation (after existing validation, in the POST handler):
```typescript
const { outputFormat, requestedPanelCount } = body;

// Validate output format
if (outputFormat && !["strip", "separate", "fullpage"].includes(outputFormat)) {
  return Response.json({ error: "Invalid output format" }, { status: 400 });
}

// Validate panel count
if (requestedPanelCount && (requestedPanelCount < 1 || requestedPanelCount > 12)) {
  return Response.json({ error: "Panel count must be between 1 and 12" }, { status: 400 });
}
```

Add to database insert (in the values object):
```typescript
outputFormat: outputFormat || "separate",
requestedPanelCount: requestedPanelCount || null,
```

**File: `src/app/api/comics/generate/route.ts`** (MODIFY)

Update options passed to generateComic:
```typescript
const options = {
  subject,
  artStyle: comic.artStyle,
  tone: comic.tone,
  outputFormat: comic.outputFormat,           // NEW
  requestedPanelCount: comic.requestedPanelCount,  // NEW
};
```

---

## Phase 4: Comic Generation Logic [complex]

Update the comic generator to support panel count, character consistency, and hybrid speech bubbles.

### Tasks

- [ ] Update `GenerationOptions` interface in `src/lib/comic-generator.ts`
- [ ] Modify `analyzeContent` to support 1-12 panel range
- [ ] Modify `generatePanelScripts` to respect `requestedPanelCount`
- [ ] Create `extractCharacterReference` function in `src/lib/comic-generator.ts`
- [ ] Update `generatePanelImage` prompt to request empty speech bubbles
- [ ] Update `generateComic` to use character reference system
- [ ] Update `generateComic` to initialize speech bubbles and text boxes

### Technical Details

**File: `src/lib/comic-generator.ts`** (MODIFY)

Update GenerationOptions interface (around line 10):
```typescript
export interface GenerationOptions {
  subject: string;
  artStyle: "retro" | "manga" | "minimal" | "pixel";
  tone: "funny" | "serious" | "friendly";
  length: "short" | "medium" | "long";
  outputFormat?: "strip" | "separate" | "fullpage";  // NEW
  requestedPanelCount?: number;  // NEW
}
```

Modify analyzeContent prompt (around line 126):
```typescript
const prompt = `Analyze the following educational content about ${subject}:

${content}

Provide:
1. Key concepts (as a JSON array)
2. Narrative structure for explaining these concepts
3. Suggested number of comic panels (1-12)

Respond in JSON format with this structure:
{
  "keyConcepts": ["concept1", "concept2", ...],
  "narrativeStructure": "explanation of how to present these concepts",
  "suggestedPanelCount": 4
}`;
```

Modify generatePanelScripts (around line 158):
```typescript
export async function generatePanelScripts(
  analysis: ContentAnalysis,
  options: GenerationOptions
): Promise<PanelScript[]> {
  // Use requested count or suggested count
  const targetPanelCount = options.requestedPanelCount || analysis.suggestedPanelCount;

  const model = getModel(GEMINI_PRO_MODEL);

  const prompt = `Create a comic script with ${targetPanelCount} panels.

Subject: ${options.subject}
Tone: ${options.tone}
Art style: ${options.artStyle}

Content to explain:
${analysis.narrativeStructure}

Key concepts to cover:
${analysis.keyConcepts.join(", ")}

For each panel, provide:
- Panel number
- Visual description (what the scene looks like)
- Dialogue (what characters say)
- Key visual elements (props, backgrounds, etc.)

Respond in JSON format as an array of panels with this structure:
[
  {
    "panelNumber": 1,
    "description": "visual description of the scene",
    "dialogue": "what characters say in this panel",
    "visualElements": "key props and background elements"
  }
]`;

  // ... rest of function remains the same
}
```

Add extractCharacterReference function (after extractTextFromVideo, around line 110):
```typescript
// Extract character reference from first panel for consistency
async function extractCharacterReference(firstPanelUrl: string): Promise<string> {
  const model = getModel(GEMINI_VISION_MODEL);

  const prompt = `Analyze this comic panel image and provide a detailed character reference.

Describe:
1. Main character(s) appearance (hair, clothing, features)
2. Art style characteristics
3. Color palette
4. Proportions and poses

This reference will be used to maintain character consistency across all panels.
Respond in JSON format: { "characterReference": "detailed description" }`;

  const imageResponse = await fetch(firstPanelUrl);
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
      return parsed.characterReference || "";
    }
  } catch (e) {
    console.error("Failed to parse character reference:", e);
  }

  return "";
}
```

Update generatePanelImage prompt (around line 220):
```typescript
export async function generatePanelImage(
  script: PanelScript,
  artStyle: string,
  characterContext?: string
): Promise<string> {
  const prompt = `Create a ${artStyle} style comic panel illustration.

Scene description: ${script.description}
Characters speaking: ${script.dialogue}
Visual elements: ${script.visualElements}
${characterContext ? `Character context: ${characterContext}` : ""}

CRITICAL: Include EMPTY speech bubbles in the image where dialogue should appear.
Do NOT put text inside the bubbles - leave them blank/empty.
Position bubbles naturally in the scene based on character positions.

The image should be in comic book style, colorful, engaging, and suitable for educational content.`;

  // ... rest of function remains the same
}
```

Update generateComic function (around line 297):
```typescript
export async function generateComic(
  comicId: string,
  inputUrl: string,
  inputType: string,
  options: GenerationOptions
): Promise<void> {
  try {
    await db.update(comics).set({ status: "generating" }).where(eq(comics.id, comicId));

    const content = await extractContent(inputUrl, inputType);
    const analysis = await analyzeContent(content, options.subject);
    const scripts = await generatePanelScripts(analysis, options);

    let characterReference = "";
    let characterContext = "";

    // Generate images sequentially
    for (const script of scripts) {
      const imageUrl = await generatePanelImage(script, options.artStyle, characterContext);

      // Extract character reference after first panel
      if (script.panelNumber === 1) {
        characterReference = await extractCharacterReference(imageUrl);
        await db.update(comics).set({ characterReference }).where(eq(comics.id, comicId));
        characterContext = `Character reference: ${characterReference}`;
      }

      await db.insert(panels).values({
        id: randomUUID(),
        comicId,
        panelNumber: script.panelNumber,
        imageUrl,
        caption: script.dialogue,
        textBox: script.description,  // NEW: Store scene description
        speechBubbles: [],  // NEW: Initialize empty
        bubblePositions: [],  // NEW: Initialize empty
        metadata: {
          generationPrompt: script.description,
          characterContext,
        },
      });

      // Build character context for next panel
      characterContext += ` | Panel ${script.panelNumber}: ${script.description}`;
    }

    await db.update(comics).set({
      status: "completed",
      metadata: {
        panelCount: scripts.length,
        generationTime: Date.now(),
      },
    }).where(eq(comics.id, comicId));
  } catch (error) {
    console.error("Comic generation error:", error);
    await db.update(comics).set({ status: "failed" }).where(eq(comics.id, comicId));
    throw error;
  }
}
```

---

## Phase 5: Display Components [complex]

Create components for displaying comics with speech bubbles and different output formats.

### Tasks

- [ ] Create `src/components/comic/speech-bubble-overlay.tsx` component
- [ ] Create `src/components/comic/comic-strip-view.tsx` component
- [ ] Update `src/app/comics/[id]/page.tsx` to use ComicStripView
- [ ] Add edit button to comic view page (for owners)

### Technical Details

**File: `src/components/comic/speech-bubble-overlay.tsx`** (NEW)

```typescript
"use client";

import { SpeechBubble, BubblePosition } from "@/lib/schema";
import { cn } from "@/lib/utils";

interface SpeechBubbleOverlayProps {
  imageUrl: string;
  bubbles: SpeechBubble[];
  positions: BubblePosition[];
  editable?: boolean;
  onBubbleEdit?: (id: string, text: string) => void;
}

export function SpeechBubbleOverlay({
  imageUrl,
  bubbles,
  positions,
  editable = false,
  onBubbleEdit
}: SpeechBubbleOverlayProps) {
  return (
    <div className="relative inline-block">
      <img src={imageUrl} alt="Comic panel" className="w-full" />

      {bubbles.map((bubble) => {
        const pos = positions.find(p => p.bubbleId === bubble.id);
        if (!pos) return null;

        return (
          <div
            key={bubble.id}
            className={cn(
              "absolute border-2 border-black bg-white rounded-lg p-3",
              "font-comic text-sm leading-tight shadow-md",
              editable && "cursor-pointer hover:ring-2 hover:ring-primary"
            )}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              width: `${pos.width}%`,
              minHeight: `${pos.height}%`,
            }}
            onClick={() => editable && onBubbleEdit?.(bubble.id, bubble.text)}
          >
            {bubble.text}
          </div>
        );
      })}
    </div>
  );
}
```

**File: `src/components/comic/comic-strip-view.tsx`** (NEW)

```typescript
import { Panel } from "@/lib/schema";
import { SpeechBubbleOverlay } from "./speech-bubble-overlay";

interface ComicStripViewProps {
  panels: Panel[];
  outputFormat: "strip" | "separate" | "fullpage";
}

export function ComicStripView({ panels, outputFormat }: ComicStripViewProps) {
  const sortedPanels = [...panels].sort((a, b) => a.panelNumber - b.panelNumber);

  if (outputFormat === "separate") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sortedPanels.map((panel) => (
          <div key={panel.id} className="border rounded-lg p-4 bg-card">
            <div className="text-sm font-medium mb-2">Panel {panel.panelNumber}</div>
            <SpeechBubbleOverlay
              imageUrl={panel.imageUrl}
              bubbles={panel.speechBubbles || []}
              positions={panel.bubblePositions || []}
            />
            {panel.textBox && (
              <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
                {panel.textBox}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (outputFormat === "strip") {
    return (
      <div className="flex flex-wrap gap-1 justify-center border-4 border-black p-2 bg-white">
        {sortedPanels.map((panel) => (
          <div key={panel.id} className="relative flex-1 min-w-[200px] border-r-2 border-black last:border-r-0">
            <SpeechBubbleOverlay
              imageUrl={panel.imageUrl}
              bubbles={panel.speechBubbles || []}
              positions={panel.bubblePositions || []}
            />
          </div>
        ))}
      </div>
    );
  }

  // fullpage - grid layout
  return (
    <div className="grid grid-cols-3 gap-1 border-4 border-black p-2 bg-white">
      {sortedPanels.map((panel) => (
        <div key={panel.id} className="relative border border-black">
          <SpeechBubbleOverlay
            imageUrl={panel.imageUrl}
            bubbles={panel.speechBubbles || []}
            positions={panel.bubblePositions || []}
          />
        </div>
      ))}
    </div>
  );
}
```

**File: `src/app/comics/[id]/page.tsx`** (MODIFY)

Add import:
```typescript
import { ComicStripView } from "@/components/comic/comic-strip-view";
```

Replace existing panel display with ComicStripView component. Add edit button for owners:
```typescript
{comic.userId === session.user.id && (
  <Button
    variant="outline"
    onClick={() => router.push(`/comics/${comic.id}/edit`)}
  >
    Edit Comic
  </Button>
)}
```

---

## Phase 6: Editor Page and API [complex]

Create the post-generation editor page and supporting API routes.

### Tasks

- [ ] Create `src/app/comics/[id]/edit/page.tsx` (editor page)
- [ ] Create `src/components/comic/comic-editor.tsx` component
- [ ] Create `src/app/api/comics/[id]/route.ts` with PATCH handler
- [ ] Create `src/app/api/comics/[id]/regenerate/route.ts` for panel regeneration

### Technical Details

**File: `src/app/comics/[id]/edit/page.tsx`** (NEW)

```typescript
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { comics } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { ComicEditor } from "@/components/comic/comic-editor";

export default async function EditComicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;

  const comic = await db.query.comics.findFirst({
    where: eq(comics.id, id),
    with: {
      panels: {
        orderBy: (panels, { asc }) => [asc(panels.panelNumber)],
      },
    },
  });

  if (!comic) {
    redirect("/dashboard");
  }

  if (comic.userId !== session.user.id) {
    redirect("/dashboard");
  }

  return <ComicEditor comic={comic} />;
}
```

**File: `src/components/comic/comic-editor.tsx`** (NEW)

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Comic, Panel, SpeechBubble } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { SpeechBubbleOverlay } from "./speech-bubble-overlay";
import { Save, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export function ComicEditor({ comic }: { comic: Comic & { panels: Panel[] } }) {
  const router = useRouter();
  const [panels, setPanels] = useState(comic.panels);
  const [selectedPanelId, setSelectedPanelId] = useState(panels[0]?.id);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const selectedPanel = panels.find(p => p.id === selectedPanelId);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/comics/${comic.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panels }),
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleBubbleEdit = (panelId: string, bubbleId: string, text: string) => {
    setPanels(prev => prev.map(panel => {
      if (panel.id === panelId) {
        return {
          ...panel,
          speechBubbles: panel.speechBubbles?.map(b =>
            b.id === bubbleId ? { ...b, text } : b
          ) || [],
        };
      }
      return panel;
    }));
    setHasUnsavedChanges(true);
  };

  const handleAddBubble = () => {
    if (!selectedPanel) return;

    const newBubble: SpeechBubble = {
      id: `bubble-${Date.now()}`,
      text: "New dialogue",
      type: "dialogue",
    };

    const newPosition = {
      bubbleId: newBubble.id,
      x: 30,
      y: 20,
      width: 40,
      height: 15,
    };

    setPanels(prev => prev.map(panel => {
      if (panel.id === selectedPanel.id) {
        return {
          ...panel,
          speechBubbles: [...(panel.speechBubbles || []), newBubble],
          bubblePositions: [...(panel.bubblePositions || []), newPosition],
        };
      }
      return panel;
    }));
    setHasUnsavedChanges(true);
  };

  const handleTextBoxChange = (value: string) => {
    if (!selectedPanel) return;

    setPanels(prev => prev.map(panel => {
      if (panel.id === selectedPanel.id) {
        return { ...panel, textBox: value };
      }
      return panel;
    }));
    setHasUnsavedChanges(true);
  };

  const handleRegenerate = async () => {
    if (!selectedPanel) return;

    try {
      await fetch(`/api/comics/${comic.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panelId: selectedPanel.id,
          preserveBubbles: true,
        }),
      });

      router.refresh();
    } catch (error) {
      console.error("Regenerate failed:", error);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar - Panel List */}
      <div className="w-64 border-r p-4 overflow-y-auto bg-muted/20">
        <h2 className="font-semibold mb-4">Panels</h2>
        {panels.map(panel => (
          <button
            key={panel.id}
            onClick={() => setSelectedPanelId(panel.id)}
            className={cn(
              "w-full p-3 mb-2 rounded border text-left transition-all",
              selectedPanelId === panel.id
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            )}
          >
            <div className="font-medium">Panel {panel.panelNumber}</div>
            <div className="text-xs text-muted-foreground truncate">
              {panel.textBox?.substring(0, 50)}...
            </div>
          </button>
        ))}
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={() => router.push(`/comics/${comic.id}`)}
        >
          Back to View
        </Button>
      </div>

      {/* Main Editor */}
      <div className="flex-1 p-8 overflow-y-auto">
        {selectedPanel && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Panel Preview */}
            <div className="border rounded-lg p-4 bg-card">
              <SpeechBubbleOverlay
                imageUrl={selectedPanel.imageUrl}
                bubbles={selectedPanel.speechBubbles || []}
                positions={selectedPanel.bubblePositions || []}
                editable
                onBubbleEdit={(id, text) => handleBubbleEdit(selectedPanel.id, id, text)}
              />
            </div>

            {/* Text Box Editor */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Text Box (Scene Description)</label>
              <Textarea
                value={selectedPanel.textBox || ""}
                onChange={(e) => handleTextBoxChange(e.target.value)}
                placeholder="Describe the scene..."
                rows={3}
              />
            </div>

            {/* Speech Bubbles List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Speech Bubbles</label>
                <Button size="sm" onClick={handleAddBubble}>
                  + Add Bubble
                </Button>
              </div>
              {(selectedPanel.speechBubbles || []).map(bubble => (
                <div key={bubble.id} className="flex gap-2 items-start p-3 border rounded">
                  <Input
                    value={bubble.text}
                    onChange={(e) => handleBubbleEdit(selectedPanel.id, bubble.id, e.target.value)}
                    placeholder="Dialogue text..."
                    className="flex-1"
                  />
                  <select
                    value={bubble.type}
                    onChange={(e) => {
                      setPanels(prev => prev.map(panel => {
                        if (panel.id === selectedPanel.id) {
                          return {
                            ...panel,
                            speechBubbles: panel.speechBubbles?.map(b =>
                              b.id === bubble.id ? { ...b, type: e.target.value as any } : b
                            ) || [],
                          };
                        }
                        return panel;
                      }));
                      setHasUnsavedChanges(true);
                    }}
                    className="h-10 px-3 border rounded"
                  >
                    <option value="dialogue">Dialogue</option>
                    <option value="thought">Thought</option>
                    <option value="narration">Narration</option>
                  </select>
                </div>
              ))}
            </div>

            {/* Regenerate Button */}
            <Button variant="outline" onClick={handleRegenerate}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Regenerate This Panel
            </Button>
          </div>
        )}
      </div>

      {/* Right Sidebar - Actions */}
      <div className="w-72 border-l p-4 space-y-4">
        <Button
          onClick={handleSave}
          disabled={!hasUnsavedChanges || saving}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>

        <div className="p-4 bg-muted/50 rounded text-sm">
          <p className="font-medium mb-2">Tips:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Click bubbles to edit text</li>
            <li>• Add bubbles for dialogue</li>
            <li>• Regenerate to redo image</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
```

**File: `src/app/api/comics/[id]/route.ts`** (NEW)

```typescript
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { panels } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { comics } from "@/lib/schema";
import { headers } from "next/headers";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { panels: panelsData } = body;

  // Verify ownership
  const comic = await db.query.comics.findFirst({
    where: eq(comics.id, id),
  });

  if (!comic || comic.userId !== session.user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Update each panel
  for (const panel of panelsData) {
    await db.update(panels)
      .set({
        textBox: panel.textBox,
        speechBubbles: panel.speechBubbles,
        bubblePositions: panel.bubblePositions,
      })
      .where(
        and(
          eq(panels.id, panel.id),
          eq(panels.comicId, id)
        )
      );
  }

  return Response.json({ success: true });
}
```

**File: `src/app/api/comics/[id]/regenerate/route.ts`** (NEW)

```typescript
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comics, panels } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { generatePanelImage } from "@/lib/comic-generator";
import { randomUUID } from "crypto";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { panelId, preserveBubbles = true } = body;

  // Verify ownership
  const comic = await db.query.comics.findFirst({
    where: eq(comics.id, id),
  });

  if (!comic || comic.userId !== session.user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const panel = await db.query.panels.findFirst({
    where: and(eq(panels.id, panelId), eq(panels.comicId, id)),
  });

  if (!panel) {
    return Response.json({ error: "Panel not found" }, { status: 404 });
  }

  // Regenerate with existing character reference
  const newImageUrl = await generatePanelImage(
    {
      panelNumber: panel.panelNumber,
      description: panel.textBox || panel.metadata?.generationPrompt || "",
      dialogue: panel.caption,
      visualElements: comic.artStyle,
    },
    comic.artStyle,
    comic.characterReference || undefined
  );

  // Update panel
  await db.update(panels)
    .set({
      imageUrl: newImageUrl,
      regenerationCount: (panel.regenerationCount || 0) + 1,
    })
    .where(eq(panels.id, panelId));

  return Response.json({ success: true, imageUrl: newImageUrl });
}
```

---

## Dependencies

- **Phase 1** must complete first (database schema blocks all other work)
- **Phase 2** can run in parallel with **Phase 3**
- **Phase 4** depends on **Phase 3** (API needs to pass options to generator)
- **Phase 5** depends on **Phase 4** (display needs speech bubbles from generation)
- **Phase 6** depends on **Phase 5** (editor uses display components)

---

## Summary of Files

### New Files (7)
- `src/components/comic/output-format-selector.tsx`
- `src/components/comic/panel-count-selector.tsx`
- `src/components/comic/speech-bubble-overlay.tsx`
- `src/components/comic/comic-strip-view.tsx`
- `src/components/comic/comic-editor.tsx`
- `src/app/comics/[id]/edit/page.tsx`
- `src/app/api/comics/[id]/route.ts` (PATCH endpoint)
- `src/app/api/comics/[id]/regenerate/route.ts`

### Modified Files (6)
- `src/lib/schema.ts` - Add new fields and types
- `src/app/create/page.tsx` - Add format/count selectors
- `src/app/api/comics/create/route.ts` - Handle new fields
- `src/app/api/comics/generate/route.ts` - Pass new options
- `src/lib/comic-generator.ts` - Character consistency, hybrid bubbles
- `src/app/comics/[id]/page.tsx` - Use ComicStripView, add edit button
