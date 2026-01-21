# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Notes-2-Comic is a Next.js application that transforms educational content into visual comics using Google Gemini AI. Users can upload text, PDFs, or images, and the system generates comic strips with customizable art styles, tones, and layouts. Features include a public gallery, social interactions (likes/comments), and an interactive comic editor with speech bubble editing and drawing tools.

## Tech Stack

- **Framework**: Next.js 16 with App Router, React 19, TypeScript
- **AI Integration**: Google Gemini AI (Gemini 2.5 Pro, Flash, Image models) via `@google/generative-ai`
- **Authentication**: BetterAuth with Email/Password and Google OAuth
- **Database**: PostgreSQL with Drizzle ORM
- **UI**: shadcn/ui components with Tailwind CSS 4
- **Storage**: Vercel Blob (production) / local filesystem (development)

## Key Commands

```bash
# Development
pnpm run dev          # Start dev server (DON'T run this yourself - ask user)
pnpm run build        # Build for production (runs db:migrate first)
pnpm run build:ci     # Build without database (for CI/CD pipelines)
pnpm run start        # Start production server

# Code quality (ALWAYS run after changes)
pnpm run lint         # Run ESLint
pnpm run typecheck    # TypeScript type checking
pnpm run check        # Run both lint and typecheck

# Database
pnpm run db:generate  # Generate database migrations
pnpm run db:migrate   # Run database migrations
pnpm run db:push      # Push schema changes to database
pnpm run db:studio    # Open Drizzle Studio (database GUI)
pnpm run db:dev       # Push schema for development
pnpm run db:reset     # Reset database (drop all tables)
```

## Environment Variables

Required (see `env.example`):

```env
# Database
POSTGRES_URL=postgresql://user:password@localhost:5432/db_name

# Better Auth
BETTER_AUTH_SECRET=32-char-random-string

# Google AI (Gemini) - Required for comic generation
GEMINI_API_KEY=your-gemini-api-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# File Storage (optional)
BLOB_READ_WRITE_TOKEN=  # Leave empty for local dev, set for Vercel Blob in production
```

## Project Architecture

### Core Application Structure

```
src/
├── app/                          # Next.js 16 App Router
│   ├── (auth)/                  # Auth route group (login, register, etc.)
│   ├── api/
│   │   ├── auth/[...all]/       # BetterAuth catch-all route
│   │   ├── upload/              # File upload handler
│   │   └── comics/              # Comic CRUD and generation endpoints
│   │       ├── create/          # Create new comic entry
│   │       ├── generate/        # Start AI generation
│   │       ├── [id]/            # Individual comic operations
│   │       │   ├── panels/      # Panel CRUD and regeneration
│   │       │   ├── comments/    # Comments API
│   │       │   ├── like/        # Like/unlike comic
│   │       │   └── export/      # PDF export
│   │       └── route.ts         # List comics
│   ├── create/                  # Comic creation wizard
│   ├── gallery/                 # Public gallery with filters
│   ├── dashboard/               # User dashboard
│   ├── profile/                 # User profile page
│   └── page.tsx                 # Landing page
├── components/
│   ├── auth/                    # Authentication components
│   ├── comic/                   # Comic-specific components (20+ files)
│   │   ├── comic-editor.tsx     # Main editing interface with drawing tools
│   │   ├── comic-viewer.tsx     # Comic display component
│   │   ├── speech-bubble-overlay.tsx # Canva-style bubble editing
│   │   ├── output-format-selector.tsx
│   │   ├── style-selector.tsx
│   │   ├── tone-selector.tsx
│   │   └── panel-count-selector.tsx
│   ├── gallery/                 # Gallery components
│   ├── ui/                      # shadcn/ui components
│   └── upload/                  # File upload handling
└── lib/
    ├── auth.ts                  # BetterAuth server config
    ├── auth-client.ts           # BetterAuth client hooks
    ├── comic-generator.ts       # Main comic generation orchestration
    ├── gemini.ts                # Google AI integration
    ├── image-processor.ts       # Image manipulation (Sharp)
    ├── pdf-extractor.ts         # PDF text extraction
    ├── pdf-exporter.ts          # PDF generation from comics
    ├── comment-moderation.ts    # Comment filtering/censorship
    ├── storage.ts               # File storage abstraction
    ├── db.ts                    # Database connection
    ├── schema.ts                # Drizzle schema
    └── utils.ts                 # Utility functions
```

