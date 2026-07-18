// Firebase Configuration for Vite
// Uses import.meta.env for Vite environment variables

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Instructions to get your Firebase config:
// 1. Go to https://console.firebase.google.com
// 2. Create a new project (or use existing)
// 3. Click "Project settings" (gear icon)
// 4. Under "General", scroll to "Your apps" section
// 5. Click the web icon (</>) to add a web app
// 6. Register app with nickname "RM Ubuzima"
// 7. Copy the firebaseConfig object and paste it here
// 8. Enable Firestore Database from "Build" menu
// 9. Set Firestore rules to allow read/write (for development)
