/**
 * Upload batch export files to HDFS via ZeroTier network
 * 
 * Configuration:
 * - HDFS NameNode: 10.76.1.41:9000 (ZeroTier IP)
 * - HDFS WebHDFS: 10.76.1.41:9870 (for REST API)
 */
import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import { URL } from "url";

export interface HdfsConfig {
  host: string; // ZeroTier IP: 10.76.1.41
  port: number; // Default: 9870 for WebHDFS
  user: string; // HDFS user
  baseDir: string; // e.g. /bus-tracker/exports
}

export interface UploadResult {
  timestamp: string;
  success: boolean;
  filesUploaded: string[];
  filesFailed: string[];
  totalSize: string;
  error?: string;
}

export class HdfsUploader {
  private config: HdfsConfig;
  private exportDir: string;

  constructor(config: HdfsConfig, exportDir: string) {
    this.config = config;
    this.exportDir = exportDir;
    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config.host || !this.config.port || !this.config.user) {
      throw new Error("Invalid HDFS configuration");
    }
    console.log(`🌐 HDFS Configuration:`);
    console.log(`   Host: ${this.config.host}:${this.config.port}`);
    console.log(`   User: ${this.config.user}`);
    console.log(`   Base Dir: ${this.config.baseDir}`);
  }

  /**
   * Upload a single file to HDFS using WebHDFS REST API
   */
  private uploadFile(
    localPath: string,
    hdfsPath: string
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const filename = path.basename(localPath);
        const fileStream = fs.createReadStream(localPath);
        const fileStats = fs.statSync(localPath);

        // WebHDFS PUT endpoint: http://host:port/webhdfs/v1/path?op=CREATE&user.name=user&overwrite=true
        const hdfsUrl = new URL(
          `http://${this.config.host}:${this.config.port}/webhdfs/v1${hdfsPath}`
        );
        hdfsUrl.searchParams.append("op", "CREATE");
        hdfsUrl.searchParams.append("user.name", this.config.user);
        hdfsUrl.searchParams.append("overwrite", "true");

        console.log(`   📤 Uploading: ${filename} (${fileStats.size} bytes)`);

        const req = http.request(hdfsUrl.toString(), {
          method: "PUT",
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Length": fileStats.size,
          },
        });

        req.on("response", (res) => {
          if (res.statusCode === 201 || res.statusCode === 307) {
            console.log(`      ✓ Upload initiated for ${filename}`);
            resolve(true);
          } else {
            console.error(
              `      ✗ Upload failed: HTTP ${res.statusCode}`
            );
            reject(
              new Error(
                `HTTP ${res.statusCode} from HDFS`
              )
            );
          }
        });

        req.on("error", (err) => {
          reject(
            new Error(
              `Connection failed to HDFS (${this.config.host}:${this.config.port}): ${err.message}`
            )
          );
        });

        fileStream.on("error", (err) => {
          req.destroy();
          reject(new Error(`File read error: ${err.message}`));
        });

        fileStream.pipe(req);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Ensure HDFS directory exists
   */
  private ensureHdfsDir(hdfsPath: string): Promise<boolean> {
    return new Promise((resolve) => {
      const mkdirUrl = new URL(
        `http://${this.config.host}:${this.config.port}/webhdfs/v1${hdfsPath}`
      );
      mkdirUrl.searchParams.append("op", "MKDIRS");
      mkdirUrl.searchParams.append("user.name", this.config.user);

      const req = http.request(mkdirUrl.toString(), { method: "PUT" });
      req.on("response", () => resolve(true));
      req.on("error", () => resolve(true)); // Directory may already exist
      req.end();
    });
  }

  /**
   * Upload all export files to HDFS
   */
  async uploadExports(): Promise<UploadResult> {
    const result: UploadResult = {
      timestamp: new Date().toISOString(),
      success: false,
      filesUploaded: [],
      filesFailed: [],
      totalSize: "0 MB",
    };

    try {
      if (!fs.existsSync(this.exportDir)) {
        throw new Error(`Export directory not found: ${this.exportDir}`);
      }

      // Get list of exported files (JSON and metadata)
      const files = fs
        .readdirSync(this.exportDir)
        .filter((f) => f.endsWith(".json"))
        .sort()
        .reverse() // Latest first
        .slice(0, 10); // Limit to avoid too many files

      if (files.length === 0) {
        throw new Error("No export files found in export directory");
      }

      console.log(`\n📦 Starting HDFS upload (${files.length} files)\n`);

      // Create timestamped directory in HDFS
      const timestamp = new Date().toISOString().split("T")[0];
      const hdfsExportDir = `${this.config.baseDir}/${timestamp}`;

      console.log(`📁 HDFS target: ${hdfsExportDir}\n`);

      // Ensure HDFS directory exists
      await this.ensureHdfsDir(hdfsExportDir);

      let totalSize = 0;

      // Upload each file
      for (const file of files) {
        try {
          const localPath = path.join(this.exportDir, file);
          const hdfsPath = `${hdfsExportDir}/${file}`;
          const fileSize = fs.statSync(localPath).size;

          await this.uploadFile(localPath, hdfsPath);
          result.filesUploaded.push(file);
          totalSize += fileSize;
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          console.error(
            `      ✗ Failed to upload ${file}: ${errorMsg}`
          );
          result.filesFailed.push(file);
        }
      }

      result.totalSize = (totalSize / (1024 * 1024)).toFixed(2) + " MB";
      result.success = result.filesUploaded.length > 0;

      console.log(`\n✅ Upload complete!`);
      console.log(`   ✓ Uploaded: ${result.filesUploaded.length} files`);
      if (result.filesFailed.length > 0) {
        console.log(`   ✗ Failed: ${result.filesFailed.length} files`);
      }
      console.log(`   📊 Total size: ${result.totalSize}\n`);

      return result;
    } catch (error) {
      result.error =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("❌ HDFS upload failed:", result.error);
      return result;
    }
  }
}

