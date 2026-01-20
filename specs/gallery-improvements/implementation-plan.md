# Implementation Plan: Gallery Improvements

## Overview

Enhance the gallery page with public/private toggle functionality, creation date display, and visual improvements including hover effects, skeleton loading, and pagination.

## Phase 1: Add Switch Component

### Description

Add the shadcn/ui Switch component which will be used for the public/private toggle throughout the application.

### Tasks

- [x] Install shadcn/ui Switch component

### Technical Details

**CLI Command:**
```bash
pnpm dlx shadcn@latest add switch
```

This will create `src/components/ui/switch.tsx` with the Switch component used for toggles.

---

## Phase 2: Create Page Toggle

### Description

Add public/private toggle to the comic creation flow so users can set visibility when creating a comic.

### Tasks

- [x] Add `isPublic` state to create page (default: `false`)
- [x] Add Switch component to configure step with label "Make Public"
- [x] Pass `isPublic` value to create API in request body
- [x] Update create API to accept optional `isPublic` parameter

### Technical Details

**File:** `src/app/create/page.tsx`

Add state:
```typescript
const [isPublic, setIsPublic] = useState(false);
```

Add Switch component in configure step (around line 260-295):
```tsx
<div className="flex items-center justify-between">
  <div className="space-y-0.5">
    <Label>Make Public</Label>
    <p className="text-xs text-muted-foreground">
      Allow others to see this comic in the gallery
    </p>
  </div>
  <Switch checked={isPublic} onCheckedChange={setIsPublic} />
</div>
```

Update handleGenerate to include `isPublic`:
```typescript
body: JSON.stringify({
  // ... existing fields
  isPublic,
}),
```

**File:** `src/app/api/comics/create/route.ts`

Update line 18 to destructure `isPublic`:
```typescript
const { title, description, inputType, inputUrl, artStyle, tone, subject, outputFormat, pageSize, requestedPanelCount, isPublic } = body;
```

Update line 115 to use the value:
```typescript
isPublic: isPublic ?? false,
```

---

## Phase 3: Comic Editor Visibility Toggle

### Description

Add visibility toggle to the comic editor so users can change comic visibility after creation.

### Tasks

- [x] Add visibility section to comic editor right sidebar
- [x] Add Switch component for public/private toggle
- [x] Add state management for `isPublic` in editor
- [x] Add API call to update `isPublic` when toggled

### Technical Details

**File:** `src/components/comic/comic-editor.tsx`

Add state at top of component:
```typescript
const [isPublic, setIsPublic] = useState(comic.isPublic);
```

Add visibility section to right sidebar (around line 249-267):
```tsx
<div className="p-4 bg-muted/50 rounded space-y-3">
  <p className="font-medium">Visibility</p>
  <div className="flex items-center justify-between">
    <span className="text-sm">Public</span>
    <Switch
      checked={isPublic}
      onCheckedChange={async (checked) => {
        setIsPublic(checked);
        await fetch(`/api/comics/${comic.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPublic: checked }),
        });
      }}
    />
  </div>
  <p className="text-xs text-muted-foreground">
    {isPublic ? "Visible in public gallery" : "Private - only you can see"}
  </p>
