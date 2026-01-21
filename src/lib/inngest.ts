import { Inngest } from "inngest";

/**
 * Inngest client for background job processing
 *
 * Used for long-running tasks like comic generation that would timeout
 * in Vercel's serverless environment (10s hobby, 60s pro limits).
 *
 * Jobs run asynchronously with:
 * - Automatic retries on failure
 * - No execution time limits
 * - Deduplication
 * - Scheduling capabilities
 */
export const inngest = new Inngest({
  id: "notes2comic",
  name: "Notes2Comic",
});
