/**
 * Scheduled batch job - runs daily export & upload to Hadoop
 * Uses node-cron to schedule tasks
 */
import * as cron from "node-cron";
import { performBatchExport, cleanupOldExports } from "./batch-export";
import { HdfsUploader, uploadWithHdfsCommand } from "./hdfs-uploader";
import * as path from "path";

export interface BatchJobConfig {
  enabled: boolean;
  // Cron schedule (default: daily at 2 AM)
  // Format: second minute hour day month day-of-week
  // "0 0 2 * * *" = 2:00 AM every day
  cronSchedule: string;
  hdfs: {
    host: string; // e.g. "10.76.1.41" (your ZeroTier IP)
    port: number; // e.g. 9870 for WebHDFS
    user: string; // e.g. "hdfs"
    baseDir: string; // e.g. "/bus-tracker/exports"
  };
  uploadMethod: "webhdfs" | "hdfs-cli"; // WebHDFS REST API or hdfs command
  cleanupDays: number; // Keep exports for N days
}

export class BatchJobScheduler {
  private config: BatchJobConfig;
  private exportDir: string;
  private task?: cron.ScheduledTask;

  constructor(config: BatchJobConfig) {
    this.config = config;
    this.exportDir = path.join(process.cwd(), "batch-exports");
  }

  /**
   * Start the scheduled batch job
   */
  start(): void {
    if (!this.config.enabled) {
      console.log("⏭️  Batch job is disabled in configuration");
      return;
    }

    console.log(`\n🚀 Starting batch job scheduler`);
    console.log(`   Schedule: ${this.config.cronSchedule}`);
    console.log(`   HDFS: ${this.config.hdfs.host}:${this.config.hdfs.port}`);
    console.log(`   Upload method: ${this.config.uploadMethod}\n`);

    this.task = cron.schedule(this.config.cronSchedule, async () => {
      await this.runBatchJob();
    });
  }

  /**
   * Stop the scheduled batch job
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      console.log("⏸️  Batch job scheduler stopped");
    }
  }

  /**
   * Execute a single batch job (export + upload)
   */
  async runBatchJob(): Promise<void> {
    const jobStartTime = Date.now();
    console.log(`\n${"=".repeat(60)}`);
    console.log(
      `🔄 Batch Job Started: ${new Date().toISOString()}`
    );
    console.log(`${"=".repeat(60)}`);

    try {
      // Step 1: Export data
      console.log(`\n📊 Step 1: Exporting data from database...`);
      const exportResult = await performBatchExport();

      if (!exportResult.success) {
        throw new Error(exportResult.error || "Export failed");
      }

      // Step 2: Upload to HDFS
      console.log(`\n☁️  Step 2: Uploading to HDFS...`);

      let uploadResult;
      if (this.config.uploadMethod === "webhdfs") {
        const uploader = new HdfsUploader(this.config.hdfs, this.exportDir);
        uploadResult = await uploader.uploadExports();
      } else {
        uploadResult = await uploadWithHdfsCommand(
          this.exportDir,
          this.config.hdfs.host,
          this.config.hdfs.port,
          this.config.hdfs.baseDir
        );
      }

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "Upload failed");
      }

      // Step 3: Cleanup old files
      console.log(`\n🧹 Step 3: Cleaning up old export files...`);
      await cleanupOldExports(this.config.cleanupDays);

      const jobDuration = ((Date.now() - jobStartTime) / 1000).toFixed(2);
      console.log(`\n${"=".repeat(60)}`);
      console.log(`✅ Batch Job Completed Successfully`);
      console.log(`   Duration: ${jobDuration}s`);
      console.log(`   Records exported: ${exportResult.totalRecords}`);
      console.log(`   Files uploaded: ${uploadResult.filesUploaded.length}`);
      console.log(`   Total size: ${uploadResult.totalSize}`);
      console.log(`${"=".repeat(60)}\n`);
    } catch (error) {
      const jobDuration = ((Date.now() - jobStartTime) / 1000).toFixed(2);
      console.error(`\n${"=".repeat(60)}`);
      console.error(`❌ Batch Job Failed`);
      console.error(`   Error: ${error}`);
      console.error(`   Duration: ${jobDuration}s`);
      console.error(`${"=".repeat(60)}\n`);

      // TODO: Add error logging to your logging service
      // await logError('batch-job-failed', error);
    }
  }

  /**
   * Manually trigger a batch job (on-demand)
   */
  async runNow(): Promise<void> {
    await this.runBatchJob();
  }
}

/**
 * Default configuration - customize based on your environment
 */
export function getDefaultBatchConfig(): BatchJobConfig {
  return {
    enabled: process.env.BATCH_JOB_ENABLED !== "false",
    cronSchedule: process.env.BATCH_JOB_SCHEDULE || "0 0 2 * * *", // 2 AM daily
    hdfs: {
      host: process.env.HDFS_HOST || "10.76.1.41",
      port: parseInt(process.env.HDFS_PORT || "9870"),
      user: process.env.HDFS_USER || "hdfs",
      baseDir: process.env.HDFS_BASE_DIR || "/bus-tracker/exports",
    },
    uploadMethod:
      (process.env.HDFS_UPLOAD_METHOD as "webhdfs" | "hdfs-cli") || "webhdfs",
    cleanupDays: parseInt(process.env.BATCH_CLEANUP_DAYS || "30"),
  };
}

// Export singleton instance for use in your app
let schedulerInstance: BatchJobScheduler | null = null;

export function getScheduler(): BatchJobScheduler {
  if (!schedulerInstance) {
    const config = getDefaultBatchConfig();
    schedulerInstance = new BatchJobScheduler(config);
  }
  return schedulerInstance;
}

export function initializeBatchScheduler(): void {
  const scheduler = getScheduler();
  scheduler.start();
}
