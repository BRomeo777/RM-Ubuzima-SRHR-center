#!/bin/bash
# Deploy script for HF Spaces using git

SPACE_URL="https://huggingface.co/spaces/Bromeo777/rm-ubuzima5"
TOKEN="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"

# Create a temp directory for deployment
mkdir -p hf-deploy
cd hf-deploy

# Clone the space (using token)
git clone https://$TOKEN@huggingface.co/spaces/Bromeo777/rm-ubuzima5 .

# Copy dist files
cp -r ../dist/* .

# Add all files
git add .

# Commit
git commit -m "Deploy RM Ubuzima"

# Push to deploy
git push origin main

echo "✅ Deployed to $SPACE_URL"
echo "🚀 Wait 1-2 minutes then visit your space!"
