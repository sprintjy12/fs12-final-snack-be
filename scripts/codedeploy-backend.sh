#!/bin/bash
set -e

export NVM_DIR="/home/ec2-user/.nvm"

if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"
fi

PROJECT_DIR="/home/ec2-user/snack/backend"
LOG_DIR="/home/ec2-user/snack/logs/backend"

mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/codedeploy-$(date '+%Y-%m-%d_%H-%M-%S').log"
exec > >(tee -a "$LOG_FILE") 2>&1

START_TIME=$(date +%s)

echo "====================================================="
echo "CodeDeploy Backend Deployment Started"
echo "Start Time : $(date '+%Y-%m-%d %H:%M:%S')"
echo "====================================================="

cd "$PROJECT_DIR"

echo
echo "[1/5] Remove node_modules"
rm -rf node_modules

echo
echo "[2/5] Install Packages"
npm install

echo
echo "[3/5] Prisma Generate"
npx prisma generate

echo
echo "[4/5] Apply Prisma Migrations"
npx prisma migrate deploy

echo
echo "[5/5] Restart PM2"

if pm2 describe backend > /dev/null 2>&1; then
    pm2 restart backend --update-env
else
    pm2 start npm --name backend -- start
fi

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo
echo "====================================================="
echo "CodeDeploy Backend Deployment Completed"
echo "Finish Time : $(date '+%Y-%m-%d %H:%M:%S')"
echo "Elapsed Time : ${ELAPSED} sec"
echo "====================================================="