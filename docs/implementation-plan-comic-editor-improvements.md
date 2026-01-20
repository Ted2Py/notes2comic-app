# Comic Editor Improvements - Implementation Plan

## Executive Summary

This plan details the implementation of enhanced editing capabilities for the Notes2Comic application, including:
1. **Panel-specific regeneration with full context preservation**
2. **AI-recognized, editable text boxes within comic panels**
3. **Canva-style speech bubble toolbar with full customization**
4. **Free drawing tool with layer management**
5. **Improved, intuitive layout and navigation**

---

## Current State Analysis

### Existing Features
- Three-column editor layout (panel list, main editor, action sidebar)
- Scene description (textBox) editing per panel
- Basic speech bubble CRUD operations
- Panel regeneration with character context preservation
- Auto-save functionality

### Current Limitations
- No visual text box recognition/editing on panels
- Limited bubble customization (only type selection)
- No drawing capabilities
- Basic navigation without visual context
- No Canva-style formatting options

---

## Implementation Plan

## Phase 1: Panel Regeneration with Enhanced Context

### 1.1 Context-Aware Regeneration System

**Goal**: When regenerating a single panel, preserve visual and narrative context from all other panels.

#### Implementation Steps

1. **Create Context Builder Utility** (`src/lib/comic-context-builder.ts`)
   ```typescript
   export interface PanelContext {
     panelNumber: number;
     sceneDescription: string;
     imageUrl: string;
     speechBubbles: SpeechBubble[];
     bubblePositions: BubblePosition[];
     extractedText?: string; // AI-recognized text from image
   }

   export interface RegenerationContext {
     targetPanel: number;
     allPanels: PanelContext[];
     characterReferences: string[];
     comicStyle: string;
     comicTone: string;
     narrativeContinuity: string; // Generated story summary
   }
   ```

   - Function: `buildRegenerationContext(comicId: string, targetPanel: number)`
   - Aggregates all panel data into context structure
   - Generates narrative continuity summary using AI

2. **Update Regeneration API** (`src/app/api/comics/[id]/regenerate/route.ts`)
   - Modify to accept and use full comic context
   - Include adjacent panels (before/after) in prompt
   - Pass narrative continuity to AI model

3. **Enhanced Prompt Generation** (`src/lib/comic-generator.ts`)
   ```typescript
   function generatePanelRegenerationPrompt(
     context: RegenerationContext
   ): string {
     return `You are generating panel ${context.targetPanel} of a comic.

     COMIC CONTEXT:
     - Style: ${context.comicStyle}
     - Tone: ${context.comicTone}

     NARRATIVE FLOW:
     ${context.narrativeContinuity}

     PREVIOUS PANEL (${context.targetPanel - 1}):
     ${this.formatPanelContext(context.allPanels[context.targetPanel - 2])}

     NEXT PANEL (${context.targetPanel + 1}):
     ${this.formatPanelContext(context.allPanels[context.targetPanel])}

     TARGET PANEL REQUIREMENTS:
     ${this.formatTargetPanel(context.allPanels[context.targetPanel - 1])}

     Generate this panel maintaining visual consistency and narrative flow.`;
   }
   ```

4. **Update Comic Editor UI** (`src/components/comic/comic-editor.tsx`)
   - Add "Regenerate with Context" option
   - Show loading state with context preview
   - Display adjacent panel thumbnails during regeneration

### 1.2 Database Schema Updates

**File**: `src/lib/schema.ts`

Add new fields to `panels` table:
```typescript
contextSnapshot: pgTable("panels_context_snapshot", {
  id: serial("id").primaryKey(),
  panelId: integer("panel_id")
    .references(() => panels.id)
    .notNull(),
  snapshotType: text("snapshot_type").notNull(), // 'before_regeneration', 'after_regeneration'
  data: jsonb("data").notNull(), // Stores full panel context
  createdAt: timestamp("created_at").defaultNow(),
});
```

---

## Phase 2: AI-Recognized Editable Text Boxes

### 2.1 Text Detection and Extraction

**Goal**: Detect and recognize text/speech bubbles within generated comic images, making them editable.

#### Implementation Steps