### Comic Generation Pipeline

The core feature is the AI-powered comic generation in `src/lib/comic-generator.ts`:

1. **Content Extraction** (`extractContent`): Extracts text from uploaded files
   - Text files: Direct reading
   - PDFs: Using `pdf-extractor.ts` (PDF.js + pdfreader)
   - Images: OCR via Gemini Vision (`extractTextFromImage`)

2. **Content Analysis** (`analyzeContent`): Gemini Pro analyzes content and suggests panel count

3. **Panel Script Generation** (`generatePanelScripts`): Creates structured panel descriptions with dialogue

4. **Character Reference Extraction** (`extractCharacterReferenceFromSource`): Extracts character description from source image for consistency

5. **Panel Image Generation** (`generatePanelImage`): Uses Gemini 3 Pro Image Preview
   - Generates 1024x1024 square panels
   - Maintains character consistency across panels
   - Includes speech bubbles with dialogue

6. **Storage**: All images stored via `storage.ts` (local or Vercel Blob)

### Database Schema (`src/lib/schema.ts`)

**Core Tables:**
- `user`: User profiles (BetterAuth)
- `session`, `account`, `verification`: BetterAuth tables
- `comics`: Generated comics with metadata (status, artStyle, tone, etc.)
- `panels`: Individual panels with image URLs, speech bubbles, drawing layers
- `likes`, `comments`, `commentLikes`: Social features

**Key Types:**
- `DetectedTextBox`: AI-recognized text boxes for editable overlays
- `EnhancedSpeechBubble`: Canva-style bubble customization
- `DrawingLayer`, `Stroke`: Canvas drawing tool data

## Critical Implementation Guidelines

### AI Integration (Google Gemini)

- Use `@google/generative-ai` package, NOT OpenAI or OpenRouter
- Import from: `@/lib/gemini.ts`
- Models: `GEMINI_PRO_MODEL`, `GEMINI_FLASH_MODEL`, `GEMINI_IMAGE_MODEL`, `GEMINI_VISION_MODEL`
- All prompts are in `comic-generator.ts` - maintain character consistency instructions

### Authentication

- Server-side: `import { auth } from "@/lib/auth"`
- Client-side: `import { useSession } from "@/lib/auth-client"`
- Get session: `await auth.api.getSession({ headers: await headers() })`

### File Storage

- Import: `import { upload, deleteFile } from "@/lib/storage"`
- Automatically switches between local (dev) and Vercel Blob (production) based on `BLOB_READ_WRITE_TOKEN`
- Local files saved to `public/uploads/`, served at `/uploads/`
- Upload: `await upload(buffer, "filename.png", "folder")`

### Comic Editor Features

The comic editor (`comic-editor.tsx`) supports:
- **Speech Bubble Editing**: Canva-style positioning with enhanced customization
- **AI Text Detection**: `detectTextBoxes()` uses Gemini Vision to find text
- **Drawing Tools**: Canvas-based drawing with layers, strokes
- **Panel Regeneration**: Individual panel updates via `/api/comics/[id]/regenerate`
- **Export**: PDF generation via `pdf-exporter.ts` with multiple page sizes

### API Route Patterns

- All routes in `src/app/api/`
- Use `auth.api.getSession()` for authentication
- Return proper HTTP status codes and JSON responses
- Handle errors with descriptive messages

### Styling

- Use shadcn/ui color tokens: `bg-background`, `text-foreground`, `border-muted`
- Support dark mode with appropriate Tailwind classes
- Use existing components from `@/components/ui/`

## Important Notes

1. **NEVER start the dev server yourself** - ask the user if needed
2. **ALWAYS run `pnpm run lint && pnpm run typecheck` after changes**
3. **All panels are 1024x1024 squares** - layout determined by outputFormat during export
4. **Character consistency** is maintained via characterReference extraction and sequential generation
5. **OCR for images** uses Gemini Vision - requires `GEMINI_API_KEY`
6. **Comment moderation** via `comment-moderation.ts` filters inappropriate content
7. Use `pnpm` as the package manager (see `pnpm-lock.yaml`)
