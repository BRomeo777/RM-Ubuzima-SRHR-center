import { execSync } from 'child_process';
import fs from 'fs';

const TOKEN = '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';
const SPACE_ID = 'Bromeo777/rm-ubuzima5';

console.log('🚀 Deploying RM Ubuzima to HF Spaces...\n');

// Check if dist exists
if (!fs.existsSync('dist')) {
  console.error('❌ dist/ folder not found! Run npm run build first');
  process.exit(1);
}

// Create temp directory
const deployDir = 'hf-deploy-temp';
if (fs.existsSync(deployDir)) {
  fs.rmSync(deployDir, { recursive: true, force: true });
}
fs.mkdirSync(deployDir);

// Set up git credential helper
process.env.GIT_ASKPASS = 'echo';
process.env.GIT_USERNAME = 'token';
process.env.GIT_PASSWORD = TOKEN;

// Clone the space using credential helper
try {
  console.log('📥 Cloning space...');
  execSync(`git clone https://huggingface.co/spaces/${SPACE_ID} ${deployDir}`, {
    env: { ...process.env, GIT_ASKPASS: 'echo', GIT_USERNAME: 'token', GIT_PASSWORD: TOKEN }
  });
  
  // Go into directory
  process.chdir(deployDir);
  
  // Configure git with token
  execSync(`git remote set-url origin https://token:${TOKEN}@huggingface.co/spaces/${SPACE_ID}`);
  
  // Remove all files except .git
  const files = fs.readdirSync('.');
  for (const file of files) {
    if (file !== '.git') {
      fs.rmSync(file, { recursive: true, force: true });
    }
  }
  
  // Copy dist files
  console.log('📦 Copying dist files...');
  const distFiles = fs.readdirSync('../dist');
  for (const file of distFiles) {
    fs.cpSync(`../dist/${file}`, file, { recursive: true, force: true });
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
  console.log('\nTrying alternative method...');
  
  // Try with git credential store
  try {
    execSync('git config --global credential.helper store');
    execSync(`echo "https://token:${TOKEN}@huggingface.co" | git credential-store store`);
    execSync('git push origin main', { stdio: 'inherit' });
    console.log('\n✅ DEPLOYED SUCCESSFULLY (alternative method)!');
  } catch (error2) {
    console.error('❌ Alternative method also failed:', error2.message);
    process.exit(1);
  }
} finally {
  // Cleanup
  process.chdir('..');
  if (fs.existsSync(deployDir)) {
    fs.rmSync(deployDir, { recursive: true, force: true });
  }
}
