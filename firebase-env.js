// Firebase Environment Config Loader (Secure)
// Usage: import { getFirebaseConfig } from './firebase-env.js'; then firebaseConfig = await getFirebaseConfig();

export async function getFirebaseConfig() {
  // Production: Load from Firebase Hosting env_developers
  if (typeof window !== 'undefined' && window.firebaseEnv) {
    return window.firebaseEnv;
  }
  
  // Dev fallback (local development)
  return {
    apiKey: "AIzaSyCLlx0cQT0u1jxKbSqZi9MwSRi6fuj05k0",
    authDomain: "ela-esports.firebaseapp.com",
    projectId: "ela-esports",
    storageBucket: "ela-esports.appspot.com",
    messagingSenderId: "431280898661",
    appId: "1:431280898661:web:4a5b6c7d8e9f0g1h2i3j4"
  };
}
