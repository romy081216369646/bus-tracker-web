# Batch Data Export to Hadoop via ZeroTier

This guide explains how to set up automatic batch exports of your bus tracking data to a Hadoop cluster via ZeroTier network.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ Bus Tracker Web App (Next.js)                                    │
│ - PostgreSQL Database                                            │
│ - Express/Next.js API                                            │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                    1. Export to JSON files
                                 │
                        ┌────────▼────────┐
                        │ batch-exports/  │
                        │ - buses.json    │
                        │ - routes.json   │
                        │ - stops.json    │
                        │ - events.json   │
                        │ - audit-logs    │
                        └────────┬────────┘
                                 │
                    2. Upload via ZeroTier (Scheduled daily)
                                 │
        ┌────────────────────────▼──────────────────────────┐
        │ ZeroTier Network (154a350c860c24f3)               │
        │ Your IP: 10.76.1.41                              │
        └────────────────────────┬──────────────────────────┘
                                 │
                    3. Upload to HDFS
                                 │
        ┌────────────────────────▼──────────────────────────┐
        │ Hadoop Cluster                                    │
        │ - NameNode: 10.76.1.41:9000                       │
        │ - WebHDFS: 10.76.1.41:9870                       │
        │ - Base Dir: /bus-tracker/exports                  │
        └───────────────────────────────────────────────────┘
```

## Prerequisites

### On Your Hadoop Cluster
- Hadoop installed and running (3.2.x or later)
- WebHDFS service accessible on port 9870
- HDFS base directory created: `/bus-tracker/exports`
- Network connectivity via ZeroTier

### On Your App Server
- Node.js 18+
- Dependencies installed: `npm install`

### ZeroTier Configuration (Already Done)
- Network ID: `154a350c860c24f3`
- Your app server IP: `10.76.1.41`
- Hadoop/NameNode accessible at: `10.76.1.41`

## Installation

### 1. Install Dependencies

```bash
npm install
```

This installs `node-cron` for scheduling batch jobs.

### 2. Set Environment Variables

Create or update your `.env.local` file with HDFS configuration:

```env
# Batch Job Scheduling
BATCH_JOB_ENABLED=true
BATCH_JOB_SCHEDULE="0 0 2 * * *"    # 2 AM daily (UTC)
BATCH_CLEANUP_DAYS=30                # Keep exports for 30 days

# HDFS Configuration (ZeroTier)
HDFS_HOST=10.76.1.41
HDFS_PORT=9870
HDFS_USER=hdfs
HDFS_BASE_DIR=/bus-tracker/exports
HDFS_UPLOAD_METHOD=webhdfs           # "webhdfs" or "hdfs-cli"
```

### 3. Prepare Hadoop Cluster

SSH into your Hadoop NameNode and create the base directory:

```bash
# SSH via ZeroTier
ssh -o StrictHostKeyChecking=no hdfs@10.76.1.41

# Create base directory
hdfs dfs -mkdir -p /bus-tracker/exports
hdfs dfs -chmod 777 /bus-tracker/exports

# Verify
hdfs dfs -ls /bus-tracker
```

## Usage

### Automatic Daily Exports

Once your app starts, batch jobs will run automatically on your configured schedule (default: 2 AM UTC).

The scheduler is initialized in your Next.js app startup:

```typescript
// src/app/layout.tsx (or your app entry point)
import { initializeBatchScheduler } from '@/lib/batch-scheduler';

if (typeof window === 'undefined') {  // Only on server
  initializeBatchScheduler();
}
```

### Manual On-Demand Export

Trigger a batch job via API (admin only):

```bash
curl -X POST http://localhost:3000/api/admin/batch-jobs/run \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

Or check status:

```bash
curl http://localhost:3000/api/admin/batch-jobs \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

### Command Line (Development)

```bash
# Export only (no upload)
node -e "
const { performBatchExport } = require('./src/lib/batch-export');
performBatchExport().then(r => console.log(r));
"

# Run full batch job
node -e "
const { getScheduler } = require('./src/lib/batch-scheduler');
getScheduler().runNow();
"
```

## Data Export Formats

### Exported Files

Each export creates timestamped JSON files:

```
batch-exports/
├── buses-2026-06-05.json           # Bus fleet data
├── routes-2026-06-05.json          # Route information
├── stops-2026-06-05.json           # Bus stop locations
├── bus-events-2026-06-05.json      # IoT events (last 7 days)
├── audit-logs-2026-06-05.json      # Audit logs (last 30 days)
└── metadata-2026-06-05.json        # Export metadata
```

### Example: buses-2026-06-05.json

```json
[
  {
    "id": "bus-001",
    "fleetCode": "BUS-001",
    "rfidTag": "RFID-123ABC",
    "model": "Isuzu NPR",
    "capacity": 50,
    "status": "ACTIVE",
    "serviceStatus": "NORMAL",
    "passengers": 32,
    "route": {
      "id": "route-1",
      "code": "R-001",
      "name": "Main Route",
      "status": "ON_SCHEDULE"
    },
    "createdAt": "2026-06-01T10:00:00Z",
    "updatedAt": "2026-06-05T14:32:15Z"
  }
]
```

### Example: bus-events-2026-06-05.json

```json
[
  {
    "id": "event-123",
    "busId": "bus-001",
    "type": "PASSENGER_IN",
    "delta": 5,
    "stopId": "stop-45",
    "rfidTag": "RFID-123ABC",
    "payload": {
      "temperature": 22.5,
      "humidity": 65
    },
    "createdAt": "2026-06-05T14:30:00Z",
    "bus": { "id": "bus-001", "fleetCode": "BUS-001" },
    "stop": { "id": "stop-45", "name": "Central Station" }
  }
]
```

## Hadoop Integration

### Querying Exported Data

Once data is in HDFS, you can query it using:

#### Apache Hive

```sql
CREATE EXTERNAL TABLE bus_tracker_buses
ROW FORMAT DELIMITED
STORED AS JSON
LOCATION '/bus-tracker/exports';

