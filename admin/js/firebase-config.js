/* ==========================================================================
   FIREBASE CONFIGURATION
   Admin App & Customer Sync Backend Config
   Placeholder values below — Ali boss can insert real project keys.
   ========================================================================== */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSy_YOUR_PLACEHOLDER_API_KEY",
  authDomain: "restaurant-qr-menu-prod.firebaseapp.com",
  projectId: "restaurant-qr-menu-prod",
  storageBucket: "restaurant-qr-menu-prod.appspot.com",
  messagingSenderId: "1029384756",
  appId: "1:1029384756:web:9876543210abcdef",
  // Optional Realtime Database URL
  databaseURL: "https://restaurant-qr-menu-prod-default-rtdb.firebaseio.com"
};

// Check if Firebase keys are real or placeholders
function isFirebaseConfigured() {
  return Boolean(
    FIREBASE_CONFIG.apiKey &&
    !FIREBASE_CONFIG.apiKey.includes("PLACEHOLDER") &&
    FIREBASE_CONFIG.projectId &&
    !FIREBASE_CONFIG.projectId.includes("YOUR_")
  );
}
