import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { comicGenerationJob, panelRegenerationJob } from "@/jobs/comic-generation";

/**
 * Inngest API route handler
 *
 * This route serves the Inngest functions for background job processing.
 * Inngest will call this endpoint to execute jobs.
 *
 * Required Inngest environment variables:
 * - INNGEST_EVENT_KEY: Key for sending events to Inngest
 * - INNGEST_SIGNING_KEY: Key for verifying Inngest webhooks
 *
 * Get these from: https://app.inngest.com/
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [comicGenerationJob, panelRegenerationJob],
});
