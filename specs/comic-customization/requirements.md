# Requirements: Comic Customization Features

## Overview

Enhance the notes-to-comic creation experience with advanced customization options, giving users control over output format, panel count, character consistency, speech bubbles, and post-generation editing capabilities.

## Feature Description

### 1. Output Format Selection

Users can choose how their comic is rendered:

- **Comic Strip**: Panels connected with visual borders like a traditional newspaper comic
- **Separate Panels**: Individual standalone images that can be downloaded/viewed separately
- **Full Page**: A single combined image with all panels arranged in a grid layout

**Acceptance Criteria:**
- [ ] User can select format during creation (Step 2: Configure)
- [ ] Default format is "separate panels"
- [ ] Visual preview shows selected format style
- [ ] Generated comic displays in selected format
- [ ] Format can be changed after generation (via editor)

### 2. Panel Count Selection

Users can specify exactly how many comic panels to generate (1-12), overriding the AI's suggestion.

**Acceptance Criteria:**
- [ ] User can select panel count from 1-12 during creation
- [ ] AI suggestion is displayed for reference
- [ ] Content is adapted to fit requested panel count
- [ ] Generation completes with exact number of panels requested
- [ ] Validation prevents counts outside 1-12 range

### 3. Text Boxes

Each panel includes a text box that displays the scene setting, explanation, or context (separate from dialogue in speech bubbles).

**Acceptance Criteria:**
- [ ] Each panel has a text box field
- [ ] Text box content is generated from scene description
- [ ] Text box is editable in the post-generation editor
- [ ] Text box displays below the panel image in view mode
- [ ] Text box is included in exports (PDF/downloads)

### 4. Character Consistency

Characters maintain consistent appearance across all panels through a character reference system.

**Acceptance Criteria:**
- [ ] First panel is analyzed to extract character reference
- [ ] Character reference is stored in the database
- [ ] Subsequent panels use character reference in generation prompts
- [ ] Characters have consistent appearance across panels
- [ ] Character reference is displayed in metadata

### 5. Hybrid Speech Bubbles

Speech bubbles are implemented as a hybrid system: AI generates empty bubble placeholders in images, and HTML/CSS overlays display the actual text for easy editing.

**Acceptance Criteria:**
- [ ] AI generates images with empty speech bubble placeholders
- [ ] Speech bubble text is stored separately in database
- [ ] HTML/CSS overlays display text over bubble positions
- [ ] Bubble positions are customizable (x, y, width, height as percentages)
- [ ] Multiple bubble types supported: dialogue, thought, narration
- [ ] Bubbles are clickable for editing in editor
- [ ] Bubble positions persist across regenerations

### 6. Post-Generation Editor

A dedicated edit page (`/comics/[id]/edit`) allows users to modify their generated comics.

**Acceptance Criteria:**
- [ ] Edit page is accessible only to comic owners
- [ ] Panel list sidebar allows navigation between panels
- [ ] Speech bubbles can be added, edited, and deleted
- [ ] Text boxes can be edited
- [ ] Individual panels can be regenerated (preserving bubbles)
- [ ] Changes are saved manually or with auto-save
- [ ] Unsaved changes warning on navigation
- [ ] Export/download available from editor

## User Stories

### As a creator, I want to choose my comic format
So that I can display my story in the style that best fits my needs (strip for sharing, separate for printing, full page for digital viewing).

### As a creator, I want to control the number of panels
So that I can create short summaries or detailed explanations depending on my needs.

### As a creator, I want characters to look consistent
So that my comic feels professional and polished.

### As a creator, I want speech bubbles I can edit
So that I can fix dialogue mistakes without regenerating the entire image.

### As a creator, I want to add explanatory text boxes
So that viewers understand the context and setting of each scene.

## Dependencies

- **Existing**: Comic generation system (`src/lib/comic-generator.ts`)
- **Existing**: Database schema with `comics` and `panels` tables
- **Existing**: Create page with 3-step wizard flow
- **Existing**: Gemini AI integration for image generation
- **New**: Database migration for new schema fields
- **New**: Multiple new React components
- **New**: New API routes for editing

## Technical Constraints

- Panel count must be between 1-12 (user requirement)
- Speech bubble positions stored as percentages for responsive design
- Character reference stored as text description (not image)
- HTML/CSS bubbles must overlay correctly on all screen sizes
- Editor must handle unsaved changes gracefully
- Regeneration must preserve bubble positions when requested

## Success Metrics

- Users can create comics with all three output formats
- Character consistency improves (measured by regeneration rate)
- Edit time decreases (users can fix text without regenerating)
- User satisfaction with customization options