1. **Create Text Recognition Service** (`src/lib/text-recognition.ts`)
   ```typescript
   export interface DetectedTextBox {
     id: string;
     text: string;
     boundingBox: {
       x: number;  // Percentage 0-100
       y: number;
       width: number;
       height: number;
     };
     confidence: number;
     type: "dialogue" | "thought" | "narration" | "unknown";
   }

   export async function detectTextBoxes(
     imageUrl: string
   ): Promise<DetectedTextBox[]> {
     // Use Google Cloud Vision API or similar
     // Return detected text regions with positions
   }
   ```

2. **Integrate Detection into Generation**
   - After panel image generation, run text detection
   - Store detected boxes in panel metadata
   - Create editable overlays on image

3. **Create Editable Text Box Component** (`src/components/comic/editable-text-box.tsx`)
   ```typescript
   interface EditableTextBoxProps {
     textBox: DetectedTextBox;
     onUpdate: (id: string, newText: string) => void;
     onDelete: (id: string) => void;
     editable: boolean;
   }
   ```

   - Renders as overlay div on panel image
   - Click-to-edit functionality
   - Visual indicator (border highlight) when editable
   - Delete button on hover

4. **Text Box Editing Toolbar**
   - Font family selection
   - Font size slider
   - Color picker (text, background, border)
   - Alignment options (left, center, right)
   - Bold/italic/underline toggles

### 2.2 Database Schema for Text Boxes

**File**: `src/lib/schema.ts`

```typescript
detectedTextBoxes: pgTable("detected_text_boxes", {
  id: serial("id").primaryKey(),
  panelId: integer("panel_id")
    .references(() => panels.id)
    .notNull(),
  text: text("text").notNull(),
  x: integer("x").notNull(),       // Percentage position
  y: integer("y").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  type: text("type").notNull(),     // dialogue, thought, narration
  confidence: real("confidence"),
  style: jsonb("style"),            // Font, color, size customization
  createdAt: timestamp("created_at").defaultNow(),
});
```

### 2.3 Image Regeneration with Text

**API Route**: `src/app/api/comics/[id]/regenerate-with-text/route.ts`

- Accepts panel ID and updated text boxes
- Uses inpainting or regeneration to update image with new text
- Preserves visual style while updating text content

---

## Phase 3: Canva-Style Speech Bubble Toolbar

### 3.1 Enhanced Bubble Types

**File**: `src/lib/schema.ts`

Update speech bubble types:
```typescript
export type BubbleType =
  | "dialogue"        // Standard speech bubble
  | "thought"         // Cloud/bubble shape
  | "narration"       // Rectangle box
  | "shout"           // Jagged/spiky bubble
  | "whisper"         // Dotted outline bubble
  | "radio"          // Zigzag/tail bubble
  | "icy"            // Icicle-shaped
  | "round"          // Perfect circle
  | "boxed"          // Square with rounded corners;
```

### 3.2 Bubble Customization Options

**Create**: `src/components/comic/bubble-customizer.tsx`

```typescript
interface BubbleStyle {
  // Shape & Size
  type: BubbleType;
  width: number;        // Percentage
  height: number;       // Percentage
  cornerRadius: number; // Pixels

  // Appearance
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  opacity: number;

  // Typography
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: "normal" | "italic";
  textAlign: "left" | "center" | "right";
  textColor: string;
  textShadow: string;

  // Tail
  tailEnabled: boolean;
  tailDirection: "top" | "bottom" | "left" | "right" | "none";
  tailPosition: number; // Percentage along edge
  tailLength: number;   // Pixels
  tailWidth: number;    // Pixels at base

  // Effects
  shadow: {
    enabled: boolean;
    blur: number;
    offsetX: number;
    offsetY: number;
    color: string;
  };
}

interface BubbleCustomizerProps {
  bubble: SpeechBubble & { style: BubbleStyle };
  onUpdate: (updates: Partial<BubbleStyle>) => void;
}
```

### 3.3 Toolbar Component Design

**Create**: `src/components/comic/bubble-toolbar.tsx`

