# Implementation Plan: Comic Making Refinements

## Overview

This implementation adds 14 refinements to the comic creation and export experience, including new art styles, tones, border options, subject dropdowns, dashboard filtering, and critical fixes for page size application, character consistency, and text readability.

---

## Phase 1: Database Schema & Foundation

Update the database schema to support new fields and expanded enums.

### Tasks

- [ ] Add new fields to `comics` table schema
  - [ ] `borderStyle` enum field ("straight", "jagged", "zigzag", "wavy") with default "straight"
  - [ ] `showCaptions` boolean field with default `false`
  - [ ] `tags` array field for subjects
- [ ] Expand `artStyle` enum from 4 to 8 values
  - Add: "noir", "watercolor", "anime", "popart"
- [ ] Expand `tone` enum from 3 to 6 values
  - Add: "adventure", "romantic", "horror"
- [ ] Generate and run database migration

### Technical Details

**File:** `src/lib/schema.ts`

**Schema additions (after line 106):**
```typescript
borderStyle: text("border_style", { enum: ["straight", "jagged", "zigzag", "wavy"] }).notNull().default("straight"),
showCaptions: boolean("show_captions").notNull().default(false),
tags: text("tags").array(),
```

**Updated artStyle enum (line 99):**
```typescript
artStyle: text("art_style", { enum: ["retro", "manga", "minimal", "pixel", "noir", "watercolor", "anime", "popart"] })
```

**Updated tone enum (line 100):**
```typescript
tone: text("tone", { enum: ["funny", "serious", "friendly", "adventure", "romantic", "horror"] })
```

**CLI commands:**
```bash
pnpm run db:generate  # Generate migration from schema changes
pnpm run db:migrate   # Apply migration to database
```

---

## Phase 2: New UI Components

Create new selector components for subject dropdown and border style selection.

### Tasks

- [ ] Create `SubjectSelector` component with predefined options and "Other" input
- [ ] Create `BorderStyleSelector` component with card-based selection
- [ ] Update `StyleSelector` to include 4 new art styles
- [ ] Update `ToneSelector` to include 3 new tones

### Technical Details

**New file:** `src/components/comic/subject-selector.tsx`

```typescript
"use client";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const PREDEFINED_SUBJECTS = [
  "Math", "Science", "History", "Literature", "Art", "Geography", "Computer Science", "Other"
];

export function SubjectSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherValue, setOtherValue] = useState("");

  return (
    <div className="space-y-2">
      <Label>Subject *</Label>
      <div className="grid grid-cols-4 gap-2">
        {PREDEFINED_SUBJECTS.map((subject) => (
          <Button
            key={subject}
            variant={value === subject ? "default" : "outline"}
            size="sm"
            onClick={() => {
              onChange(subject);
              setShowOtherInput(subject === "Other");
            }}
          >
            {subject}
          </Button>
        ))}
      </div>
      {showOtherInput && (
        <input
          type="text"
          value={otherValue}
          onChange={(e) => { setOtherValue(e.target.value); onChange(e.target.value); }}
          placeholder="Enter subject..."
          className="mt-2 w-full px-3 py-2 border rounded-md"
        />
      )}
    </div>
  );
}
```

**New file:** `src/components/comic/border-style-selector.tsx`

