# ✅ Implementation Checklist - Batch Export to Hadoop

## What's Been Done ✓

### Code Implementation
- [x] **Export Logic** (`src/lib/batch-export.ts`)
  - Streams data from PostgreSQL using Prisma
  - Exports to JSON files (buses, routes, stops, events, audit logs)
  - Supports pagination for large datasets
  - Auto-cleanup of old files

- [x] **HDFS Upload** (`src/lib/hdfs-uploader.ts`)
  - WebHDFS REST API integration
  - Alternative hdfs CLI support
  - ZeroTier network connectivity
  - Error handling & retry logic

- [x] **Job Scheduler** (`src/lib/batch-scheduler.ts`)
  - node-cron for daily scheduling
  - Configurable via environment variables
  - Coordinated export → upload → cleanup workflow

- [x] **API Endpoint** (`src/app/api/admin/batch-jobs/route.ts`)
  - GET: Check batch job status
  - POST: Trigger on-demand export

### Configuration & Setup
- [x] Package dependencies updated (node-cron added)
- [x] Environment template created (`.env.example.hadoop`)
- [x] Server initialization added (`src/app/layout.tsx`)

### Documentation
- [x] Full implementation guide (`docs/BATCH_EXPORT_HADOOP.md`)
- [x] Quick-start guide (`BATCH_EXPORT_SETUP.md`)
- [x] Command reference (`COMMAND_REFERENCE.md`)
- [x] Automated setup script (`scripts/setup-batch-export.sh`)

## Your Next Steps (In Order)

### Phase 1: Install & Configure (15 mins)

- [ ] Run: `npm install` (installs node-cron)
- [ ] Run: `cp .env.example.hadoop .env.local`
- [ ] Edit `.env.local` with your HDFS settings:
  ```
  BATCH_JOB_ENABLED=true
  BATCH_JOB_SCHEDULE="0 0 2 * * *"
  HDFS_HOST=10.76.1.41
  HDFS_PORT=9870
  HDFS_USER=hdfs
  HDFS_BASE_DIR=/bus-tracker/exports
  ```

### Phase 2: Prepare Hadoop (10 mins)

- [ ] SSH to Hadoop: `ssh 10.76.1.41` (via ZeroTier)
- [ ] Create directory: `hdfs dfs -mkdir -p /bus-tracker/exports`
- [ ] Set permissions: `hdfs dfs -chmod 777 /bus-tracker/exports`
- [ ] Verify: `hdfs dfs -ls /bus-tracker`

### Phase 3: Test Connectivity (5 mins)

- [ ] Test ZeroTier: `ping 10.76.1.41`
- [ ] Test HDFS: 
  ```bash
  curl "http://10.76.1.41:9870/webhdfs/v1/?op=GETHOMEDIRECTORY&user.name=hdfs"
  ```
  Expected: HTTP 200 with JSON response

### Phase 4: Start App & Verify (10 mins)

- [ ] Start app: `npm run dev`
- [ ] Watch logs for: `✅ Batch scheduler initialized successfully`
- [ ] Leave running for 1 minute to verify no errors

### Phase 5: Test Export (5 mins)

**Option A: Manual API Call**
```bash
curl -X POST http://localhost:3000/api/admin/batch-jobs/run \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```
Expected: HTTP 202 (queued)

**Option B: Wait for Scheduled Time**
- Export runs at configured time (default: 2 AM UTC)
- Check logs for progress

### Phase 6: Verify in Hadoop (5 mins)

- [ ] SSH to Hadoop: `ssh 10.76.1.41`
- [ ] List exports: `hdfs dfs -ls /bus-tracker/exports`
- [ ] Check today's files: `hdfs dfs -ls /bus-tracker/exports/$(date +%Y-%m-%d)`
- [ ] Verify content: `hdfs dfs -cat /bus-tracker/exports/*/buses-*.json | head -20`

---

## File Structure Created

