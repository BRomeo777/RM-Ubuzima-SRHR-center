# 6-Digit Code Password Reset - Complete Setup

## ⚠️ CRITICAL: Firebase Service Account Required

For the 6-digit code system to actually reset passwords, you need to add a **Firebase Service Account** to your Render environment variables.

---

## Step 1: Get Firebase Service Account Key

1. Go to https://console.firebase.google.com/project/rm-ubuzima/settings/serviceaccounts
2. Click **"Generate new private key"**
3. Click **"Generate key"** (downloads a JSON file)
4. Open the JSON file in Notepad or any text editor
5. **Copy ALL the text** (Ctrl+A, Ctrl+C)
6. It looks like this:
```json
{"type":"service_account","project_id":"rm-ubuzima","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"...","universe_domain":"googleapis.com"}
```

---

## Step 2: Add to Render Environment Variables

1. Go to https://dashboard.render.com
2. Click your **rm-ubuzima-email** service
3. Click **Environment** tab
4. Click **"Add Environment Variable"**
5. **Key**: `FIREBASE_SERVICE_ACCOUNT`
6. **Value**: Paste the entire JSON text from Step 1
7. Click **Save Changes**
8. Click **Manual Deploy** → **Deploy latest commit**

---

## Step 3: Test the System

1. Go to your website: `https://rm-ubuzima.netlify.app`
2. Click **"Forgot password?"**
3. Enter your email address
4. Click **"Send 6-Digit Code"**
5. Check your email inbox
6. You should receive an email with a 6-digit code like:
```
Your verification code: 482915
```
7. Enter the code on the website
8. Create a new password
9. You should be auto-logged in!

---

## What Was Fixed

### ✅ Bug Fixes Applied:
1. **Fixed API endpoint mismatch** - Frontend was calling wrong URL
2. **Added Firebase Admin SDK** - Backend can now actually reset passwords
3. **Added real password update logic** - Passwords are changed in Firebase Auth
4. **Added firebase-admin dependency** - Required for backend functionality

### ✅ Security Features:
- 6-digit codes (1 in 1,000,000 chance of guessing)
- 15-minute expiry
- Max 3 wrong attempts per code
- Max 3 sends per day per email
- Rate limiting by IP address
- Codes auto-delete after use
- Professional email template

---

## Troubleshooting

### "Firebase not initialized" error
- You didn't add the `FIREBASE_SERVICE_ACCOUNT` environment variable
- Follow Step 1 and Step 2 above

### "Failed to update password" error
- The service account JSON might be malformed
- Make sure you copied the ENTIRE JSON file content
- Don't add extra quotes or modify the JSON

### Not receiving emails
- Check spam/junk folder
- Verify Brevo account is active
- Check Render logs: https://dashboard.render.com → your service → Logs

### Code not working
- Codes expire after 15 minutes
- You have max 3 attempts per code
- Request a new code if expired

---

## How It Works

```
User clicks "Forgot password"
        ↓
Frontend calls: POST /api/send-reset-code
        ↓
Backend generates 6-digit code
        ↓
Backend sends email via Brevo
        ↓
User receives email with code
        ↓
User enters code
        ↓
Frontend calls: POST /api/verify-reset-code
        ↓
Backend verifies code
        ↓
User creates new password
        ↓
Frontend calls: POST /api/reset-password-with-code
        ↓
Backend verifies code again
        ↓
Backend updates password in Firebase Auth
        ↓
User is logged in automatically
```

---

## Cost: $0

- **Render**: Free tier (already running)
- **Brevo**: 300 emails/day free (already configured)
- **Firebase**: No additional cost

---

**You're ready to test once you add the Firebase Service Account!** 🎉