Layout:
```
┌─────────────────────────────────────────────────────┐
│ [+ Add Bubble]  [Type ▼]  [Style ▼]  [Delete]      │
├─────────────────────────────────────────────────────┤
│ Shape: ┌───┐ ┌───┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐                  │
│        │ ○ │ │ ◇ │ │■│ │□│ │~│ │✦│                  │
│        └───┘ └───┘ └─┘ └─┘ └─┘ └─┘                  │
├─────────────────────────────────────────────────────┤
│ Size:  ━━●━━━━━━━━━━                                │
│ Position: X ━━━●━━━━━  Y ━────●━━━                  │
├─────────────────────────────────────────────────────┤
│ Fill:  🎨 #FFFFFF  ████▒▒▒▒                         │
│ Border: 🎨 #000000  ━━━━●━━                        │
│ Width:  ━━━●━━━━━━━━                                │
├─────────────────────────────────────────────────────┤
│ Text:  Aa ━━━●━━━━━━  Color: 🎨 #000000            │
│ Font: Comic Sans ▼  B  I  U                         │
│ Align: ◀ ● ▶                                       │
├─────────────────────────────────────────────────────┤
│ Tail:  ✓  Direction: ▼  Length: ━──●━━━━           │
├─────────────────────────────────────────────────────┤
│ Effects: ☑ Shadow  ○ Glow                          │
└─────────────────────────────────────────────────────┘
```

Features:
- Collapsible sections
- Preset styles library
- Undo/Redo support
- Copy/Paste bubble styles
- Layer ordering (bring to front/send to back)

### 3.4 Bubble Rendering Engine

**Update**: `src/components/comic/speech-bubble-overlay.tsx`

- Support for all bubble types with SVG rendering
- Real-time preview during customization
- Drag-and-drop positioning
- Resize handles on corners
- Rotation support (optional)

---

## Phase 4: Free Drawing Tool

### 4.1 Drawing Canvas Layer

**Create**: `src/components/comic/drawing-canvas.tsx`

```typescript
interface DrawingCanvasProps {
  imageUrl: string;
  width: number;
  height: number;
  existingStrokes?: Stroke[];
  onStrokesChange: (strokes: Stroke[]) => void;
  editable: boolean;
}

interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  opacity: number;
  tool: "pen" | "highlighter" | "eraser";
}

interface Point {
  x: number;  // Canvas coordinates
  y: number;
}
```

Features:
- Canvas overlay on top of panel image
- Pressure-sensitive drawing (if device supports)
- Multiple drawing tools
- Undo/Redo for strokes
- Clear canvas option
- Export as transparent PNG

### 4.2 Drawing Toolbar

**Create**: `src/components/comic/drawing-toolbar.tsx`

```
┌────────────────────────────────────────────┐
│ ✏️  🖍️  🧽  ✕  ↶  ↷  🗑️                   │
│ ━━━━●━━━━  Size  Color  Opacity            │
└────────────────────────────────────────────┘
```

Tools:
- **Pen**: Standard drawing
- **Highlighter**: Semi-transparent overlay
- **Eraser**: Remove strokes
- **Color Picker**: Full color spectrum
- **Size Slider**: Stroke width
- **Opacity Slider**: Transparency control

### 4.3 Layer Management

**Create**: `src/lib/drawing-layers.ts`

```typescript
interface DrawingLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: "normal" | "multiply" | "screen" | "overlay";
  strokes: Stroke[];
}

class LayerManager {
  layers: DrawingLayer[] = [];
  activeLayerId: string;

  addLayer(): DrawingLayer;
  deleteLayer(id: string): void;
  reorderLayer(id: string, newIndex: number): void;
  mergeLayers(id1: string, id2: string): DrawingLayer;
  exportAsPNG(): Promise<Blob>;
}
```

### 4.4 Database Schema for Drawings

**File**: `src/lib/schema.ts`

```typescript
drawings: pgTable("panel_drawings", {
  id: serial("id").primaryKey(),
  panelId: integer("panel_id")
    .references(() => panels.id)
    .notNull(),
  layerId: text("layer_id").notNull(),
  strokeData: jsonb("stroke_data").notNull(), // Stroke array
  zIndex: integer("z_index").notNull(),
  visible: boolean("visible").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
```

---

## Phase 5: Improved Layout and Navigation

### 5.1 Redesigned Editor Layout

