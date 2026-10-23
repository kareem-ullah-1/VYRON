const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning up dependencies...');

// Remove node_modules and package-lock.json
if (fs.existsSync('node_modules')) {
  console.log('Removing node_modules...');
  fs.rmSync('node_modules', { recursive: true, force: true });
}

if (fs.existsSync('package-lock.json')) {
  console.log('Removing package-lock.json...');
  fs.unlinkSync('package-lock.json');
}

console.log('📦 Installing fresh dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully!');
} catch (error) {
  console.error('❌ Error installing dependencies:', error.message);
  process.exit(1);
}
