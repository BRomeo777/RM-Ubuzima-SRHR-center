# RM Ubuzima - Anonymous SRHR Information Platform

A privacy-first, anonymous SRHR (Sexual and Reproductive Health and Rights) information platform with AI-powered daily feeds, designed for the Rwandan community.

## Features

- **Anonymous Authentication**: No email, no phone, no tracking. Complete anonymity.
- **AI Daily Feeds**: 5 AI specialists generate daily SRHR content:
  - Dr.R - SRHR Specialist
  - Dr.M - Mental Health & SRHR Specialist
  - Dr.B - Addiction Recovery Specialist
  - Did You Know? - Curiosity Engine
  - Ubuzima Admin - Platform Guide
- **Find Services**: Google Maps integration for nearby hospitals, health centers, and pharmacies
- **Book a Doctor**: Anonymous appointment scheduling
- **Weekly Baza Muganga**: Friday 7-8PM health discussions via Jitsi Meet
- **SRHR Information**: Admin-uploaded educational content
- **Emergency Contacts**: One-tap emergency assistance
- **4 Languages**: English, Kinyarwanda, French, Swahili
- **Decoy Mode**: Ctrl+B instantly switches to documentation view
- **Privacy-First**: No data retention, no cookies, no tracking

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand with persist middleware
- **Backend**: Firebase Firestore (real-time sync)
- **Maps**: Google Maps API
- **AI**: Groq API (llama-3.3-70b)
- **Deployment**: Hugging Face Spaces (Free Tier)

## 🚀 Quick Deploy (3 Steps)

### 1. Firebase Setup (Required!)

```bash
# Follow detailed guide:
cat QUICK_DEPLOY.md
```

Quick version:
- Create project at https://console.firebase.google.com
- Copy API keys to `src/services/firebaseConfig.ts`
- Enable Firestore Database

### 2. Build

```bash
npm install
npm run build
```

### 3. Deploy

```bash
node deploy.js
# Follow instructions to upload to HF Spaces
```

## 📱 Data Sync (Firebase)

With Firebase enabled:
- ✅ All users see the same AI posts
- ✅ Status updates (video/image/text) sync in real-time
- ✅ Appointments visible instantly to admin
- ✅ Data persists across devices
- ✅ Works on phone, laptop, tablet

## 💰 Free Tier Limits

- **Firebase**: 50K reads/day, 20K writes/day, 1GB storage
- **HF Spaces**: Unlimited static hosting
- **Cost**: $0 forever (perfect for 1000+ users)

## Storage Strategy

- **Firebase Firestore**: Cloud sync for AI posts, appointments, organizations, status updates, emergency contacts, facilities
- **localStorage**: Admin settings, user preferences, auth state
- **sessionStorage**: Session data only

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd rm-ubuzima

# Install dependencies
npm install

# Start development server
npm run dev
```

### Building for Production

```bash
npm run build
```

## Deployment to Hugging Face Spaces

1. Create a new Space on Hugging Face (Docker template)
2. Clone the Space repository
3. Copy your built files or push this entire repository
4. The Dockerfile will handle the build automatically

## Configuration

### Admin Setup

1. Visit `/admin` after deployment
2. Create an admin password on first login
3. Configure:
   - Grok API key for AI content generation
   - Doctor email for appointment notifications
   - Jitsi room link for Baza Muganga
   - Platform logo and AI avatar

### AI Content Generation

The platform uses Grok API for generating AI posts. Set your API key in the admin panel under "System Settings".

## Privacy & Security

- No personal data collection
- No tracking cookies
- Anonymous session management
- Client-side data only
- Decoy mode for user safety (Ctrl+B)
- End-to-end encryption for video calls

## License

© 2026 RM Ubuzima. All rights reserved.

Powered by Dr.R Technologies
Contact: bananeza777@gmail.com | +250 783 679 400