```typescript
"use client";
import { Card } from "@/components/ui/card";

const BORDER_STYLES = [
  { id: "straight", label: "Straight", description: "Clean straight borders" },
  { id: "jagged", label: "Jagged", description: "Rough torn paper edges" },
  { id: "zigzag", label: "Zigzag", description: "Angular zigzag pattern" },
  { id: "wavy", label: "Wavy", description: "Flowing wavy borders" },
];

export function BorderStyleSelector({ value, onChange }: {
  value: "straight" | "jagged" | "zigzag" | "wavy";
  onChange: (v: any) => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {BORDER_STYLES.map((style) => (
        <Card
          key={style.id}
          className={`p-3 cursor-pointer transition-all ${
            value === style.id ? "border-primary bg-primary/5" : "hover:border-primary/50"
          }`}
          onClick={() => onChange(style.id)}
        >
          <div className="text-center">
            <div className="font-medium text-sm">{style.label}</div>
            <div className="text-xs text-muted-foreground mt-1">{style.description}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

**File:** `src/components/comic/style-selector.tsx` (line 11)

Add to STYLES array:
```typescript
{ id: "noir", label: "Noir", description: "Dark, dramatic shadows" },
{ id: "watercolor", label: "Watercolor", description: "Soft painted look" },
{ id: "anime", label: "Anime", description: "Japanese animation style" },
{ id: "popart", label: "Pop Art", description: "Bold, vibrant colors" },
```

Update grid layout (line 20): `grid-cols-2 md:grid-cols-4`

**File:** `src/components/comic/tone-selector.tsx` (line 11)

Add to TONES array:
```typescript
{ id: "adventure", label: "Adventure", emoji: "⚔️" },
{ id: "romantic", label: "Romantic", emoji: "💕" },
{ id: "horror", label: "Horror", emoji: "👻" },
```

---

## Phase 3: Create Page Integration

Integrate new components into the create page and update API payload.

### Tasks

- [ ] Add new state variables for `showCaptions` and `borderStyle`
- [ ] Import new components (`SubjectSelector`, `BorderStyleSelector`)
- [ ] Replace subject text input with `SubjectSelector` component
- [ ] Add border style selector (conditional on strip format)
- [ ] Add captions toggle (conditional on separate panels format)
- [ ] Update API payload to include new fields

### Technical Details

**File:** `src/app/create/page.tsx`

**Add state (after line 53):**
```typescript
const [showCaptions, setShowCaptions] = useState(false);
const [borderStyle, setBorderStyle] = useState<"straight" | "jagged" | "zigzag" | "wavy">("straight");
```

**Import new components (after line 12):**
```typescript
import { BorderStyleSelector } from "@/components/comic/border-style-selector";
import { SubjectSelector } from "@/components/comic/subject-selector";
```

**Replace subject input (~lines 237-250):**
```typescript
<SubjectSelector value={subject} onChange={setSubject} />
```

**Add border style section (after panel count section):**
```typescript
{/* Border Style - only for strip format */}
{outputFormat === "strip" && (
  <div className="space-y-3">
    <Label>Border Style</Label>
    <BorderStyleSelector value={borderStyle} onChange={setBorderStyle} />
  </div>
)}
```

**Add captions toggle:**
```typescript
{/* Captions Toggle - only for separate panels */}
{outputFormat === "separate" && (
  <div className="flex items-center justify-between">
    <div className="space-y-0.5">
      <Label>Show Captions</Label>
      <p className="text-xs text-muted-foreground">Display speech bubble text below each panel</p>
    </div>
    <Switch checked={showCaptions} onCheckedChange={setShowCaptions} />
  </div>
)}
```

**Update API payload (lines 108-120):**
```typescript
body: JSON.stringify({
  // ... existing fields
  tags: [subject.trim()],
  borderStyle: outputFormat === "strip" ? borderStyle : "straight",
  showCaptions: outputFormat === "separate" ? showCaptions : false,
}),
```

---

## Phase 4: API Validation Updates

Update the create API to validate and store new fields.

### Tasks

- [ ] Update validation for expanded art styles (8 values)
- [ ] Update validation for expanded tones (6 values)
- [ ] Add validation for border styles (4 values)
- [ ] Update database insert to include new fields

### Technical Details

**File:** `src/app/api/comics/create/route.ts`

**Update validation arrays (lines 56-71):**
```typescript
const validArtStyles = ["retro", "manga", "minimal", "pixel", "noir", "watercolor", "anime", "popart"];
const validTones = ["funny", "serious", "friendly", "adventure", "romantic", "horror"];
const validBorderStyles = ["straight", "jagged", "zigzag", "wavy"];
```

**Add border style validation (after line 89):**
```typescript
if (borderStyle && !validBorderStyles.includes(borderStyle)) {
  return NextResponse.json(
    { error: `Invalid borderStyle. Must be one of: ${validBorderStyles.join(", ")}` },
    { status: 400 }
  );
}
```

**Update database insert (lines 99-117):**
```typescript
const [comic] = await db.insert(comics).values({
  // ... existing fields
  borderStyle: borderStyle || "straight",
  showCaptions: showCaptions ?? false,
  tags: tags || [trimmedSubject],
}).returning();
```

---

## Phase 5: PDF Export Page Size Fix [complex]

Fix the critical issue where PDF exports ignore the user's selected page size.

### Tasks

- [ ] Update jsPDF initialization to use comic's pageSize field
- [ ] Test export with all page sizes (Letter, A4, Tabloid, A3)

### Technical Details

**File:** `src/lib/pdf-exporter.ts`

**Line 107 - CRITICAL FIX:**
```typescript
// BEFORE:
format: "a4",

