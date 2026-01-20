# Requirements: Notes2Comic

## Overview

Transform an existing Next.js 16 AI boilerplate into a production-ready Notes-to-Comic application that converts educational content (notes, PDFs, images, videos) into engaging comic strips using Google Cloud Gemini AI.

## Problem Statement

Students are overwhelmed with dense educational materials. While information is abundant, comprehension and retention are poor due to:

- Passive learning formats
- Cognitive overload from long text
- Low engagement with traditional study tools

Educational research shows that visual storytelling and multimodal learning improve understanding and long-term memory. However, creating visual study material is time-consuming and inaccessible to most students.

## Solution

Notes-to-Comic is an AI-powered web app that converts educational inputs into customizable comic strips that explain concepts visually.

**Supported Inputs:**
- Text notes
- PDF documents
- Images of handwritten notes
- Short educational videos (MVP)

**Output:**
- Structured comic strips with panels
- Characters, dialogue, and visual metaphors
- Customizable art styles and tones

## Target Users

**Primary:**
- Middle school, high school, and early college students
- Visual learners
- Students studying STEM, history, and concept-heavy subjects

**Secondary:**
- Teachers creating supplementary material
- Tutors
- Self-learners

## Functional Requirements

### Core Features (MVP)

1. **Authentication**
   - Email/password sign up and login
   - Google OAuth integration
   - Email verification
   - Password reset flow

2. **File Upload**
   - Support for text input, PDF, images (PNG, JPG, WEBP), and videos (MP4, MOV)
   - Drag & drop interface
   - File size validation (max 10MB)
   - Preview thumbnails

3. **Comic Generation**
   - AI-powered content analysis and summarization
   - Panel script generation with dialogue
   - Comic-style image generation per panel
   - Progress tracking during generation
   - Support for text, PDF, image, and video inputs

4. **Comic Customization**
   - Art style selection: retro, manga, minimal, pixel
   - Tone selection: funny, serious, friendly
   - Character selection: student, teacher, mascot
   - Color palette presets
   - Regenerate individual panels or entire comic

5. **Dashboard**
   - Grid view of user's comics
   - Generation status indicators
   - Quick actions: edit, delete, share

6. **Public Gallery**
   - Browse publicly shared comics
   - Filter by subject and popularity
   - Like and comment on comics
   - Share functionality

7. **PDF Export**
   - Export comics to PDF format
   - Include title and metadata
   - Optional watermark for public comics

8. **Settings**
   - Optional user-provided Google Cloud credentials
   - Usage statistics
   - Comic management (bulk delete, export)

## Non-Functional Requirements

### Security
- API keys stored encrypted at rest
- Server-side only AI API calls
- File upload validation and size limits
- Rate limiting on generation endpoints
- Content moderation for public gallery

### Performance
- Lazy loading for gallery images
- Pagination for dashboard and gallery
- Async generation with status tracking
- Optimized image serving

### Accessibility
- High contrast mode support
- Alt text for generated panels
- Keyboard navigation
- Semantic HTML structure

### UI/UX
- Retro color palette (pastels + bold accents)
- Thick outlines and rounded cards
- Panel slide-in animations
- Loading comic strip animation
- Hover effects on interactive elements
- Smooth page transitions

## Technical Stack

### Frontend
- Next.js 16 with App Router
- React 19
- TypeScript
- Tailwind CSS 4 with dark mode
- shadcn/ui components
- Framer Motion for animations

### Backend
- Next.js API Routes (App Router)
- PostgreSQL database
- Drizzle ORM

### AI/ML
- Google Cloud Vertex AI with Gemini models
- `gemini-2.5-pro-preview-03625` for content analysis
- `gemini-2.0-flash-exp` for fast responses
- `gemini-3-pro-image-preview` for image generation
- `gemini-2.5-pro-vision` for OCR

### Authentication
- BetterAuth
- Email/password + Google OAuth

### File Storage
- Development: Local filesystem (`public/uploads/`)
- Production: Vercel Blob storage

### PDF Export
- jsPDF for PDF generation
- html2canvas for DOM-to-canvas conversion

## User Flow

1. **Landing** → User sees value proposition and CTA
2. **Sign Up/Login** → User creates account or signs in
3. **Dashboard** → User clicks "Create New Comic"
4. **Upload** → User uploads notes (text/PDF/image/video)
5. **Configure** → User selects subject, length, style, tone
6. **Generate** → AI processes input and generates comic
7. **Customize** → User tweaks style, regenerates panels if needed
8. **Save/Publish** → User saves privately or publishes to gallery
9. **Export** → User can export to PDF

## Acceptance Criteria

A user can:
- [ ] Sign up with email/password or Google OAuth
- [ ] Upload text, PDF, image, or video files
- [ ] Generate a comic from uploaded content
- [ ] Customize the comic's art style and tone
- [ ] Regenerate individual panels or the entire comic
- [ ] Save comics to their dashboard
- [ ] Publish comics to the public gallery
- [ ] Browse, like, and comment on public comics
- [ ] Export comics to PDF
- [ ] View generation progress in real-time

## Dependencies

### External Services
- Google Cloud Project with Vertex AI API enabled
- Gemini API access
- Google Cloud Speech-to-Text API (for video processing)
- Vercel Blob storage (production only)

### npm Packages
- `@google-cloud/vertexai`
- `@google-cloud/storage`
- `pdf-parse`
- `framer-motion`
- `react-confetti`
- `jspdf`
- `html2canvas`
- `ffmpeg` or `@ffmpeg/ffmpeg` (for video processing)

### Database Tables (New)
- `comics` - Stores generated comics
- `panels` - Individual comic panels
- `likes` - Gallery likes
- `comments` - Gallery comments

## Stretch Features (Post-MVP)

- Teacher accounts with special features
- Advanced analytics dashboard
- Mobile app
- Collaborative editing
- AI chat assistant for comic interaction
- Batch processing multiple files
- Custom character creation
- Animated comic panels
- Comic templates library
