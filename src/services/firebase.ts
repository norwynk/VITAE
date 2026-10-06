/**
 * Browser Firebase client. Auth and App Check are attached by the SDK; the
 * role is never sent by the browser, it comes from verified token claims.
 */
import { type FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { ReCaptchaEnterpriseProvider, initializeAppCheck } from 'firebase/app-check';
import { type Auth, connectAuthEmulator, getAuth } from 'firebase/auth';
import { type Firestore, connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { type Functions, connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { type FirebaseStorage, connectStorageEmulator, getStorage } from 'firebase/storage';

export const FUNCTIONS_REGION = 'europe-west1';

let services: { app: FirebaseApp; auth: Auth; db: Firestore; functions: Functions; storage: FirebaseStorage } | undefined;

export function firebaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
}

export function firebase() {
  if (services) return services;
  if (!firebaseConfigured()) throw new Error('Firebase is not configured for this environment');
  const app = getApps().length
    ? getApp()
    : initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      });
  const emulators = process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === 'true';
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;
  if (siteKey && !emulators) {
    initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(siteKey), isTokenAutoRefreshEnabled: true });
  }
  const auth = getAuth(app);
  const functions = getFunctions(app, FUNCTIONS_REGION);
  const storage = getStorage(app);
  const db = getFirestore(app);
  if (emulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  services = { app, auth, db, functions, storage };
  return services;
}
