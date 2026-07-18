# 🚀 QUICK DEPLOY GUIDE - RM Ubuzima

## ⚡ 3-STEP DEPLOY (After Firebase Setup)

### Step 1: Install & Build
```bash
npm install
npm run build
```

### Step 2: Run Deploy Script
```bash
node deploy.js
```

### Step 3: Upload to HF Spaces
Follow the instructions from deploy.js

---

## 🔥 FIREBASE SETUP (REQUIRED FIRST!)

### 1. Create Project (2 minutes)
- Go to: https://console.firebase.google.com
- Click "Create Project"
- Name: `rm-ubuzima`
- Click through to create

### 2. Get API Keys (30 seconds)
- Click `</>` (web icon) to add web app
- Nickname: `RM Ubuzima Web`
- Click "Register"
- **COPY the firebaseConfig values**

### 3. Paste Keys (30 seconds)
Open `src/services/firebaseConfig.ts` and replace:
```typescript
export const firebaseConfig = {
  apiKey: "YOUR-API-KEY",
  authDomain: "rm-ubuzima.firebaseapp.com",
  projectId: "rm-ubuzima",
  storageBucket: "rm-ubuzima.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### 4. Enable Firestore (1 minute)
- In Firebase console, click "Build" → "Firestore Database"
- Click "Create database"
- Select "Start in production mode"
- Choose region: `eur3 (europe-west)` (best for Africa)
- Click "Enable"

### 5. Set Rules (30 seconds)
- Go to Firestore → Rules tab
- Replace with:
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
- Click "Publish"

**✅ Firebase is ready! Now do the 3-step deploy above.**

---

## 📁 Files to Upload to HF Spaces

After `npm run build`, upload these from `dist/` folder:
- `index.html`
- `404.html` (already created!)
- `assets/` folder (contains JS/CSS)
- Any image/video files

---

## 🎯 What Works After Deploy

- ✅ All users see SAME AI posts
- ✅ Status updates (video/image/text) sync instantly
- ✅ Appointments visible to admin in real-time
- ✅ Data persists forever (cloud database)
- ✅ Works on phone, laptop, tablet

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot find module" | Run `npm install` |
| "Invalid API key" | Check firebaseConfig.ts |
| "Permission denied" | Update Firestore rules |
| Blank page | Check 404.html is uploaded |

---

## 💰 Free Forever

- Firebase: 50K reads/day, 20K writes/day, 1GB storage
- HF Spaces: Unlimited static hosting
- **Cost: $0 forever** (for your scale)

---

**Questions? Check FIREBASE_SETUP.md for detailed instructions.**
