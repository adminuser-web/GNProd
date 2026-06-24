import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

if (typeof window !== 'undefined' && import.meta.env.VITE_RECAPTCHA_SITE_KEY && import.meta.env.VITE_RECAPTCHA_SITE_KEY.length > 0) {
  if (import.meta.env.DEV) {
    (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true
  });
}

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);
export const storage = getStorage(app);
