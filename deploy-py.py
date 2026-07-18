import os
import subprocess
import shutil
from pathlib import Path

TOKEN = "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"
SPACE_ID = "Bromeo777/rm-ubuzima5"
REPO_URL = f"https://huggingface.co/spaces/{SPACE_ID}"

print("🚀 Deploying RM Ubuzima to HF Spaces...\n")

# Check if dist exists
dist_path = Path("dist")
if not dist_path.exists():
    print("❌ dist/ folder not found! Run npm run build first")
    exit(1)

# Create temp directory
deploy_dir = Path("hf-deploy-temp")
if deploy_dir.exists():
    shutil.rmtree(deploy_dir)
deploy_dir.mkdir()

# Setup git environment
env = os.environ.copy()
env["GIT_ASKPASS"] = "echo"
env["GIT_USERNAME"] = "token"
env["GIT_PASSWORD"] = TOKEN

try:
    # Clone the space
    print("📥 Cloning space...")
    subprocess.run(
        ["git", "clone", REPO_URL, str(deploy_dir)],
        env=env,
        check=True,
        capture_output=True
    )
    
    # Change to deploy directory
    os.chdir(deploy_dir)
    
    # Update remote URL with token
    remote_url = f"https://token:{TOKEN}@huggingface.co/spaces/{SPACE_ID}"
    subprocess.run(
        ["git", "remote", "set-url", "origin", remote_url],
        check=True,
        capture_output=True
    )
    
    # Remove all files except .git
    for item in Path(".").iterdir():
        if item.name != ".git":
            if item.is_dir():
                shutil.rmtree(item)
            else:
                item.unlink()
    
    # Copy dist files
    print("📦 Copying dist files...")
    for item in Path("../dist").iterdir():
        if item.is_dir():
            shutil.copytree(item, item.name, dirs_exist_ok=True)
        else:
            shutil.copy2(item, item.name)
    
    # Configure git
    subprocess.run(["git", "config", "user.email", "deploy@rm-ubuzima.com"], check=True)
    subprocess.run(["git", "config", "user.name", "Deploy Bot"], check=True)
    
    # Add, commit, push
    print("🚀 Pushing to HF Spaces...")
    subprocess.run(["git", "add", "-A"], check=True)
    
    # Check if there are changes to commit
    result = subprocess.run(
        ["git", "status", "--porcelain"],
        capture_output=True,
        text=True
    )
    
    if result.stdout.strip():
        subprocess.run(
            ["git", "commit", "-m", "Deploy RM Ubuzima"],
            check=True
        )
        subprocess.run(
            ["git", "push", "origin", "main"],
            check=True
        )
        print("\n✅ DEPLOYED SUCCESSFULLY!")
    else:
        print("\nℹ️  No changes to deploy (already up to date)")
    
    print(f"🔗 URL: https://huggingface.co/spaces/{SPACE_ID}")
    print("⏱️  Wait 1-2 minutes for build to complete\n")
    
except subprocess.CalledProcessError as e:
    print(f"❌ Deployment failed: {e}")
    print(f"stderr: {e.stderr if hasattr(e, 'stderr') else 'N/A'}")
    exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)
finally:
    # Cleanup
    os.chdir("..")
    if deploy_dir.exists():
        shutil.rmtree(deploy_dir)