/**
 * Alternative: Using shell command with hdfs CLI (if installed on system)
 */
export async function uploadWithHdfsCommand(
  exportDir: string,
  hdfsHost: string,
  hdfsPort: number,
  hdfsBaseDir: string
): Promise<UploadResult> {
  const { execSync } = await import("child_process");
  const result: UploadResult = {
    timestamp: new Date().toISOString(),
    success: false,
    filesUploaded: [],
    filesFailed: [],
    totalSize: "0 MB",
  };

  try {
    // Set HDFS namenode
    process.env.NAMENODE = `${hdfsHost}:${hdfsPort}`;

    const timestamp = new Date().toISOString().split("T")[0];
    const hdfsDir = `${hdfsBaseDir}/${timestamp}`;

    console.log(`\n🔧 Using HDFS CLI (hdfs command)\n`);
    console.log(`📁 Target HDFS directory: ${hdfsDir}`);

    // Create directory
    try {
      execSync(`hdfs dfs -mkdir -p ${hdfsDir}`, { stdio: "pipe" });
    } catch {
      // Directory might already exist
    }

    // Copy all JSON files
    const files = fs
      .readdirSync(exportDir)
      .filter((f) => f.endsWith(".json"));

    for (const file of files) {
      try {
        const localPath = path.join(exportDir, file);
        const hdfsPath = `${hdfsDir}/${file}`;

        console.log(`   📤 Copying: ${file}`);
        execSync(`hdfs dfs -put -f ${localPath} ${hdfsPath}`, {
          stdio: "pipe",
        });

        result.filesUploaded.push(file);
      } catch (error) {
        console.error(`      ✗ Failed to upload ${file}`);
        result.filesFailed.push(file);
      }
    }

    result.success = result.filesUploaded.length > 0;
    console.log(`\n✅ Upload complete!`);
    console.log(`   ✓ Uploaded: ${result.filesUploaded.length} files\n`);

    return result;
  } catch (error) {
    result.error =
      error instanceof Error ? error.message : String(error);
    console.error("❌ HDFS upload failed:", result.error);
    return result;
  }
}
