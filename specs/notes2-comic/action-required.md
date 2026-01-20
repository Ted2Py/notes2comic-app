# Action Required: Notes2Comic

Manual steps that must be completed by a human before, during, and after implementation.

## Before Implementation

- [ ] **Create Google Cloud Project** - Required for Vertex AI and Gemini API access
  - Go to https://console.cloud.google.com/
  - Create a new project or select existing
  - Enable the following APIs:
    - Vertex AI API
    - Cloud Storage API (if using GCS for storage)
    - Cloud Speech-to-Text API (for video processing)

- [ ] **Generate Gemini API Key** - Required for AI generation
  - Go to https://console.cloud.google.com/apis/credentials
  - Create an API key with appropriate restrictions
  - Save the key for environment variable

- [ ] **Enable Billing on Google Cloud** - Required for Vertex AI usage
  - Go to https://console.cloud.google.com/billing
  - Link a billing account to your project
  - Set up budget alerts if needed

- [ ] **Configure OAuth for Google Sign-In** - Required for Google OAuth authentication
  - Go to https://console.cloud.google.com/apis/credentials
  - Create OAuth 2.0 credentials
  - Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (dev)
  - Add production URI when deployed

- [ ] **Set up PostgreSQL Database** - Required for data persistence
  - Set up local PostgreSQL or use a cloud provider (Neon, Supabase, etc.)
  - Get the connection URL

## During Implementation

- [ ] **Configure Environment Variables** - Required for app to function
  - Copy `.env.example` to `.env`
  - Fill in all required values:
    - `POSTGRES_URL` - Database connection string
    - `BETTER_AUTH_SECRET` - Generate a 32-character random string
    - `GOOGLE_CLOUD_PROJECT_ID` - Your Google Cloud project ID
    - `GOOGLE_CLOUD_LOCATION` - Default: `us-central1`
    - `GEMINI_API_KEY` - Your generated API key
    - `NEXT_PUBLIC_APP_URL` - `http://localhost:3000` for dev

- [ ] **Run Database Migrations** - Required for database schema
  - After Phase 1 implementation, run:
    ```bash
    npm run db:generate
    npm run db:migrate
    ```

- [ ] **Install Dependencies** - Required for all features to work
  - Run the install command from Phase 2:
    ```bash
    pnpm add @google-cloud/vertexai @google-cloud/storage pdf-parse react-dropzone framer-motion react-confetti jspdf html2canvas
    pnpm remove @openrouter/ai-sdk-provider
    ```

## After Implementation

- [ ] **Test Google Cloud Connection** - Verify AI integration works
  - Verify environment variables are set correctly
  - Test a simple comic generation
  - Check Google Cloud console for API usage

- [ ] **Configure Production Domain** - For deployment
  - Add production domain to OAuth allowed origins
  - Update `NEXT_PUBLIC_APP_URL` in production
  - Configure production database connection

- [ ] **Set Up Vercel Blob Storage** - For production file storage
  - If deploying to Vercel, create a Blob storage account
  - Add `BLOB_READ_WRITE_TOKEN` to production environment variables
  - Test file upload/download in production

- [ ] **Set Usage Budget Alerts** - For cost management
  - Google Cloud: Set budget alerts in billing section
  - Monitor API usage patterns
  - Consider implementing rate limiting for cost control

- [ ] **Configure Google OAuth for Production** - Required for production auth
  - Add production domain to OAuth authorized origins
  - Add production redirect URI: `https://yourdomain.com/api/auth/callback/google`
  - Update OAuth consent screen if needed

---

## Optional Setup

- [ ] **Enable Video Processing** - For full video input support
  - Set up Google Cloud Speech-to-Text API
  - Install ffmpeg for frame extraction (if processing server-side)
  - Test video upload and processing flow

- [ ] **Set Up Monitoring** - For production reliability
  - Configure error tracking (Sentry, etc.)
  - Set up logging (Google Cloud Logging)
  - Configure uptime monitoring

- [ ] **Customize Branding** - For a polished product
  - Update app metadata in `app/layout.tsx`
  - Customize logo and favicon
  - Update landing page copy if needed

---

> **Note:** These tasks are also listed in context within `implementation-plan.md`
