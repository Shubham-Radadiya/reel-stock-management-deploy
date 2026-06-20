/**
 * Hostinger entry file: builds the React app if needed, then starts the API + static UI.
 * Set Entry file to backend/start.js (not backend/server.js).
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const buildIndex = path.join(root, 'build', 'index.html');

if (!fs.existsSync(buildIndex)) {
  console.log('[start] build/index.html not found — running npm run build...');
  execSync('npm run build', { stdio: 'inherit', cwd: root, env: process.env });
}

require('./server.js');
