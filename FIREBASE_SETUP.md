# Firebase Setup Instructions for RM Ubuzima

## Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click "Create Project"
3. Enter project name: "rm-ubuzima"
4. Disable Google Analytics (or enable if you want)
5. Click "Create Project"

## Step 2: Add Web App

1. Click the web icon (</>) "Add app"
2. Register app with nickname: "RM Ubuzima Web"
3. Click "Register app"
4. Copy the firebaseConfig object

## Step 3: Update Firebase Config

Open `src/services/firebaseConfig.ts` and replace the placeholder values:

```typescript
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

Replace with your actual values from Firebase console.

## Step 4: Enable Firestore Database

1. In Firebase console, click "Build" in left sidebar
2. Click "Firestore Database"
3. Click "Create database"
4. Choose "Start in production mode"
5. Select region: "eur3 (europe-west)" for Africa/Europe users
6. Click "Enable"

## Step 5: Set Firestore Rules

1. Go to Firestore Database > Rules tab
2. Replace with these rules for development:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ **WARNING**: These rules allow anyone to read/write. For production, add authentication.

3. Click "Publish"

## Step 6: Install Dependencies

Run this command in terminal:

```bash
npm install
```

This will install Firebase and all dependencies.

## Step 7: Test Firebase Connection

1. Start the dev server: `npm run dev`
2. Open browser console (F12)
3. Look for "Firebase initialized" or any errors
4. Create an AI post in Admin panel
5. Check if it appears in Firebase console > Firestore Database > Data

## Data Structure

Firebase will create these collections automatically:
- `aiPosts` - AI posts for daily feed
- `appointments` - Doctor appointments
- `organizations` - SRHR organizations
- `statusUpdates` - Status updates/stories
- `emergencyContacts` - Emergency contacts
- `facilities` - Health facilities
- `topics` - SRHR topics
- `articles` - Educational articles
- `settings` - Admin settings

## Troubleshooting

### "Cannot find module 'firebase/app'"
Run: `npm install`

### "Firebase: Error (auth/invalid-api-key)"
Check your firebaseConfig.ts has correct API key

### "Missing or insufficient permissions"
Update Firestore rules to allow read/write (Step 5)

### Data not syncing
1. Check browser console for errors
2. Verify Firestore rules are published
3. Check network tab for blocked requests

## Free Tier Limits

- 50,000 reads/day
- 20,000 writes/day  
- 1 GB storage
- Perfect for 1000+ users!

## Deploy After Firebase Setup

Once Firebase is configured:

```bash
npm run build
```

Upload `dist/` folder to:
- Hugging Face Spaces
- Render
- Netlify
- Vercel
- Any static host

Your app now has real-time sync across all users!
