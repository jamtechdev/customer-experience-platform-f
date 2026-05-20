const fs = require('fs');
const path = require('path');

const appDir = __dirname;
const logsDir = path.join(appDir, 'logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const frontendInstances = process.env.FRONTEND_INSTANCES || 1;

/*
Production deploy from this frontend repo:

  npm ci
  npm run build
  pm2 start ecosystem.production.config.js --env production
  pm2 save

Required frontend/.env before build:
  NODE_ENV=production
  NG_APP_API_URL=https://your-api-domain.com/api
  NG_APP_PRODUCTION=true

The Angular build generates src/assets/env.js from frontend/.env.
Rebuild after changing NG_APP_API_URL.
*/

module.exports = {
  apps: [
    {
      name: 'sentimenter-frontend-ssr',
      cwd: appDir,
      script: './dist/sentimenter-cx/server/server.mjs',
      instances: frontendInstances,
      exec_mode: Number(frontendInstances) > 1 || frontendInstances === 'max' ? 'cluster' : 'fork',
      watch: false,
      autorestart: true,
      max_memory_restart: process.env.FRONTEND_MAX_MEMORY || '768M',
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 10000,
      env_production: {
        NODE_ENV: 'production',
        PORT: Number(process.env.PORT || 4000),
        NG_APP_PRODUCTION: 'true',
      },
      error_file: path.join(logsDir, 'pm2-error.log'),
      out_file: path.join(logsDir, 'pm2-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
