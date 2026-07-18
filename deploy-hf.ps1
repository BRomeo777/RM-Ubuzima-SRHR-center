# PowerShell Deploy Script for HF Spaces
$SPACE_URL = "https://huggingface.co/spaces/Bromeo777/rm-ubuzima5"
$TOKEN = "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"
$REPO_URL = "https://$TOKEN@huggingface.co/spaces/Bromeo777/rm-ubuzima5"

Write-Host "Deploying RM Ubuzima to HF Spaces..."
Write-Host ""

# Check if dist exists
if (-Not (Test-Path "dist")) {
    Write-Host "dist/ folder not found! Run npm run build first"
    exit 1
}

# Create temp deploy directory
$deployDir = "hf-deploy-temp"
if (Test-Path $deployDir) {
    Remove-Item -Recurse -Force $deployDir
}
New-Item -ItemType Directory -Name $deployDir | Out-Null
Set-Location $deployDir

# Clone the space
Write-Host "Cloning space..."
git clone $REPO_URL .

# Remove old files except .git
Get-ChildItem -Exclude ".git" | Remove-Item -Recurse -Force

# Copy dist files
Write-Host "Copying dist files..."
Copy-Item -Path "..\dist\*" -Destination "." -Recurse -Force

# Configure git
git config user.email "deploy@rm-ubuzima.com"
git config user.name "Deploy Bot"

# Add all files
git add -A

# Commit
git commit -m "Deploy RM Ubuzima"

# Push to deploy
Write-Host "Pushing to HF Spaces..."
git push origin main

# Go back and cleanup
Set-Location ..
Remove-Item -Recurse -Force $deployDir

Write-Host ""
Write-Host "DEPLOYED SUCCESSFULLY!"
Write-Host "URL: $SPACE_URL"
Write-Host "Wait 1-2 minutes for build to complete"
Write-Host ""
