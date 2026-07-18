import fs from 'fs';
import path from 'path';

const TOKEN = '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';
const SPACE_ID = 'Bromeo777/rm-ubuzima5';
const API_URL = `https://huggingface.co/api/spaces/${SPACE_ID}/upload`;

async function uploadFile(filePath, destPath) {
  const content = fs.readFileSync(filePath);
  
  const response = await fetch(`${API_URL}/${destPath}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/octet-stream',
    },
    body: content,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to upload ${destPath}: ${response.statusText}`);
  }
  
  console.log(`✅ Uploaded: ${destPath}`);
}

async function uploadDirectory(localDir, remoteDir = '') {
  const entries = fs.readdirSync(localDir, { withFileTypes: true });
  
  for (const entry of entries) {
    const localPath = path.join(localDir, entry.name);
    const remotePath = remoteDir ? `${remoteDir}/${entry.name}` : entry.name;
    
    if (entry.isDirectory()) {
      await uploadDirectory(localPath, remotePath);
    } else {
      await uploadFile(localPath, remotePath);
    }
  }
}

async function deploy() {
  console.log('🚀 Deploying RM Ubuzima to HF Spaces...\n');
  
  if (!fs.existsSync('dist')) {
    console.error('❌ dist/ folder not found! Run npm run build first');
    process.exit(1);
  }
  
  try {
    await uploadDirectory('dist');
    console.log('\n✅ DEPLOYED SUCCESSFULLY!');
    console.log('🔗 URL: https://huggingface.co/spaces/Bromeo777/rm-ubuzima5');
    console.log('⏱️  Wait 1-2 minutes for build to complete\n');
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

deploy();
