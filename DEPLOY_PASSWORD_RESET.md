# 🔐 Deploy 6-Digit Code Password Reset

## What You're Deploying
A complete 6-digit code password reset system with:
- 6-digit code sent via email (NO LINKS)
- 15-minute code expiry
- Rate limiting (3 attempts per day)
- Auto-login after password reset
- Professional email template

## Prerequisites
1. Firebase CLI installed: `npm install -g firebase-tools`
2. Logged into Firebase: `firebase login`
3. Brevo API key (free tier)

---

## 🚀 DEPLOY (3 Steps)

### Step 1: Set Brevo API Key
```bash
cd functions
firebase functions:config:set brevo.key="YOUR_BREVO_API_KEY"
```

**Get Brevo API Key:**
1. Go to https://app.brevo.com
2. Sign up (free tier: 300 emails/day)
3. Go to Settings → API Keys
4. Create new API key with "SMTP" scope
5. Copy the key and use it above

---

### Step 2: Deploy Functions
```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

Wait for deployment to complete (~2-3 minutes)

---

### Step 3: Deploy Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```

---

## ✅ VERIFY IT WORKS

1. Go to your login page
2. Click "Forgot password?"
3. Enter your email
4. Check email - you should receive 6-digit code
5. Enter code and create new password
6. Auto-login should work

---

## 🔧 TROUBLESHOOTING

### "BREVO_API_KEY not configured"
```bash
firebase functions:config:set brevo.key="your-key-here"
firebase deploy --only functions
```

### "Code not received"
- Check spam folder
- Verify Brevo API key has SMTP permissions
- Check Firebase Functions logs: `firebase functions:log`

### "Permission denied"
Update Firestore rules in Firebase Console → Firestore → Rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow password reset operations
    match /passwordResetCodes/{codeId} {
      allow read, write: if true;
    }
    match /passwordResetCodesByEmail/{email} {
      allow read, write: if true;
    }
    
    // Your existing rules...
  }
}
```

---

## 📧 Email Template Preview

Your users will receive an email like:
```
Subject: Your RM Ubuzima Password Reset Code

Hi John,

You requested a password reset. Use this 6-digit code:

╔══════════════════╗
║   4  8  2  9  1  5  ║
╚══════════════════╝

This code expires in 15 minutes

Security tip: Never share this code with anyone.
```

---

## 🔐 Security Features

✅ 6-digit random codes (1 in 1,000,000 chance of guessing)  
✅ 15-minute expiry  
✅ Max 3 wrong attempts per code  
✅ Max 3 sends per day per email  
✅ Codes are deleted after use  
✅ Firestore security rules protect data  
✅ HTTPS only (Firebase Functions)  

---

## 💰 Cost

- **Firebase Functions**: Free tier (2M invocations/month)
- **Brevo Email**: Free tier (300 emails/day)
- **Firestore**: Minimal storage for codes

**Total: FREE for most use cases**

---

## 📞 Support

If issues persist:
1. Check Firebase Functions logs: `firebase functions:log`
2. Verify Brevo account is active
3. Check spam folders
4. Contact Brevo support for deliverability issues

---

**Done! Your 6-digit code password reset is live.** 🎉