**Current Layout** (Three columns):
```
[Panel List][Main Editor][Actions]
     64px         flexible        72px
```

**Proposed Layout**:
```
┌────────────────────────────────────────────────────────────────────┐
│ Header: Breadcrumbs | Save | Export | Share | Help                 │
├──────────┬───────────────────────────────────────────┬──────────────┤
│          │                                           │              │
│  Panel   │          Main Editor Area                 │  Properties  │
│  Navigator│                                           │  Panel       │
│          │  ┌─────────────────────────────────┐     │              │
│  ┌────┐  │  │                                 │     │  ┌────────┐  │
│  │01  │  │  │                                 │     │  │ Style  │  │
│  └────┘  │  │         Panel Image             │     │  ├────────┤  │
│  ┌────┐  │  │      + Overlays                 │     │  │ Text   │  │
│  │02  │  │  │                                 │     │  ├────────┤  │
│  └────┘  │  │                                 │     │  │ Bubbles│  │
│  ┌────┐  │  └─────────────────────────────────┘     │  ├────────┤  │
│  │03  │◀─│  ┌─────────────────────────────────┐     │  │Drawing │  │
│  └────┘  │  │  Toolbar (Dockable)             │     │  └────────┘  │
│  ...     │  └─────────────────────────────────┘     │              │
│          │                                           │              │
│ [Add+]   │  Timeline: ◀ ● ● ● ● ● ● ● ● ▶           │              │
└──────────┴───────────────────────────────────────────┴──────────────┘
```

### 5.2 Enhanced Panel Navigator

**Create**: `src/components/comic/panel-navigator.tsx`

Features:
- Grid view (4x3) or strip view
- Thumbnail previews with status indicators
- Drag-and-drop reordering
- Multi-select for batch operations
- Quick actions on hover (duplicate, delete, regenerate)
- Keyboard navigation (arrow keys)
- Panel count display with progress

### 5.3 Properties Panel

**Create**: `src/components/comic/properties-panel.tsx`

Tabbed interface:
1. **Style Tab**
   - Scene description (textBox) with character limit
   - Art style selector (if overriding global)
   - Tone selector
   - Regenerate button with options

2. **Text Tab**
   - List of detected text boxes
   - Add new text box button
   - Text styling controls

3. **Bubbles Tab**
   - List of speech bubbles
   - Add bubble button
   - Bubble style presets

4. **Drawing Tab**
   - Layer management
   - Drawing tool selector
   - Stroke settings

### 5.4 Timeline Navigation

**Create**: `src/components/comic/timeline-navigator.tsx`

- Horizontal timeline showing all panels
- Click to jump to panel
- Scrub for preview
- Play button for auto-advance
- Zoom in/out for panel detail

### 5.5 Keyboard Shortcuts

**Create**: `src/lib/keyboard-shortcuts.ts`

```typescript
export const SHORTCUTS = {
  // Navigation
  "ArrowLeft": "Previous panel",
  "ArrowRight": "Next panel",
  "Home": "First panel",
  "End": "Last panel",

  // Editing
  "Ctrl/Cmd + Z": "Undo",
  "Ctrl/Cmd + Y": "Redo",
  "Ctrl/Cmd + S": "Save",
  "Delete": "Delete selected element",

  // Tools
  "T": "Text tool",
  "B": "Bubble tool",
  "P": "Pen tool",
  "H": "Highlighter",
  "E": "Eraser",
  "V": "Select/Move tool",

  // View
  "+/=": "Zoom in",
  "-": "Zoom out",
  "0": "Fit to screen",
  "F": "Toggle fullscreen",
};
```

---

## Implementation Order

### Sprint 1: Foundation (Week 1-2)
1. Database schema updates (all new tables)
2. Migration generation and application
3. Update types and interfaces
4. Create utility scaffolding

### Sprint 2: Context-Aware Regeneration (Week 2-3)
1. Implement context builder
2. Update regeneration API
3. Enhanced prompt generation
4. UI updates for regeneration with context

### Sprint 3: Text Box Recognition (Week 3-4)
1. Integrate text detection API
2. Create editable text box component
3. Add text box customization toolbar
4. Implement save/load for text boxes

