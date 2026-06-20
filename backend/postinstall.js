/**
 * Hostinger runs `npm install` before the entry file with NODE_ENV=production set in the dashboard.
 * Build the React app here when there is no custom build-command field on the platform.
 */
const { execSync } = require('child_process');
const path = require('path');

if (process.env.NODE_ENV !== 'production') {
  process.exit(0);
}

const root = path.join(__dirname, '..');

console.log('[postinstall] NODE_ENV=production — building React app...');
execSync('npm run build', { stdio: 'inherit', cwd: root, env: process.env });