</div>
```

---

## Phase 4: Comic API Update for Visibility

### Description

Extend the comic PATCH API to handle `isPublic` updates alongside existing panel updates.

### Tasks

- [x] Update comic PATCH API to handle `isPublic` field
- [x] Validate ownership before updating visibility

### Technical Details

**File:** `src/app/api/comics/[id]/route.ts`

Update line 19 to destructure `isPublic`:
```typescript
const { panels: panelsData, isPublic } = body;
```

After line 44 (after panel updates), add comic visibility update:
```typescript
// Update comic visibility if provided
if (typeof isPublic === "boolean") {
  await db.update(comics)
    .set({ isPublic })
    .where(eq(comics.id, id));
}
```

---

## Phase 5: Dashboard Visibility Toggle

### Description

Add public/private badge and toggle to the dashboard comic cards for quick visibility management.

### Tasks

- [x] Update ComicCard component to accept `isPublic` prop
- [x] Add public/private badge to ComicCard display
- [x] Add quick toggle button to ComicCard actions
- [x] Update dashboard to pass `isPublic` and toggle handler to ComicCard

### Technical Details

**File:** `src/components/comic/comic-card.tsx`

Update props interface (line 10-17):
```typescript
interface ComicCardProps {
  id: string;
  title: string;
  status: "draft" | "generating" | "completed" | "failed";
  thumbnailUrl?: string;
  panelCount?: number;
  isPublic?: boolean;
  onDelete: (id: string) => void;
  onVisibilityToggle?: (id: string, isPublic: boolean) => void;
}
```

Destructure new props in function parameters:
```typescript
export function ComicCard({
  id,
  title,
  status,
  thumbnailUrl,
  panelCount,
  isPublic,
  onDelete,
  onVisibilityToggle,
}: ComicCardProps) {
```

Add visibility badge and toggle button in the actions section (around line 78-93):
```typescript
{onVisibilityToggle && (
  <Button
    variant="ghost"
    size="sm"
    onClick={() => onVisibilityToggle(id, !isPublic)}
    title={isPublic ? "Make private" : "Make public"}
  >
    {isPublic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
  </Button>
)}
```

Add visibility indicator badge:
```typescript
{isPublic !== undefined && (
  <Badge variant={isPublic ? "default" : "secondary"}>
    {isPublic ? "Public" : "Private"}
  </Badge>
)}
```

**File:** `src/app/dashboard/page.tsx`

Add toggle handler:
```typescript
const handleVisibilityToggle = async (id: string, isPublic: boolean) => {
  try {
    const response = await fetch(`/api/comics/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic }),
    });
    if (response.ok) {
      setComics(comics.map((c) => (c.id === id ? { ...c, isPublic } : c)));
    }
  } catch (error) {
    console.error("Failed to update visibility:", error);
  }
};
```

Update ComicCard usage (line 91-97):
```typescript
<ComicCard
  key={comic.id}
  {...comic}
  thumbnailUrl={comic.panels?.[0]?.imageUrl}
  panelCount={comic.metadata?.panelCount}
  isPublic={comic.isPublic}
  onDelete={handleDelete}
  onVisibilityToggle={handleVisibilityToggle}
/>
```

Add icon imports:
```typescript
import { Eye, EyeOff } from "lucide-react";
```

---

## Phase 6: Date Formatting Utility

### Description

Create a utility function for formatting dates as relative time (e.g., "2 days ago").

### Tasks

- [x] Create date formatting utility in `src/lib/date.ts`
- [x] Implement relative time function

### Technical Details

**File:** `src/lib/date.ts` (new file)

```typescript
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
  return `${Math.floor(seconds / 31536000)}y ago`;
}
```

---

## Phase 7: Gallery Date Display

### Description

Display creation dates on gallery cards using the relative time formatting.

### Tasks

- [x] Import and use `formatRelativeTime` utility in gallery grid
- [x] Add creation date display to gallery cards

### Technical Details

**File:** `src/components/gallery/gallery-grid.tsx`

Import the utility:
```typescript
import { formatRelativeTime } from "@/lib/date";
```

Add date display in the card footer (around line 86-92):
```typescript
<div className="flex items-center justify-between w-full text-sm text-muted-foreground">
  <span>{comic.metadata?.panelCount || 0} panels</span>
  <span>{formatRelativeTime(comic.createdAt)}</span>
</div>
```

---

## Phase 8: Gallery Visual Enhancements

### Description

Improve gallery card visuals with hover effects, skeleton loading, and better styling.

### Tasks

- [x] Add skeleton loading state using existing Skeleton component
- [x] Add hover effects (scale, shadow) to gallery cards
- [x] Add gradient overlay on images for better text readability
- [x] Improve card spacing and layout

### Technical Details

**File:** `src/components/gallery/gallery-grid.tsx`

Import Skeleton component:
```typescript
import { Skeleton } from "@/components/ui/skeleton";
```

Replace loading state with skeleton (around line 43-49):
```typescript
if (loading) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="w-full h-48" />
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

Add hover effects to Card component (line 62):
```typescript
<Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
```

Add gradient overlay on image (line 64-76):
```typescript
<Link href={`/comics/${comic.id}`} className="relative block group">
  {comic.panels?.[0]?.imageUrl ? (
    <>
      <img
        src={comic.panels[0].imageUrl}
        alt={comic.title}
        className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </>
  ) : (
    <div className="w-full h-48 bg-muted flex items-center justify-center">
      <span className="text-muted-foreground">No preview</span>
    </div>
  )}
</Link>
```

---

## Phase 9: Gallery Pagination

### Description

Add pagination controls to the gallery page for browsing through multiple pages of comics.

### Tasks

- [ ] Create pagination component
- [ ] Add pagination state to gallery page
- [ ] Integrate pagination with existing page-based API
- [ ] Add page navigation buttons

### Technical Details

**File:** `src/components/gallery/pagination.tsx` (new file)

```typescript
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

export function Pagination({ currentPage, totalPages }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/gallery?${params.toString()}`);
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <Button
        variant="outline"
        size="sm"
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

**File:** `src/app/gallery/page.tsx`

Update to fetch and pass pagination data:
```typescript
const response = await fetch(`/api/gallery?${params.toString()}`);
if (response.ok) {
  const data = await response.json();
  setComics(data.comics || []);
  setPagination(data.pagination || { page: 1, totalPages: 1 });
}
```

**File:** `src/components/gallery/gallery-grid.tsx`

Update component to accept and display pagination:
```typescript
interface GalleryGridProps {
  page: number;
  subject?: string | null;
  sort?: string | null;
}

export function GalleryGrid({ page, subject, sort }: GalleryGridProps) {
  const [comics, setComics] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  // ... rest of component
```

Add Pagination component at the end of the component return:
```typescript
{comics.length > 0 && (
  <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} />
)}
```

---

## Phase 10: Improved Empty State

### Description

Enhance the empty state in the gallery with a better message and call-to-action.

### Tasks

- [ ] Improve empty state message and styling
- [ ] Add call-to-action button to create first comic

### Technical Details

**File:** `src/components/gallery/gallery-grid.tsx`

Update empty state (around line 51-57):
```typescript
{comics.length === 0 && !loading && (
  <div className="text-center py-16">
    <div className="text-6xl mb-4">🎨</div>
    <h3 className="text-xl font-semibold mb-2">No public comics yet</h3>
    <p className="text-muted-foreground mb-6">
      Be the first to share your comic with the community!
    </p>
    <Button asChild>
      <Link href="/create">Create Your First Comic</Link>
    </Button>
  </div>
)}
```

Add Link import if not present:
```typescript
import Link from "next/link";
```

---

## Phase 11: Enhanced Filter Styling

### Description

Improve the visual styling of gallery filter buttons with better spacing and active states.

### Tasks

- [ ] Update filter button styling with better spacing
- [ ] Add smooth transitions to active states
- [ ] Improve visual hierarchy between subject and sort filters

### Technical Details

**File:** `src/components/gallery/filters.tsx`

Update the return JSX (line 39-71):
```tsx
return (
  <div className="mb-8 space-y-6">
    <div>
      <h3 className="text-sm font-medium mb-3 text-muted-foreground">Filter by Subject</h3>
      <div className="flex flex-wrap gap-2">
        {subjects.map((subject) => (
          <Button
            key={subject}
            variant={currentSubject === subject || (subject === "All" && !currentSubject) ? "default" : "outline"}
            size="sm"
            onClick={() => handleSubjectChange(subject)}
            className="transition-all duration-200"
          >
            {subject}
          </Button>
        ))}
      </div>
    </div>

    <div>
      <h3 className="text-sm font-medium mb-3 text-muted-foreground">Sort By</h3>
      <div className="flex gap-2">
        <Button
          variant={currentSort === "recent" ? "default" : "outline"}
          size="sm"
          onClick={() => handleSortChange("recent")}
          className="transition-all duration-200"
        >
          Most Recent
        </Button>
        <Button
          variant={currentSort === "popular" ? "default" : "outline"}
          size="sm"
          onClick={() => handleSortChange("popular")}
          className="transition-all duration-200"
        >
          Most Popular
        </Button>
      </div>
    </div>
  </div>
);
```

---

## Verification

After all phases complete, verify:

1. **Create Flow**: Create comic with "Public" ON → appears in gallery
2. **Create Flow**: Create comic with "Public" OFF → does NOT appear in gallery
3. **Edit Flow**: Toggle visibility from edit page → gallery updates
4. **Dashboard Flow**: Toggle visibility from dashboard → gallery updates
5. **Gallery Display**: Dates show as "2 days ago", "Just now", etc.
6. **Gallery Visuals**: Hover effects, skeleton loading, pagination work
7. **Lint**: `pnpm run lint` passes
8. **Typecheck**: `pnpm run typecheck` passes
