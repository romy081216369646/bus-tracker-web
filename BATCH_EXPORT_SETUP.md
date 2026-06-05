# 🚀 Batch Data Export to Hadoop via ZeroTier - Setup Summary

This document provides a quick overview and step-by-step setup instructions.

## What's Been Created

I've created a complete batch data export pipeline with 4 main components:

### 📁 New Files Created

1. **Core Export Logic**
   - `src/lib/batch-export.ts` - Exports data from PostgreSQL to JSON files
   - `src/lib/hdfs-uploader.ts` - Uploads files to Hadoop via ZeroTier
   - `src/lib/batch-scheduler.ts` - Schedules daily batch jobs using node-cron
   - `src/lib/init-batch-scheduler.ts` - Server-side initialization hook

2. **API Endpoint**
   - `src/app/api/admin/batch-jobs/route.ts` - On-demand batch job trigger

3. **Documentation & Configuration**
   - `docs/BATCH_EXPORT_HADOOP.md` - Comprehensive setup & troubleshooting guide
   - `.env.example.hadoop` - Configuration template with ZeroTier settings
   - `scripts/setup-batch-export.sh` - Automated setup script

### 🔧 Modified Files

- `package.json` - Added `node-cron` dependency
- `src/app/layout.tsx` - Added batch scheduler initialization

## Your ZeroTier Configuration

```
Network ID:     154a350c860c24f3
Your IP:        10.76.1.41
Hadoop IP:      10.76.1.41
HDFS Port:      9870 (WebHDFS)
HDFS NameNode:  9000
```

## 5-Minute Setup

### 1. Install Dependencies

```bash
cd /workspaces/bus-tracker-web
npm install
```

### 2. Configure Environment

Copy the template and edit with your settings:

```bash
cp .env.example.hadoop .env.local
```

Update `.env.local`:

```env
BATCH_JOB_ENABLED=true
BATCH_JOB_SCHEDULE="0 0 2 * * *"  # Daily at 2 AM
BATCH_CLEANUP_DAYS=30

HDFS_HOST=10.76.1.41
HDFS_PORT=9870
HDFS_USER=hdfs
HDFS_BASE_DIR=/bus-tracker/exports
HDFS_UPLOAD_METHOD=webhdfs
```

### 3. Prepare Hadoop

SSH to your Hadoop cluster via ZeroTier:

```bash
# Create and set permissions
hdfs dfs -mkdir -p /bus-tracker/exports
hdfs dfs -chmod 777 /bus-tracker/exports

# Verify
hdfs dfs -ls /bus-tracker
```

### 4. Test Connection

```bash
# Test ZeroTier connectivity
ping 10.76.1.41

# Test HDFS WebHDFS API
curl -v "http://10.76.1.41:9870/webhdfs/v1/?op=GETHOMEDIRECTORY&user.name=hdfs"
```

### 5. Start Your App

```bash
npm run dev
```

Watch the logs for batch scheduler initialization:

```
🔄 Initializing batch scheduler...
✅ Batch scheduler initialized successfully
🚀 Starting batch job scheduler
   Schedule: 0 0 2 * * *
   HDFS: 10.76.1.41:9870
   Upload method: webhdfs
```

## How It Works

```
Daily Schedule (Configured in .env.local)
         ↓
Batch Scheduler (node-cron)
         ↓
┌─────────────────────────────────────┐
│ 1. Export Phase                     │
│   - Query PostgreSQL database       │
│   - Generate JSON files (streamed)  │
│   - Save to batch-exports/ folder   │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 2. Upload Phase                     │
│   - Connect via ZeroTier to HDFS    │
│   - Upload JSON files via WebHDFS   │
│   - Create date-based directories   │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 3. Cleanup Phase                    │
│   - Delete old export files         │
│   - Keep N days of history          │
└─────────────────────────────────────┘
```

## Data Being Exported

- **Buses** - Fleet information, status, routes
- **Routes** - Route details, stops, schedules
- **Stops** - Stop locations, names, coordinates
- **Bus Events** - IoT telemetry (last 7 days)
- **Audit Logs** - Admin actions (last 30 days)

All exported as JSON in `/batch-exports/{date}/` with timestamped filenames.

## Usage