// AFTER:
format: comic.pageSize === "letter" ? "letter" :
       comic.pageSize === "a4" ? "a4" :
       comic.pageSize === "tabloid" ? "tabloid" :
       "a3",
```

**Full jsPDF initialization (lines 103-108):**
```typescript
const jsPDF = (await import("jspdf")).default;
const pdf = new jsPDF({
  orientation: "landscape",
  unit: "mm",
  format: comic.pageSize === "letter" ? "letter" :
         comic.pageSize === "a4" ? "a4" :
         comic.pageSize === "tabloid" ? "tabloid" :
         "a3",
});
```

---

## Phase 6: Export Captions Logic Refinement

Refine caption handling so it only applies to separate panels format.

### Tasks

- [ ] Remove caption rendering from fullpage export
- [ ] Remove caption rendering from strip export
- [ ] Add `showCaptions` check to separate panels export
- [ ] Update `ExportButton` to conditionally show "With captions" option

### Technical Details

**File:** `src/lib/pdf-exporter.ts`

**Remove captions from fullpage (lines 191-194):**
Delete these lines:
```typescript
if (options.includeCaptions && panel.caption) {
  const captionY = y + imgHeight + 3;
  addCaption(pdf, panel.caption, x, captionY, panelWidth);
}
```

**Remove captions from strip (lines 252-256):**
Delete these lines:
```typescript
if (options.includeCaptions && panel.caption) {
  const captionY = y + imgHeight + 4;
  addCaption(pdf, panel.caption, currentX, captionY, panelWidth);
}
```

**Update separate panels caption logic (lines 301-305):**
```typescript
// BEFORE:
if (options.includeCaptions && panel.caption) {

// AFTER:
if (options.showCaptions && options.includeCaptions && panel.caption) {
```

**File:** `src/components/comic/export-button.tsx`

**Add outputFormat prop (line 16):**
```typescript
interface ExportButtonProps {
  comicId: string;
  comicTitle: string;
  outputFormat?: "strip" | "separate" | "fullpage";
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}
```

**Conditionally show captions option (lines 77-88):**
```typescript
<DropdownMenuContent align="end">
  <DropdownMenuLabel>Export Options</DropdownMenuLabel>
  <DropdownMenuSeparator />
  <DropdownMenuItem onClick={() => handleExport(false)}>
    <Image className="h-4 w-4 mr-2" />
    Panels only
  </DropdownMenuItem>
  {/* Only show "With captions" if comic format is separate */}
  {outputFormat === "separate" && (
    <DropdownMenuItem onClick={() => handleExport(true)}>
      <FileText className="h-4 w-4 mr-2" />
      With captions
    </DropdownMenuItem>
  )}
</DropdownMenuContent>
```

---

## Phase 7: Comic View Page Updates

Add publish button and pass new props to components.

### Tasks

- [ ] Add quick publish toggle button for comic owners
- [ ] Pass `borderStyle` and `showCaptions` to `ComicStripView`
- [ ] Pass `outputFormat` to `ExportButton`

### Technical Details

**File:** `src/app/comics/[id]/page.tsx`

**Pass props to ComicStripView (line 75):**
```typescript
<ComicStripView
  panels={comic.panels}
  outputFormat={comic.outputFormat}
  borderStyle={comic.borderStyle}
  showCaptions={comic.showCaptions}
/>
```

**Pass outputFormat to ExportButton (line 63):**
```typescript
<ExportButton
  comicId={comic.id}
  comicTitle={comic.title}
  outputFormat={comic.outputFormat}
/>
```

**Add publish button (after line 62, before ExportButton):**
```typescript
{isOwner && (
  <form action={async () => {
    "use server";
    await db.update(comics)
      .set({ isPublic: !comic.isPublic })
      .where(eq(comics.id, comic.id));
    redirect(`/comics/${comic.id}`);
  }}>
    <Button
      type="submit"
      variant={comic.isPublic ? "default" : "outline"}
      size="sm"
    >
      {comic.isPublic ? "🌐 Public" : "🔒 Private"}
    </Button>
  </form>
)}
```

---

## Phase 8: Comic Strip View Component Updates

Update the comic strip view component to support captions display.

### Tasks

- [ ] Update `ComicStripView` interface to accept `showCaptions` prop
- [ ] Display captions below panels when `showCaptions` is true (separate format only)

### Technical Details

**File:** `src/components/comic/comic-strip-view.tsx`

**Update interface (lines 6-9):**
```typescript
interface ComicStripViewProps {
  panels: Panel[];
  outputFormat: "strip" | "separate" | "fullpage";
  borderStyle?: "straight" | "jagged" | "zigzag" | "wavy";
  showCaptions?: boolean;
}
```

**Update separate panels rendering to show captions:**
```typescript
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
          {showCaptions && panel.caption && (
            <div className="mt-3 p-3 bg-muted/50 rounded text-sm border border-border">
              <div className="font-medium text-xs text-muted-foreground mb-1">
                Caption:
              </div>
              {panel.caption}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## Phase 9: AI Prompt Improvements

Refine AI prompts to improve text readability and include new feature context.

### Tasks

- [ ] Update panel generation prompt to emphasize speech bubble readability
- [ ] Add border style context to prompts (strip format)
- [ ] Add caption context to prompts (separate panels format)

### Technical Details

**File:** `src/lib/comic-generator.ts`

**Update prompt (lines 312-322):**
```
CRITICAL INSTRUCTIONS FOR SPEECH BUBBLES:
- INCLUDE FILLED speech bubbles with the actual dialogue text inside them
- The dialogue text "${script.dialogue}" must be visible inside speech bubbles in the image
- Make speech bubbles LARGE ENOUGH to contain all text comfortably
- Use appropriate font size - text should be easily readable at the final output size
- Position speech bubbles in clear, uncluttered areas
- Use high contrast text (black text on white/light bubbles)
- Ensure speech bubbles don't overlap important visual elements
- Use comic-style speech bubbles with tails pointing to speakers
```

**Update `generatePanelImage` function signature:**
```typescript
export async function generatePanelImage(
  script: PanelScript,
  artStyle: string,
  characterContext?: string,
  outputFormat?: "strip" | "separate" | "fullpage",
  pageSize?: "letter" | "a4" | "tabloid" | "a3",
  borderStyle?: "straight" | "jagged" | "zigzag" | "wavy",
  includeCaptions?: boolean
): Promise<string>
```

**Add border/caption context to prompt:**
```typescript
${borderStyle && outputFormat === "strip" ? `BORDER STYLE: This panel will be part of a comic strip with ${borderStyle} borders. Leave appropriate margin space on the edge.` : ""}

${includeCaptions && outputFormat === "separate" ? `CAPTION: The text "${script.dialogue}" will also be displayed as a caption below the panel. Ensure the panel works well with external text.` : ""}
```

---

## Phase 10: Character Consistency Fix

Extract character reference from source image before panel generation.

### Tasks

- [ ] Create `extractCharacterReferenceFromSource` function
- [ ] Update `generateComic` to extract reference before generating panels
- [ ] Store character reference in database

### Technical Details

**File:** `src/lib/comic-generator.ts`

**Add new function (after line 163):**
```typescript
async function extractCharacterReferenceFromSource(
  sourceImageUrl: string
): Promise<string> {
  const model = getModel(GEMINI_VISION_MODEL);

  const prompt = `Analyze this image and provide a detailed character reference for comic creation.

If there are characters/people in the image, describe:
1. Main character(s) appearance (hair, clothing, features, age, gender)
2. Facial features and expressions
3. Body proportions and poses
4. Clothing style and accessories
5. Art style characteristics

If there are no characters, describe:
1. The overall visual style
2. Color palette
3. Key visual elements that should be consistent

This reference will be used to maintain visual consistency across all comic panels.
Respond in JSON format: { "characterReference": "detailed description" }`;

  let fullUrl = sourceImageUrl;
  if (sourceImageUrl.startsWith("/uploads/")) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    fullUrl = `${baseUrl}${sourceImageUrl}`;
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
      return parsed.characterReference || "";
    }
  } catch (e) {
    console.error("Failed to parse character reference:", e);
  }

  return "";
}
```

**Update generateComic to call this function (before panel generation loop):**
```typescript
// Step 3.5: Extract character reference from source image BEFORE generating panels
let characterReference = "";
if (inputType === "image") {
  characterReference = await extractCharacterReferenceFromSource(inputUrl);
  await db.update(comics).set({ characterReference }).where(eq(comics.id, comicId));
}
```

---

## Phase 11: Dashboard Subject Filtering

Add subject filtering to the user dashboard.

### Tasks

- [ ] Add `selectedSubject` state to dashboard
- [ ] Extract unique subjects from user's comics
- [ ] Render filter buttons for each subject
- [ ] Filter comics grid by selected subject

### Technical Details

**File:** `src/app/dashboard/page.tsx`

**Add state (after line 14):**
```typescript
const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
```

**Extract unique subjects (after comics data):**
```typescript
const uniqueSubjects = Array.from(
  new Set(comics.flatMap((c) => c.tags || [c.subject]))
).sort();
```

**Add filter UI (before grid):**
```typescript
{uniqueSubjects.length > 0 && (
  <div className="mb-6">
    <div className="flex flex-wrap gap-2">
      <Button
        variant={selectedSubject === null ? "default" : "outline"}
        size="sm"
        onClick={() => setSelectedSubject(null)}
      >
        All Subjects
      </Button>
      {uniqueSubjects.map((subject) => (
        <Button
          key={subject}
          variant={selectedSubject === subject ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedSubject(subject)}
        >
          {subject}
        </Button>
      ))}
    </div>
  </div>
)}
```

**Filter comics:**
```typescript
{comics
  .filter((c) => {
    if (!selectedSubject) return true;
    return (c.tags || [c.subject]).includes(selectedSubject);
  })
  .map((comic) => (
    <ComicCard key={comic.id} {...comic} />
  ))}
```

---

## Phase 12: Gallery Filters Update

Support dynamic subject list in gallery filters.

### Tasks

- [ ] Add `subjects` prop to `GalleryFilters` component
- [ ] Use dynamic subjects instead of hardcoded list

### Technical Details

**File:** `src/components/gallery/filters.tsx`

**Update interface (line 6):**
```typescript
interface GalleryFiltersProps {
  subjects?: string[];
}
export function GalleryFilters({ subjects = PREDEFINED_SUBJECTS }: GalleryFiltersProps) {
```

---

## Phase 13: Lint and Typecheck

Run linting and type checking to ensure all changes are valid.

### Tasks

- [ ] Run ESLint to check for code quality issues
- [ ] Run TypeScript type checking

### Technical Details

**CLI commands:**
```bash
pnpm run lint
pnpm run typecheck
```

---

## Phase 14: End-to-End Testing

Manual testing of all new features and fixes.

### Tasks

- [ ] Test creation with each new art style (4 styles)
- [ ] Test creation with each new tone (3 tones)
- [ ] Test border style selection (strip format)
- [ ] Test captions toggle (separate panels format)
- [ ] Test subject dropdown with "Other" option
- [ ] Test export with all page sizes (verify PDF dimensions)
- [ ] Test captions export (separate panels only)
- [ ] Test publish button on comic view page
- [ ] Test dashboard subject filtering
- [ ] Test character consistency with image uploads
- [ ] Verify text readability in generated comics

### Technical Details

**Manual test checklist:**
1. Create comic → select Noir style → verify generation works
2. Create comic → select Adventure tone → verify generation works
3. Create comic → select Strip format → select Jagged border → verify in prompt
4. Create comic → select Separate panels → enable Show Captions → verify captions display
5. Create comic → select "Other" subject → enter custom value → verify it saves
6. Generate comic → export PDF with Letter size → verify PDF is 11x8.5 inches
7. Generate comic → export PDF with A4 size → verify PDF is A4 dimensions
8. View separate panels comic → export "With captions" → verify captions in PDF
9. View strip comic → verify "With captions" option does NOT appear
10. View own comic → click publish button → verify status toggles
11. Dashboard → click subject filter → verify grid filters
12. Upload image → generate comic → verify character consistency
13. Generate comic → inspect speech bubbles → verify text is readable
