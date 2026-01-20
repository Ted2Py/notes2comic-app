# Requirements: Comic Making Refinements

## Overview

This feature refines the comic creation and export experience to address multiple user-reported issues and add new customization options. The improvements focus on consistency, size accuracy, visual customization, and better filtering capabilities.

## Problem Statement

Users are experiencing several issues with the current comic creation flow:

1. **Text boxes are sometimes too small to read** - Speech bubble text is not consistently readable
2. **Selected page size is not applied** - The PDF export ignores the user's page size selection (8.5x11, A4, etc.)
3. **Characters are inconsistent** - Character appearance varies across panels
4. **Captions feature is confusing** - "With captions" option appears for all formats but should only be available for separate panels
5. **Panel spacing is excessive** - Individual panels don't fit the full page as expected
6. **Subject selection is unstructured** - Free text input leads to inconsistent tagging
7. **Limited art styles and tones** - Only 4 styles and 3 tones available
8. **No border style options** - Comic strips cannot have custom borders
9. **Dashboard lacks filtering** - Users cannot filter their comics by subject
10. **No quick publish option** - Publishing a comic requires editing

## Feature Requirements

### 1. Text Box Readability
- Speech bubbles in generated comics must have text that is easily readable
- AI should be prompted to use appropriate font sizes and high contrast
- Bubbles should be sized appropriately for their content

### 2. Page Size Application
- User's selected page size (Letter, A4, Tabloid, A3) must be applied to:
  - The generated comic dimensions
  - The exported PDF dimensions
- Current issue: PDF is hardcoded to A4 regardless of selection

### 3. Character Consistency
- Characters should appear consistent across all panels
- System should extract character reference from source material before generation

### 4. Captions Feature Refinement
- Remove "with captions" export option for strip and fullpage formats
- Keep captions toggle ONLY for separate panels format
- Captions should display speech bubble text below each panel
- Captions setting should be available during comic creation (not just export)

### 5. Panel Spacing
- Individual panels in fullpage format should fit the entire page with no gaps
- Remove spacing between panels for seamless grid layout

### 6. Subject Selection via Dropdown
- Replace free text input with predefined subject dropdown
- Subjects should match gallery tags: Math, Science, History, Literature, Art, Geography, Computer Science
- Include "Other" option with custom text input
- Each comic has a single subject (not multiple tags)

### 7. Expanded Art Styles (4 new)
Add to existing styles (retro, manga, minimal, pixel):
- **Noir** - Dark, dramatic shadows
- **Watercolor** - Soft painted look
- **Anime** - Japanese animation style
- **Pop Art** - Bold, vibrant colors

### 8. Expanded Tones (3 new)
Add to existing tones (funny, serious, friendly):
- **Adventure** - Exciting action-oriented (⚔️)
- **Romantic** - Love and emotion focused (💕)
- **Horror** - Scary/suspenseful tone (👻)

### 9. Comic Strip Border Styles
For strip format only, add border style dropdown with options:
- **Straight** - Clean straight borders
- **Jagged** - Rough torn paper edges
- **Zigzag** - Angular zigzag pattern
- **Wavy** - Flowing wavy borders

### 10. Dashboard Subject Filtering
- Users can filter their comics by subject
- Filter UI matches gallery filter pattern

### 11. Gallery Tag Updates
- Gallery filters should work with the new subject system
- Maintain dynamic subject list from database

### 12. Publish Button on Comic View
- Add prominent publish toggle button on comic view page
- Shows current state (Public/Private) with emoji indicator
- Quick toggle without entering edit mode

### 13. AI Prompt Improvements
- Refine generation prompts to emphasize text readability
- Include border style instructions for strip format
- Include caption context for separate panels format

### 14. Output Format Consistency
- Generated comic dimensions must respect selected output format
- Exported PDF must match generated dimensions

## Acceptance Criteria

### Database Changes
- [ ] New fields added: `borderStyle`, `showCaptions`, `tags`
- [ ] `artStyle` enum expanded to 8 values
- [ ] `tone` enum expanded to 6 values
- [ ] Migration runs successfully

### Create Page
- [ ] Subject dropdown shows predefined options plus "Other"
- [ ] "Other" reveals text input for custom subject
- [ ] Border style selector appears only for strip format
- [ ] Captions toggle appears only for separate panels format
- [ ] All 8 art styles are selectable
- [ ] All 6 tones are selectable

### Comic Generation
- [ ] Generated comics use correct page dimensions
- [ ] Speech bubble text is readable
- [ ] Characters are consistent across panels
- [ ] Border style context is included in AI prompts (strip format)
- [ ] Caption context is included in AI prompts (separate panels)

### Export
- [ ] PDF page size matches user selection (Letter/A4/Tabloid/A3)
- [ ] "With captions" option only appears for separate panels format
- [ ] Captions display speech bubble text below panels (separate format only)
- [ ] Strip and fullpage exports have no captions

### Comic View Page
- [ ] Publish button shows for comic owners
- [ ] Button displays current state (🌐 Public / 🔒 Private)
- [ ] Toggle updates visibility immediately

### Dashboard
- [ ] Subject filter shows all unique subjects from user's comics
- [ ] "All Subjects" button resets filter
- [ ] Filter updates grid without page reload

### Gallery
- [ ] Filters work with dynamic subject list
- [ ] Subject badges display correctly on comic cards

## Dependencies

### Internal
- Existing database schema (`src/lib/schema.ts`)
- Comic generator (`src/lib/comic-generator.ts`)
- PDF exporter (`src/lib/pdf-exporter.ts`)
- Create page UI (`src/app/create/page.tsx`)
- Dashboard page (`src/app/dashboard/page.tsx`)

### External
- jsPDF library for PDF generation (already installed)
- Gemini AI API for image generation
- Drizzle ORM for database operations

## Related Features

- Gallery Improvements spec (`specs/gallery-improvements/`)
- Core comic generation (initial implementation)

## Out of Scope

- Multi-subject support (comics have single subject only)
- Visual preview of border styles during creation
- Caption text editing (uses speech bubble text)
- Panel-level caption customization
