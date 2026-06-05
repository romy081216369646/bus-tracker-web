/**
 * Initialize batch job scheduler
 * Import this in your Next.js server initialization
 * 
 * Usage in src/app/layout.tsx:
 * 
 * ```typescript
 * import { initBatchScheduler } from '@/lib/init-batch-scheduler';
 * 
 * if (typeof window === 'undefined') {
 *   initBatchScheduler();
 * }
 * ```
 */

import { initializeBatchScheduler } from "./batch-scheduler";

let initialized = false;

export function initBatchScheduler() {
  if (initialized) {
    console.log("ℹ️  Batch scheduler already initialized");
    return;
  }

  try {
    console.log("🔄 Initializing batch scheduler...");
    initializeBatchScheduler();
    initialized = true;
    console.log(
      "✅ Batch scheduler initialized successfully"
    );
  } catch (error) {
    console.error("❌ Failed to initialize batch scheduler:", error);
    // Don't throw - allow app to continue even if scheduler fails
  }
}

export { getScheduler } from "./batch-scheduler";
export type {
  BatchJobConfig,
} from "./batch-scheduler";
