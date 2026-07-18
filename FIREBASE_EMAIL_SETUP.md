# Firebase Email System Setup - COMPLETE GUIDE

## 🎯 What You Get
- **Password Reset** → Works via Firebase Cloud Functions + Brevo
- **Appointment Confirmations** → Beautiful emails sent via Brevo
- **Welcome Emails** → Automatic on user signup
- **Admin Notifications** → When appointments are booked
- **No External Server** → Everything runs on Firebase (FREE!)

## 📋 Prerequisites
- Firebase project: `rm-ubuzima`
- Brevo account with API key
- Node.js installed

## 🚀 Step-by-Step Deployment

### Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase

```bash
cd c:\Users\USER\CascadeProjects\rm-ubuzima
firebase login
```

### Step 3: Install Dependencies

```bash
cd functions
npm install
cd ..
```

### Step 4: Set Firebase Config (CRITICAL!)

```bash
firebase functions:config:set brevo.key="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"
```

### Step 5: Deploy Functions

```bash
firebase deploy --only functions
```

### Step 6: Update Frontend (index.html)

Remove the old email server URL from `index.html`:

**DELETE this section:**
```html
<!-- RM Ubuzima Email API Configuration -->
<script>
  window.EMAIL_API_URL = 'https://rm-ubuzima-email.onrender.com/api';
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.EMAIL_API_URL = window.EMAIL_API_URL || 'http://localhost:3000/api';
  }
</script>
```

### Step 7: Use Firebase Email Service

In your components, import and use:

```typescript
import { firebaseEmailService } from '../services/firebaseEmailService';

// Send password reset
await firebaseEmailService.sendPasswordReset({
  email: userEmail,
  name: userName,
  resetUrl: 'https://rm-ubuzima.netlify.app/reset-password?token=...'
});

// Send appointment confirmation
await firebaseEmailService.sendAppointmentConfirmation({
  patientEmail: email,
  patientName: name,
  doctorName: doctor,
  specialty: spec,
  appointmentDate: date,
  appointmentTime: time,
  location: loc,
  referenceNumber: ref
});
```

## 🔧 Firebase Console Setup

### Enable Blaze Plan (Pay-as-you-go)
1. Go to https://console.firebase.google.com
2. Select your project
3. Click "Upgrade" (top left)
4. Select "Blaze" plan
5. **Cost: $0 until you exceed free tier (2M calls/month)**

### Enable Functions
1. Firebase Console → Build → Functions
2. Click "Get Started"
3. Wait for activation (1-2 minutes)

## ✅ Testing

After deployment, test in browser console:

```javascript
// Check health
const result = await firebaseEmailService.checkHealth();
console.log(result);

// Test password reset
await firebaseEmailService.sendPasswordReset({
  email: 'your-email@gmail.com',
  name: 'Test User',
  resetUrl: 'https://rm-ubuzima.netlify.app/reset-password?token=test123'
});
```

## 📧 Available Functions

| Function | Purpose |
|----------|---------|
| `sendPasswordReset` | Password reset email |
| `sendAppointmentConfirmation` | Appointment confirmation to patient |
| `sendWelcomeEmail` | Welcome email on signup |
| `checkHealth` | Check if email service is working |

## 💰 Cost Breakdown (100 emails/day)

| Service | Free Tier | Your Usage | Cost |
|---------|-----------|------------|------|
| Firebase Functions | 2M calls/month | 3,000 calls | **$0** |
| Outbound Data | 10 GB | ~10 MB | **$0** |
| Brevo API | 300 emails/day | 100 emails | **$0** |
| **TOTAL** | | | **$0** |

## 🆘 Troubleshooting

### "Error: BREVO_API_KEY not configured"
→ Run: `firebase functions:config:set brevo.key="YOUR_KEY"`

### "Functions not deployed"
→ Run: `firebase deploy --only functions`

### "CORS Error"
→ Firebase Functions handle CORS automatically - no action needed!

### "Emails not sending"
→ Check Brevo dashboard for API limits
→ Verify API key starts with `xkeysib-` (API v3, not SMTP)

## 🎉 Success!

After deployment:
1. ✅ Password reset works
2. ✅ Appointment confirmations send
3. ✅ Welcome emails on signup
4. ✅ Admin notifications
5. ✅ Everything runs on Firebase
6. ✅ Cost: $0

**No more external server needed!** 🚀
