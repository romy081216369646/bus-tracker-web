# Command Reference - Batch Export to Hadoop

Quick reference for common commands.

## Setup Commands

```bash
# 1. Install dependencies
npm install

# 2. Copy configuration template
cp .env.example.hadoop .env.local

# 3. Edit configuration (use your preferred editor)
nano .env.local        # Linux/Mac
code .env.local        # VS Code
```

## Hadoop Cluster Commands

```bash
# SSH to Hadoop NameNode via ZeroTier
ssh -o StrictHostKeyChecking=no hdfs@10.76.1.41

# Create HDFS export directory
hdfs dfs -mkdir -p /bus-tracker/exports
hdfs dfs -chmod 777 /bus-tracker/exports

# Verify directory exists
hdfs dfs -ls /bus-tracker

# List exported files
hdfs dfs -ls /bus-tracker/exports
hdfs dfs -ls /bus-tracker/exports/2026-06-05

# View file content (first 100 lines)
hdfs dfs -cat /bus-tracker/exports/2026-06-05/buses-*.json | head -100

# Check directory size
hdfs dfs -du -h /bus-tracker/exports

# Delete old exports (caution!)
hdfs dfs -rm -r /bus-tracker/exports/2026-05-01
```

## Local Commands (App Server)

```bash
# Start development server
npm run dev

# Start production server
npm run build
npm start

# View batch exports locally
ls -lah batch-exports/
ls -lh batch-exports/        # Human-readable sizes

# Count JSON records
cat batch-exports/buses-*.json | wc -l
jq '. | length' batch-exports/buses-*.json

# View JSON structure
head -50 batch-exports/buses-*.json
jq '.[0] | keys' batch-exports/buses-*.json
```

## API Endpoints

### Check Batch Job Status

```bash
# Using curl
curl http://localhost:3000/api/admin/batch-jobs \
  -H "Authorization: Bearer YOUR_TOKEN"

# Using node/JavaScript
fetch('http://localhost:3000/api/admin/batch-jobs', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
}).then(r => r.json()).then(console.log)
```

### Trigger Batch Job Now

```bash
# Using curl
curl -X POST http://localhost:3000/api/admin/batch-jobs/run \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response: HTTP 202 (Accepted - job queued)
```

## Testing & Debugging

### Test ZeroTier Connectivity

```bash
# Verify network connection
ping 10.76.1.41

# Check open ports
nc -zv 10.76.1.41 9870
```

### Test HDFS WebHDFS API

```bash
# Basic connectivity test
curl -v http://10.76.1.41:9870/webhdfs/v1/?op=GETHOMEDIRECTORY&user.name=hdfs

# Expected response: HTTP 200 with home directory path

# Test file upload
curl -X PUT \
  -H "Content-Type: application/octet-stream" \
  --data-binary @batch-exports/buses-*.json \
  'http://10.76.1.41:9870/webhdfs/v1/bus-tracker/exports/test.json?op=CREATE&user.name=hdfs&overwrite=true'
```

### Debug Batch Scheduler

```bash
# Run with debug output
DEBUG=* npm run dev

# Export only (no upload)
node -e "
const { performBatchExport } = require('./src/lib/batch-export');
performBatchExport().then(r => console.log(JSON.stringify(r, null, 2)));
"

# Run full batch job manually
node -e "
const { getScheduler } = require('./src/lib/batch-scheduler');
getScheduler().runNow();
"
```

## Monitoring & Logs

```bash
# Watch for batch job logs
tail -f ~/.pm2/logs/app-*.log | grep -i batch

# Check system resources during export
top -p $(pgrep -f "node.*next")

# Monitor HDFS space usage
ssh hdfs@10.76.1.41 "hdfs dfs -du -s -h /bus-tracker/exports"
```

## Database Queries

### Check data volume before export

```bash
# PostgreSQL - Count records by type
psql -U postgres -d bus_tracker_db << 'EOF'
SELECT 
  'Buses' as type, COUNT(*) as count FROM bus
UNION ALL
SELECT 'Routes', COUNT(*) FROM route
UNION ALL
SELECT 'Stops', COUNT(*) FROM stop
UNION ALL
SELECT 'Bus Events', COUNT(*) FROM "busEvent"
UNION ALL
SELECT 'Audit Logs', COUNT(*) FROM "auditLog";
EOF
```

## Hive / Spark Queries

### Create External Table from HDFS JSON

```sql
-- Hive
CREATE EXTERNAL TABLE IF NOT EXISTS bus_data
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.JsonSerDe'
LOCATION '/bus-tracker/exports'
TBLPROPERTIES ("allow_all_nulls"="false");

SELECT COUNT(*) FROM bus_data;
```

### Spark Query

```python
# PySpark
df = spark.read.json("/bus-tracker/exports/*/*.json")
df.createOrReplaceTempView("bus_data")

# Show schema
df.printSchema()

# Count records
spark.sql("SELECT COUNT(*) FROM bus_data").show()

# Filter active buses
spark.sql("SELECT * FROM bus_data WHERE status='ACTIVE'").show()
```

## Environment Variables

```bash
# View current settings
env | grep BATCH_JOB
env | grep HDFS

# Set temporarily (for testing)
export BATCH_JOB_SCHEDULE="*/5 * * * *"  # Every 5 minutes
npm run dev

# Reset (restore from .env.local)
unset BATCH_JOB_SCHEDULE
npm run dev
```

## Maintenance Commands

```bash
# Clean up old exports (local)
find batch-exports -mtime +30 -delete

# Archive exports to tar.gz
tar czf batch-exports-backup-2026-06-05.tar.gz batch-exports/

# Remove all local exports
rm -rf batch-exports/*

# Check disk usage
du -sh batch-exports/
```

## Production Deployment

```bash
# Using PM2
pm2 start "npm start" --name bus-tracker

# Using Docker
docker build -t bus-tracker .
docker run -e BATCH_JOB_ENABLED=true \
  -e HDFS_HOST=10.76.1.41 \
  bus-tracker

# Using Kubernetes
kubectl apply -f deployment.yaml
kubectl logs -f deployment/bus-tracker | grep batch
```

## Emergency/Recovery

```bash
# Stop batch scheduler gracefully
curl -X DELETE http://localhost:3000/api/admin/batch-jobs/scheduler

# Force restart app
npm run build
npm start

# Clear stuck batch jobs
rm -f batch-exports/.lock

# Reset to default configuration
rm .env.local
cp .env.example.hadoop .env.local
npm run dev
```

## Performance Tuning

```bash
# Increase Node memory for large exports
NODE_OPTIONS=--max-old-space-size=8192 npm start

# Use compression for uploads
export HDFS_COMPRESS=true

# Parallel upload (modify source code)
# In hdfs-uploader.ts, change Promise.all() for concurrent uploads
```

## Version & Diagnostic Info

```bash
# Check Node version
node --version

# Check npm packages
npm list | grep cron
npm list | grep prisma

# Check system info
uname -a
df -h

# Test PostgreSQL connection
psql -U postgres -d bus_tracker_db -c "SELECT 1"

# Verify Prisma setup
npx prisma version
npx prisma db execute --stdin < /dev/null
```

---

For more detailed information, see:
- `docs/BATCH_EXPORT_HADOOP.md` - Full documentation
- `BATCH_EXPORT_SETUP.md` - Setup guide
- `.env.example.hadoop` - Configuration options
