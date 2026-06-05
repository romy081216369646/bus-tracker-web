#!/bin/bash
# ================================================================
# Quick Start: Batch Data Export to Hadoop via ZeroTier
# ================================================================

set -e

echo "📦 Bus Tracker - Batch Export Setup"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check Node.js
echo -e "${BLUE}✓ Step 1: Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js not found. Installing...${NC}"
    # Installation instructions would go here
else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js ${NODE_VERSION}${NC}"
fi
echo ""

# Step 2: Install dependencies
echo -e "${BLUE}✓ Step 2: Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 3: Setup environment
echo -e "${BLUE}✓ Step 3: Setting up environment...${NC}"

if [ ! -f .env.local ]; then
    echo -e "${YELLOW}Creating .env.local from template...${NC}"
    
    cat > .env.local << 'EOF'
# Batch Job Configuration
BATCH_JOB_ENABLED=true
BATCH_JOB_SCHEDULE="0 0 2 * * *"
BATCH_CLEANUP_DAYS=30

# HDFS via ZeroTier
HDFS_HOST=10.76.1.41
HDFS_PORT=9870
HDFS_USER=hdfs
HDFS_BASE_DIR=/bus-tracker/exports
HDFS_UPLOAD_METHOD=webhdfs
EOF
    
    echo -e "${GREEN}✓ .env.local created${NC}"
    echo -e "${YELLOW}Please edit .env.local to customize settings${NC}"
else
    echo -e "${GREEN}✓ .env.local already exists${NC}"
fi
echo ""

# Step 4: Test connectivity
echo -e "${BLUE}✓ Step 4: Testing ZeroTier connectivity...${NC}"
if ping -c 1 10.76.1.41 &> /dev/null; then
    echo -e "${GREEN}✓ Connected to 10.76.1.41${NC}"
else
    echo -e "${YELLOW}⚠ Cannot reach 10.76.1.41 - Verify ZeroTier is connected${NC}"
fi
echo ""

# Step 5: Test HDFS
echo -e "${BLUE}✓ Step 5: Testing HDFS WebHDFS API...${NC}"
if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        "http://10.76.1.41:9870/webhdfs/v1/?op=GETHOMEDIRECTORY&user.name=hdfs" \
        2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ HDFS WebHDFS accessible${NC}"
    else
        echo -e "${YELLOW}⚠ HDFS WebHDFS returned HTTP ${HTTP_CODE}${NC}"
        echo -e "${YELLOW}   Verify Hadoop NameNode is running on 10.76.1.41:9870${NC}"
    fi
else
    echo -e "${YELLOW}⚠ curl not found - cannot test HDFS${NC}"
fi
echo ""

# Step 6: Verify HDFS directory
echo -e "${BLUE}✓ Step 6: Verifying HDFS directory...${NC}"
if command -v hdfs &> /dev/null; then
    if hdfs dfs -test -d /bus-tracker/exports 2>/dev/null; then
        echo -e "${GREEN}✓ HDFS directory /bus-tracker/exports exists${NC}"
    else
        echo -e "${YELLOW}⚠ HDFS directory /bus-tracker/exports not found${NC}"
        echo -e "${YELLOW}   Create with: hdfs dfs -mkdir -p /bus-tracker/exports${NC}"
    fi
else
    echo -e "${YELLOW}⚠ hdfs command not available${NC}"
    echo -e "${YELLOW}   Ensure Hadoop client tools are installed${NC}"
fi
echo ""

# Step 7: Summary
echo -e "${BLUE}================================================================${NC}"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo ""
echo "📖 Documentation: docs/BATCH_EXPORT_HADOOP.md"
echo ""
echo "🚀 Next Steps:"
echo "  1. Review and edit .env.local with your settings"
echo "  2. Start the app: npm run dev"
echo "  3. Check logs for batch scheduler initialization"
echo "  4. Trigger a test export: POST /api/admin/batch-jobs/run"
echo ""
echo "📊 Monitor Batch Jobs:"
echo "  - Check status: curl http://localhost:3000/api/admin/batch-jobs"
echo "  - View exports: ls -lah batch-exports/"
echo "  - Verify in HDFS: hdfs dfs -ls /bus-tracker/exports"
echo ""
echo -e "${BLUE}================================================================${NC}"
