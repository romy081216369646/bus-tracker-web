/**
 * API endpoint to trigger batch export/upload jobs
 * PUT /api/admin/batch-jobs/run - run now
 * GET /api/admin/batch-jobs/status - check status
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getScheduler } from "@/lib/batch-scheduler";

/**
 * GET /api/admin/batch-jobs/status
 * Check if batch jobs are enabled and configured
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const scheduler = getScheduler();
    const config = scheduler["config"]; // Access private config

    return NextResponse.json(
      {
        enabled: config.enabled,
        schedule: config.cronSchedule,
        hdfs: {
          host: config.hdfs.host,
          port: config.hdfs.port,
          baseDir: config.hdfs.baseDir,
        },
        uploadMethod: config.uploadMethod,
        status: "configured",
        message: "Batch jobs are ready",
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/batch-jobs/run
 * Manually trigger a batch job
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const scheduler = getScheduler();

    // Run batch job asynchronously
    // Don't wait for completion to avoid timeout
    scheduler.runNow().catch((error) => {
      console.error("Batch job error:", error);
    });

    return NextResponse.json(
      {
        status: "queued",
        message: "Batch job started in background",
        timestamp: new Date().toISOString(),
      },
      { status: 202 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
