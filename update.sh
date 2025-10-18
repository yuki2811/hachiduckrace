#!/bin/bash
echo "🔄 Updating HachiDuckRace..."

# Backup current version
pm2 stop hachiduckrace

# Pull latest code (nếu dùng Git)
# git pull origin main

# Install new dependencies
npm install

# Start app
pm2 start ecosystem.config.js --env production

echo "✅ Update completed!"
pm2 status
