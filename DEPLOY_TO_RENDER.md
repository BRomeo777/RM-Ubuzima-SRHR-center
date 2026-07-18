# Deploy Password Reset Server to Render (FREE - No Credit Card)

## What You're Deploying
A free backend server that sends 6-digit codes via email. No Blaze plan needed!

## Cost: $0/month (Free Tier)
- Render Web Service: FREE (spins down after 15 min idle, wakes on request)
- Brevo Email: 300 emails/day FREE
- Firebase Admin: Uses your existing project

---

## Step 1: Get Firebase Service Account Key

1. Go to https://console.firebase.google.com
2. Select your project **rm-ubuzima**
3. Click **Project Settings** (gear icon)
4. Go to **Service accounts** tab
5. Click **"Generate new private key"**
6. Click **"Generate key"**
7. Save the JSON file (don't lose it!)
8. Open the JSON file in Notepad
9. **Copy all the text** (Ctrl+A, Ctrl+C)

---

## Step 2: Sign Up for Render (FREE)

1. Go to https://render.com
2. Click **"Get Started for Free"**
3. Sign up with GitHub or email
4. **No credit card required!**

---

## Step 3: Create New Web Service

1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Connect your GitHub repo: **BRomeo777/RM-Ubuzima-**
3. If you don't see it, click **"Configure account"** and grant access
4. Select the repo
5. Configure:
   - **Name**: `rm-ubuzima-password-reset`
   - **Environment**: `Node`
   - **Build Command**: `cd password-reset-server && npm install`
   - **Start Command**: `cd password-reset-server && node server.js`
   - **Plan**: **Free** (important!)
6. Click **"Advanced"** to expand
7. Add Environment Variables:

---

## Step 4: Add Environment Variables

Click **"Add Environment Variable"** 3 times:

### Variable 1:
- **Key**: `BREVO_API_KEY`
- **Value**: `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`

### Variable 2:
- **Key**: `FIREBASE_SERVICE_ACCOUNT`
- **Value**: Paste the entire JSON from Step 1 (the long text you copied)

### Variable 3:
- **Key**: `FROM_EMAIL`
- **Value**: `rmubuzima@gmail.com`

### Variable 4:
- **Key**: `FROM_NAME`
- **Value**: `RM Ubuzima`

---

## Step 5: Deploy

1. Click **"Create Web Service"**
2. Wait 2-3 minutes for deployment
3. You'll get a URL like: `https://rm-ubuzima-password-reset.onrender.com`
4. **Copy this URL!**

---

## Step 6: Update Frontend

1. Go back to your project
2. Open file: `src/components/ForgotPasswordWizard.tsx`
3. Find this line near the top:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
```
4. Change it to:
```typescript
const API_BASE_URL = 'https://rm-ubuzima-password-reset.onrender.com'; // Replace with your actual URL
```
5. Save and push to GitHub

---

## Step 7: Test

1. Go to your website login page
2. Click "Forgot password?"
3. Enter your email
4. Check email for 6-digit code
5. Enter code, reset password, auto-login

---

## Troubleshooting

### "Build failed"
- Check that Build Command is exactly: `cd password-reset-server && npm install`
- Check that Start Command is exactly: `cd password-reset-server && node server.js`

### "FIREBASE_SERVICE_ACCOUNT invalid"
- Make sure you pasted the entire JSON file content
- No extra quotes needed, just paste the raw JSON

### "BREVO_API_KEY invalid"
- Verify the API key is correct
- Check if Brevo account is active

### Server sleeps (takes time to wake up)
- This is normal on free tier
- First request after idle takes ~30 seconds
- Add a loading message for users

---

## Need Help?

Check Render logs:
1. Go to https://dashboard.render.com
2. Click your service
3. Click "Logs" tab
4. See error messages

---

**Done! Your 6-digit password reset is live!** 🎉
