import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './i18n';
import './index.css';
import { VideoProvider } from './contexts/VideoContext';

// Register Service Worker for PWA (production only).
// In development the cache-first SW can serve a stale JS bundle, which makes
// newly added routes (e.g. /mpuza/legal-human-rights) fall through to the
// "*" redirect and bounce the user back to the home page. We also proactively
// unregister any SW left over from a previous build while developing.
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
  } else {
    window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[PWA] SW registered:', registration.scope);
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New version available');
                // Optional: Show update notification to user
              }
            });
          }
        });
      })
      .catch((error) => {
        console.log('[PWA] SW registration failed:', error);
      });
    });
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <VideoProvider>
        <App />
      </VideoProvider>
    </BrowserRouter>
  </React.StrictMode>
);