### Automatic Daily Exports

Once configured, batch jobs run automatically on your schedule (default: 2 AM UTC daily).

### Manual On-Demand Export

```bash
# Check configuration
curl http://localhost:3000/api/admin/batch-jobs \
  -H "Cookie: $(your-auth-cookie)"

# Trigger export now
curl -X POST http://localhost:3000/api/admin/batch-jobs/run \
  -H "Cookie: $(your-auth-cookie)"
```

### Monitor in Hadoop

```bash
# List exported files
hdfs dfs -ls /bus-tracker/exports

# View latest exports
hdfs dfs -ls /bus-tracker/exports/2026-06-05

# Count records in a file
hdfs dfs -cat /bus-tracker/exports/2026-06-05/buses-*.json | wc -l
```

## Querying Data in Hadoop

### Apache Hive

```sql
CREATE EXTERNAL TABLE IF NOT EXISTS bus_tracker_buses (
  -- Schema auto-detected from JSON
)
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.JsonSerDe'
LOCATION '/bus-tracker/exports';

SELECT COUNT(*) FROM bus_tracker_buses WHERE status = 'ACTIVE';
```

### Apache Spark

```python
df = spark.read.json("/bus-tracker/exports/*/*.json")
df.filter(df.status == "ACTIVE").count()
```

## Troubleshooting

### Connection to HDFS Fails

```bash
# 1. Verify ZeroTier connection
ping 10.76.1.41

# 2. Check Hadoop services
ssh 10.76.1.41 "jps | grep NameNode"

# 3. Test WebHDFS directly
curl "http://10.76.1.41:9870/webhdfs/v1/?op=GETHOMEDIRECTORY"
```

### HDFS Permission Denied

```bash
# Fix directory permissions
hdfs dfs -chmod 777 /bus-tracker/exports
hdfs dfs -ls -la /bus-tracker
```

### Batch Job Not Running

1. Check if enabled: `grep BATCH_JOB_ENABLED .env.local`
2. Check Node.js memory: Increase with `NODE_OPTIONS=--max-old-space-size=4096`
3. Check logs for errors: `npm run dev 2>&1 | grep -i batch`

### Large Data Export Memory Issues

```bash
# Increase Node.js heap memory
NODE_OPTIONS=--max-old-space-size=4096 npm start
```

## Performance Tips

1. **Adjust export frequency** in `BATCH_JOB_SCHEDULE`:
   - More frequent = Smaller files, more network overhead
   - Less frequent = Larger files, more database load

2. **Filter old data** in `batch-export.ts`:
   - Modify `daysBack` parameter for event/audit logs
   - Reduce data volume per export

3. **Use HDFS CLI** instead of WebHDFS for faster uploads:
   - Set `HDFS_UPLOAD_METHOD=hdfs-cli`
   - Requires `hdfs` command-line tool installed

## Security Notes

1. **Environment Variables**:
   - `.env.local` is gitignored - safe for local development
   - Use encrypted secrets in production

2. **Network Security**:
   - ZeroTier provides encrypted VPN tunnel
   - HDFS should have additional authentication (Kerberos)

3. **File Permissions**:
   - Restrict HDFS directory access via ACLs
   - Monitor exported data for sensitive information

## Next Steps

1. **Full Documentation**: Read `docs/BATCH_EXPORT_HADOOP.md`
2. **Test Export**: Trigger a manual export and verify files in HDFS
3. **Set Up Monitoring**: Add alerts for failed batch jobs
4. **Archive Strategy**: Implement HDFS retention policies
5. **Analytics**: Query data using Hive/Spark

## Support & Logs

Check batch scheduler logs:

```bash
# In production (find in your log aggregation system):
tail -f logs/batch-scheduler.log

# During development:
npm run dev 2>&1 | grep -i "batch\|export\|hdfs"
```

Export files are saved locally at:

```
./batch-exports/
├── buses-2026-06-05.json
├── routes-2026-06-05.json
├── stops-2026-06-05.json
├── bus-events-2026-06-05.json
├── audit-logs-2026-06-05.json
└── metadata-2026-06-05.json
```

---

**Ready to start?** Run the setup script:

```bash
bash scripts/setup-batch-export.sh
```

Good luck! 🚀
