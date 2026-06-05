/**
 * Batch export data from database to JSON files for Hadoop ingestion
 */
import { prisma } from "./prisma";
import * as fs from "fs";
import * as path from "path";
import { createWriteStream } from "fs";

const EXPORT_DIR = path.join(process.cwd(), "batch-exports");
const TIMESTAMP = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

interface ExportMetadata {
  exportDate: string;
  exportTime: string;
  totalRecords: number;
  dataType: string;
  version: "1.0";
}

async function ensureExportDir() {
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }
}

async function writeJsonStream(
  filename: string,
  dataGenerator: AsyncGenerator<any>
): Promise<number> {
  const filepath = path.join(EXPORT_DIR, filename);
  const stream = createWriteStream(filepath);

  return new Promise(async (resolve, reject) => {
    try {
      stream.write("[\n");
      let count = 0;
      let isFirst = true;

      for await (const item of dataGenerator) {
        if (!isFirst) stream.write(",\n");
        stream.write(JSON.stringify(item, null, 2));
        count++;
        isFirst = false;

        // Log progress every 1000 records
        if (count % 1000 === 0) {
          console.log(`  ✓ Exported ${count} ${filename}...`);
        }
      }

      stream.write("\n]");
      stream.end();

      stream.on("finish", () => resolve(count));
      stream.on("error", reject);
    } catch (error) {
      stream.destroy();
      reject(error);
    }
  });
}

// Data generators for streaming large result sets
async function* generateBuses() {
  const buses = await prisma.bus.findMany({
    include: {
      route: true,
      state: true,
    },
  });
  for (const bus of buses) {
    yield bus;
  }
}

async function* generateRoutes() {
  const routes = await prisma.route.findMany({
    include: {
      stops: {
        include: { stop: true },
        orderBy: { order: "asc" },
      },
    },
  });
  for (const route of routes) {
    yield route;
  }
}

async function* generateStops() {
  const stops = await prisma.stop.findMany();
  for (const stop of stops) {
    yield stop;
  }
}

async function* generateBusEvents(daysBack: number = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const pageSize = 500;
  let skip = 0;

  while (true) {
    const events = await prisma.busEvent.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        bus: true,
        stop: true,
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    });

    if (events.length === 0) break;

    for (const event of events) {
      yield event;
    }

    skip += pageSize;
  }
}

async function* generateAuditLogs(daysBack: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const pageSize = 500;
  let skip = 0;

  while (true) {
    const logs = await prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        actor: true,
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    });

    if (logs.length === 0) break;

    for (const log of logs) {
      yield log;
    }

    skip += pageSize;
  }
}

export interface BatchExportResult {
  timestamp: string;
  success: boolean;
  files: {
    [filename: string]: {
      records: number;
      path: string;
      size: string;
    };
  };
  totalRecords: number;
  exportDir: string;
  error?: string;
}

export async function performBatchExport(): Promise<BatchExportResult> {
  const startTime = Date.now();
  const result: BatchExportResult = {
    timestamp: new Date().toISOString(),
    success: false,
    files: {},
    totalRecords: 0,
    exportDir: EXPORT_DIR,
  };

  try {
    console.log(`\n📦 Starting batch export at ${result.timestamp}`);
    await ensureExportDir();

    // Export files
    const exports = [
      { filename: `buses-${TIMESTAMP}.json`, generator: generateBuses() },
      { filename: `routes-${TIMESTAMP}.json`, generator: generateRoutes() },
      { filename: `stops-${TIMESTAMP}.json`, generator: generateStops() },
      {
        filename: `bus-events-${TIMESTAMP}.json`,
        generator: generateBusEvents(7),
      },
      {
        filename: `audit-logs-${TIMESTAMP}.json`,
        generator: generateAuditLogs(30),
      },
    ];

    for (const { filename, generator } of exports) {
      const recordCount = await writeJsonStream(filename, generator);
      const filepath = path.join(EXPORT_DIR, filename);
      const stats = fs.statSync(filepath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

      result.files[filename] = {
        records: recordCount,
        path: filepath,
        size: `${sizeInMB} MB`,
      };
      result.totalRecords += recordCount;

      console.log(
        `✓ ${filename}: ${recordCount} records (${sizeInMB} MB)`
      );
    }

    // Create metadata file
    const metadata: {
      exports: {
        [key: string]: ExportMetadata;
      };
    } = {
      exports: {},
    };

    for (const [filename, fileInfo] of Object.entries(result.files)) {
      const dataType = filename.split("-")[0];
      metadata.exports[filename] = {
        exportDate: TIMESTAMP,
        exportTime: new Date().toISOString(),
        totalRecords: fileInfo.records,
        dataType,
        version: "1.0",
      };
    }

    const metadataPath = path.join(EXPORT_DIR, `metadata-${TIMESTAMP}.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(
      `\n✅ Export complete! Total: ${result.totalRecords} records in ${duration}s`
    );
    console.log(`📁 Files saved to: ${EXPORT_DIR}\n`);

    result.success = true;
    return result;
  } catch (error) {
    result.error =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("❌ Batch export failed:", result.error);
    return result;
  }
}

// Cleanup old export files (keep last 30 days)
export async function cleanupOldExports(daysToKeep: number = 30): Promise<void> {
  try {
    if (!fs.existsSync(EXPORT_DIR)) return;

    const files = fs.readdirSync(EXPORT_DIR);
    const now = Date.now();
    const maxAge = daysToKeep * 24 * 60 * 60 * 1000;

    for (const file of files) {
      const filepath = path.join(EXPORT_DIR, file);
      const stats = fs.statSync(filepath);
      const fileAge = now - stats.mtimeMs;

      if (fileAge > maxAge) {
        fs.unlinkSync(filepath);
        console.log(`🗑️  Deleted old export: ${file}`);
      }
    }
  } catch (error) {
    console.error("Error cleaning up old exports:", error);
  }
}
