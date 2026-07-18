import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Simple deploy script for Hugging Face Spaces
console.log('🚀 RM Ubuzima Deployment Script\n');

// Check if dist exists
if (!fs.existsSync('dist')) {
  console.log('❌ dist/ folder not found!');
  console.log('Run: npm run build\n');
  process.exit(1);
}

console.log('✅ dist/ folder found\n');

// Instructions for manual upload
console.log('📦 To deploy to Hugging Face Spaces:\n');
console.log('1. Go to: https://huggingface.co/spaces');
console.log('2. Click "Create new Space"');
console.log('3. Choose:\n   - Owner: (your username)\n   - Space name: rm-ubuzima\n   - License: apache-2.0\n   - Select: Static (under SDK)\n');
console.log('4. Click "Create Space"\n');
console.log('5. Upload files:\n   - Click "Files and versions" tab\n   - Click "Upload files"\n   - Select ALL files from dist/ folder\n   - Click "Commit files to main"\n');
console.log('6. Wait 1-2 minutes\n');
console.log('7. Click "App" tab to see your live site!\n');

console.log('🔗 Your app will be at:');
console.log('   https://huggingface.co/spaces/YOUR_USERNAME/rm-ubuzima\n');

console.log('✨ Done!');
