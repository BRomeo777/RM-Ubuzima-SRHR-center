import { execSync } from 'child_process';
import fs from 'fs';

const TOKEN = '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';
const SPACE_ID = 'Bromeo777/rm-ubuzima5';
const REPO_URL = `https://${TOKEN}@huggingface.co/spaces/${SPACE_ID}`;

console.log('🚀 Deploying RM Ubuzima to HF Spaces...\n');

// Check if dist exists
if (!fs.existsSync('dist')) {
  console.error('❌ dist/ folder not found! Run npm run build first');
  process.exit(1);
}

// Create temp directory
const deployDir = 'hf-deploy-temp';
if (fs.existsSync(deployDir)) {
  fs.rmSync(deployDir, { recursive: true });
}
fs.mkdirSync(deployDir);

// Clone the space
try {
  console.log('📥 Cloning space...');
  execSync(`git clone ${REPO_URL} ${deployDir}`, { stdio: 'inherit' });
  
  // Go into directory
  process.chdir(deployDir);
  
  // Remove all files except .git
  const files = fs.readdirSync('.');
  for (const file of files) {
    if (file !== '.git') {
      fs.rmSync(file, { recursive: true });
    }
  }
  
  // Copy dist files
  console.log('📦 Copying dist files...');
  const distFiles = fs.readdirSync('../dist');
  for (const file of distFiles) {
    fs.cpSync(`../dist/${file}`, file, { recursive: true });
  }
  
  // Configure git
  execSync('git config user.email "deploy@rm-ubuzima.com"');
  execSync('git config user.name "Deploy Bot"');
  
  // Add, commit, push
  console.log('🚀 Pushing to HF Spaces...');
  execSync('git add -A', { stdio: 'inherit' });
  execSync('git commit -m "Deploy RM Ubuzima"', { stdio: 'inherit' });
  execSync('git push origin main', { stdio: 'inherit' });
  
  console.log('\n✅ DEPLOYED SUCCESSFULLY!');
  console.log('🔗 URL: https://huggingface.co/spaces/Bromeo777/rm-ubuzima5');
  console.log('⏱️  Wait 1-2 minutes for build to complete\n');
  
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
} finally {
  // Cleanup
  process.chdir('..');
  if (fs.existsSync(deployDir)) {
    fs.rmSync(deployDir, { recursive: true });
  }
}