### Sprint 4: Enhanced Speech Bubbles (Week 4-5)
1. Add new bubble types to schema
2. Create bubble customizer component
3. Implement toolbar with all options
4. Update bubble rendering engine

### Sprint 5: Drawing Tool (Week 5-6)
1. Create drawing canvas component
2. Implement drawing toolbar
3. Add layer management
4. Save/load drawings

### Sprint 6: Improved Layout (Week 6-7)
1. Redesign editor layout
2. Create panel navigator
3. Create properties panel
4. Add timeline navigation
5. Implement keyboard shortcuts

### Sprint 7: Polish & Testing (Week 7-8)
1. Performance optimization
2. Cross-browser testing
3. Mobile responsiveness
4. Accessibility audit
5. User testing and feedback integration

---

## Technical Considerations

### Performance
- Lazy load panel images
- Debounce auto-save operations
- Use Web Workers for image processing
- Implement virtual scrolling for panel list
- Cache drawing canvas state

### Browser Compatibility
- Canvas API support required for drawing
- Pointer Events for touch/tablet support
- File System Access API for local saves

### Accessibility
- Keyboard navigation for all tools
- ARIA labels for custom UI elements
- High contrast mode support
- Screen reader announcements for state changes

### Security
- Validate all user inputs on server
- Sanitize text content to prevent XSS
- Rate limit regeneration requests
- Secure file uploads with size limits

---

## API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/comics/[id]/regenerate` | POST | Regenerate panel with context |
| `/api/comics/[id]/detect-text` | POST | Detect text boxes in panel |
| `/api/comics/[id]/text-boxes` | GET/POST/PATCH/DELETE | Manage text boxes |
| `/api/comics/[id]/bubbles` | GET/POST/PATCH/DELETE | Manage speech bubbles |
| `/api/comics/[id]/drawings` | GET/POST/PATCH/DELETE | Manage drawing layers |
| `/api/comics/[id]/export` | POST | Export with all edits |
| `/api/comics/[id]/save` | POST | Save all edits |

---

## Database Migration Summary

New tables to create:
1. `panels_context_snapshot` - Stores regeneration contexts
2. `detected_text_boxes` - AI-recognized text boxes
3. `panel_drawings` - Drawing layer data

Schema updates:
1. `panels` table - Add metadata fields
2. `speechBubbles` array - Add style customization
3. `bubblePositions` array - Add rotation property

---

## Success Criteria

### Must Have
- [ ] Panel regeneration preserves context from other panels
- [ ] Text boxes detected by AI and editable
- [ ] Speech bubbles with full customization (color, size, type)
- [ ] Free drawing tool with undo/redo
- [ ] Improved layout with panel navigator and properties panel

### Should Have
- [ ] Layer management for drawings
- [ ] Keyboard shortcuts for all common actions
- [ ] Timeline navigation
- [ ] Bubble style presets
- [ ] Export with all edits applied

### Could Have
- [ ] Collaborative editing (real-time)
- [ ] Version history for panels
- [ ] AI-powered style suggestions
- [ ] Import/export bubble templates
- [ ] Advanced image filters

---

## Dependencies

### External Services
- **Google Cloud Vision API** - Text detection
- **Google Gemini** - AI generation (already in use)
- **(Optional) Fabric.js** - Advanced canvas manipulation

### npm Packages to Add
```json
{
  "fabric": "^6.0.0",           // Canvas library
  "react-hotkeys-hook": "^4.4.0", // Keyboard shortcuts
  "use-debounce": "^10.0.0",    // Debouncing
  "zustand": "^4.4.0",          // State management
  "react-resizable-panels": "^0.0.50" // Resizable layout
}
```

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Text detection accuracy | High | Provide manual text box creation as fallback |
| Performance with many drawings | High | Implement lazy loading and canvas optimization |
| Mobile drawing experience | Medium | Prioritize touch optimization and simplified UI |
| AI regeneration costs | Medium | Add user quotas and rate limiting |
| Browser compatibility | Low | Focus on modern browsers, provide graceful degradation |

---

## Next Steps

1. **Review and approve** this implementation plan
2. **Set up development branch** for feature work
3. **Begin Sprint 1** with database schema updates
4. **Establish testing protocol** for each feature
5. **Schedule weekly check-ins** for progress review
