import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// IMPORTANT: DO NOT MODIFY THIS FILE
function initializeFirebaseAdmin(): App {
  if (getApps().length === 0) {
    // In a secure server environment (like App Hosting), the SDK can auto-discover credentials
    // when initializeApp() is called with no arguments.
    return initializeApp();
  }
  return getApp();
}

const adminApp = initializeFirebaseAdmin();
const firestore = getFirestore(adminApp);

export function getFirestoreInstance() {
  return firestore;
}