```
bus-tracker-web/
├── src/lib/
│   ├── batch-export.ts          ← Core export logic
│   ├── hdfs-uploader.ts         ← HDFS upload
│   ├── batch-scheduler.ts       ← Job scheduler
│   └── init-batch-scheduler.ts  ← Initialization
├── src/app/
│   ├── api/admin/
│   │   └── batch-jobs/
│   │       └── route.ts         ← API endpoints
│   └── layout.tsx               ← MODIFIED (scheduler init)
├── docs/
│   └── BATCH_EXPORT_HADOOP.md   ← Full documentation
├── scripts/
│   └── setup-batch-export.sh    ← Setup script
├── .env.example.hadoop          ← Config template
├── BATCH_EXPORT_SETUP.md        ← Quick start
├── COMMAND_REFERENCE.md         ← Commands
└── package.json                 ← MODIFIED (node-cron added)
```

---

## Verification Checklist

After setup, verify everything works:

### Local Verification
- [ ] `ls -lah batch-exports/` shows JSON files
- [ ] Files are < 1 hour old (recent export)
- [ ] `jq . batch-exports/*.json` parses without errors
- [ ] Record counts look reasonable

### HDFS Verification
- [ ] `hdfs dfs -ls /bus-tracker/exports/` shows date directories
- [ ] Files match local exports
- [ ] No "Permission denied" errors
- [ ] Sizes match (WebHDFS upload works)

### Scheduling Verification
- [ ] App starts without errors
- [ ] Logs show batch scheduler initialized
- [ ] Cron time is visible in logs
- [ ] No errors in 5-minute observation window

---

## Troubleshooting Quick Links

### Common Issues

| Issue | Solution |
|-------|----------|
| "Connection refused" to HDFS | Verify ZeroTier `ping 10.76.1.41` |
| "Permission denied" in HDFS | Run `hdfs dfs -chmod 777 /bus-tracker/exports` |
| Batch job never runs | Check `BATCH_JOB_ENABLED=true` in .env.local |
| Memory errors during export | Set `NODE_OPTIONS=--max-old-space-size=4096` |
| API endpoint returns 403 | Verify admin role in auth token |
| Files not uploading | Check `HDFS_UPLOAD_METHOD=webhdfs` |

See `COMMAND_REFERENCE.md` for full debugging commands.

---

## Data Flow Diagram

```
PostgreSQL Database
    ↓
batch-export.ts (streams records)
    ↓ JSON files
batch-exports/ folder (local)
    ↓
hdfs-uploader.ts (via ZeroTier)
    ↓ WebHDFS API
10.76.1.41:9870/webhdfs
    ↓
Hadoop HDFS (/bus-tracker/exports)
    ↓
Query with Hive/Spark/Direct HDFS
```

---

## Success Indicators ✅

You'll know it's working when:

1. ✅ App starts with batch scheduler message
2. ✅ Local JSON files appear in `batch-exports/`
3. ✅ Files also appear in HDFS `/bus-tracker/exports/`
4. ✅ Manual API calls return HTTP 202
5. ✅ Cron job runs at scheduled time (check logs)
6. ✅ Can query data with Hive/Spark

---

## Estimated Timeline

| Phase | Time | Status |
|-------|------|--------|
| Install & Config | 15 min | ⏳ TODO |
| Hadoop Prep | 10 min | ⏳ TODO |
| Connectivity Test | 5 min | ⏳ TODO |
| App Start | 10 min | ⏳ TODO |
| First Export | 5 min | ⏳ TODO |
| HDFS Verify | 5 min | ⏳ TODO |
| **Total** | **~50 mins** | ⏳ TODO |

---

## Questions?

Refer to:
1. **Quick answers** → `COMMAND_REFERENCE.md`
2. **Setup help** → `BATCH_EXPORT_SETUP.md`
3. **Full details** → `docs/BATCH_EXPORT_HADOOP.md`
4. **Automated setup** → `bash scripts/setup-batch-export.sh`

---

**Ready? Start with Phase 1:** `npm install`