SELECT * FROM bus_tracker_buses WHERE status = 'ACTIVE';
```

#### Apache Spark

```python
df = spark.read.json("/bus-tracker/exports/buses-*.json")
df.createOrReplaceTempView("buses")
spark.sql("SELECT COUNT(*) as active_buses FROM buses WHERE status='ACTIVE'").show()
```

#### Direct HDFS Access

```bash
hdfs dfs -cat /bus-tracker/exports/2026-06-05/buses-2026-06-05.json | head -n 20
hdfs dfs -du -h /bus-tracker/exports/
```

### Partitioning Strategy (Optional)

For better query performance with large datasets, organize exports by date:

```
/bus-tracker/exports/
├── 2026-06-01/
│   ├── buses-2026-06-01.json
│   ├── routes-2026-06-01.json
│   └── ...
├── 2026-06-02/
│   ├── buses-2026-06-02.json
│   └── ...
```

This is already implemented in the uploader (creates `HDFS_BASE_DIR/YYYY-MM-DD/` subdirectories).

## Troubleshooting

### Connection Issues

**Error: "Connection refused at 10.76.1.41:9870"**

1. Verify ZeroTier connectivity:
```bash
ping 10.76.1.41
```

2. Check Hadoop WebHDFS is running:
```bash
ssh 10.76.1.41 "curl localhost:9870"
```

3. Verify firewall rules:
```bash
ssh 10.76.1.41 "sudo netstat -tlnp | grep 9870"
```

### HDFS Permission Issues

**Error: "Permission denied"**

1. Check directory permissions:
```bash
hdfs dfs -ls /bus-tracker
```

2. Fix if needed:
```bash
hdfs dfs -chmod 777 /bus-tracker/exports
```

### Export File Issues

**Error: "ENOMEM: Cannot allocate memory"**

If exporting large amounts of data, increase Node.js memory:

```bash
NODE_OPTIONS=--max-old-space-size=4096 npm start
```

### Batch Job Not Running

1. Check if enabled:
```bash
grep BATCH_JOB_ENABLED .env.local
```

2. Check logs:
```bash
tail -f .next/server.log | grep "batch"
```

3. Verify scheduler initialization (see "Setup" section above)

## Performance Optimization

### For Large Datasets

1. **Increase batch size**: Modify `pageSize` in `batch-export.ts` (default: 500)
2. **Use parallel uploads**: Modify `HdfsUploader` to upload multiple files concurrently
3. **Compress exports**: Add `.gzip()` to streams before uploading

### Example: Parallel Upload

```typescript
// In hdfs-uploader.ts
const uploadPromises = files.map(file =>
  this.uploadFile(localPath, hdfsPath)
);
await Promise.all(uploadPromises);
```

## Security Considerations

1. **Network Security**: ZeroTier provides security through VPN tunneling
2. **HDFS Authentication**: Configure Kerberos if needed for production
3. **File Permissions**: 
   - Restrict read access to exported data in HDFS
   - Use HDFS ACLs: `hdfs dfs -setfacl -m user:analyst:rx /bus-tracker`

4. **Credentials**:
   - Never commit `.env.local` to version control
   - Use encrypted env vars in production
   - Rotate HDFS user credentials regularly

## Monitoring

### Log Batch Job Status

Add to your logging service:

```typescript
// In batch-scheduler.ts runBatchJob()
const logger = getLogger('batch-jobs');
logger.info('Batch job started', { timestamp: new Date() });
logger.info('Export complete', { records: exportResult.totalRecords });
logger.info('Upload complete', { files: uploadResult.filesUploaded.length });
```

### Kubernetes Integration

For containerized deployments:

```yaml
# deployment.yaml
containers:
- name: bus-tracker
  image: bus-tracker:latest
  env:
  - name: BATCH_JOB_ENABLED
    value: "true"
  - name: HDFS_HOST
    valueFrom:
      configMapKeyRef:
        name: hadoop-config
        key: namenode-ip
```

## Advanced Configuration

### Custom Export Intervals

Modify cron schedule in `.env.local`:

```env
# Every 6 hours
BATCH_JOB_SCHEDULE="0 0 */6 * * *"

# Every Sunday at midnight
BATCH_JOB_SCHEDULE="0 0 0 * * 0"

# Every 5 minutes (testing)
BATCH_JOB_SCHEDULE="*/5 * * * *"
```

### Custom Data Filters

Modify generators in `batch-export.ts` to filter data:

```typescript
async function* generateBusEvents(daysBack: number = 7) {
  const events = await prisma.busEvent.findMany({
    where: {
      createdAt: { gte: startDate },
      type: 'PASSENGER_IN', // Filter by event type
    },
    // ...
  });
}
```

## Next Steps

1. **Test on staging**: Run batch jobs and verify HDFS data
2. **Set up monitoring**: Add alerts for failed exports
3. **Configure analytics**: Use Hive/Spark to analyze bus data
4. **Archive old data**: Implement HDFS data retention policies

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review server logs: `tail -f .next/logs/batch-*.log`
3. Test connectivity: `curl -v http://10.76.1.41:9870/webhdfs/v1/?op=GETHOMEDIRECTORY&user.name=hdfs`
