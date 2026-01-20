# Requirements: Gallery Improvements

## Overview

Improve the public gallery page with enhanced visual design, add public/private toggle functionality for comics, and display creation dates on gallery cards.

## Motivation

The current gallery page is functional but lacks visual polish. Users cannot control whether their comics appear in the public gallery, and creation dates are not displayed. This feature enhances user control over comic visibility and improves the gallery browsing experience.

## User Stories

1. **As a comic creator**, I want to control whether my comic appears in the public gallery so I can keep personal drafts private
2. **As a comic creator**, I want to easily toggle my comic's visibility from the dashboard, edit page, or after creation
3. **As a gallery visitor**, I want to see when comics were created so I can discover newer content
4. **As a gallery visitor**, I want a more visually appealing gallery with better loading states and navigation

## Acceptance Criteria

### Public/Private Toggle

- [ ] Create page includes a "Make Public" toggle (default: private)
- [ ] Comic editor includes visibility toggle
- [ ] Dashboard shows public/private badge on each comic card
- [ ] Dashboard includes quick toggle button for visibility
- [ ] Gallery API only returns comics where `isPublic = true`
- [ ] Toggle state persists to database

### Gallery Date Display

- [ ] Creation date appears on each gallery card
- [ ] Dates use relative format (e.g., "2 days ago", "Just now")
- [ ] Date updates appropriately over time

### Visual Enhancements

- [ ] Gallery cards have hover effects (scale, shadow)
- [ ] Skeleton loading state while fetching comics
- [ ] Pagination controls for browsing multiple pages
- [ ] Improved empty state with call-to-action
- [ ] Enhanced filter button styling with active states

## Technical Requirements

- Use existing `isPublic` field in `comics` table (already exists)
- Use existing `createdAt` field in `comics` table (already exists)
- Add shadcn/ui Switch component for toggles
- Add date formatting utility for relative time
- Maintain existing API structure
- Support both light and dark modes

## Dependencies

- shadcn/ui Switch component (to be added)
- framer-motion (already installed - used in ComicCard)
- Existing gallery API structure

## Out of Scope

- User permissions/roles system (all users can toggle their own comics)
- Comic scheduling/publishing at specific times
- Bulk visibility operations
- Visibility analytics/views