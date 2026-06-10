import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// Firebase dynamic configuration with fallback (Rules or Netlify)
const rawApiKey = import.meta.env.VITE_FIREBASE_API_KEY || "";
const rawProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "";

// A valid Firebase API key must start with "AIzaSy" and be sufficiently long.
const isRealKey = rawApiKey && rawApiKey.startsWith("AIzaSy") && rawApiKey.length > 20;
const isRealProject = rawProjectId && rawProjectId.trim().length > 3 && rawProjectId !== "YOUR_PROJECT_ID";

const firebaseConfig = {
  apiKey: isRealKey ? rawApiKey : "AIzaSyDummyKeyForInitializationOnly_ViteAuth",
  authDomain: isRealProject ? (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${rawProjectId}.firebaseapp.com`) : "educert-portal-dummy.firebaseapp.com",
  projectId: isRealProject ? rawProjectId : "educert-portal-dummy",
  storageBucket: isRealProject ? (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${rawProjectId}.appspot.com`) : "educert-portal-dummy.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:1234567890abcdef123456",
};

// Check if credentials exist and are loaded; if not, print warning for Netlify developers
const hasCredentials = isRealKey && isRealProject;

if (!hasCredentials) {
  console.warn(
    "Firebase configuration secrets are missing or placeholder. Running with compliant local simulator mode. Define a valid VITE_FIREBASE_API_KEY (starts with AIzaSy) in your environment settings if you wish to connect to a live Firebase instance."
  );
}

// Initialize App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

// 1. Mandatory connection check (Zero-Trust Validation)
async function testConnection() {
  if (!hasCredentials) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or network status.");
    }
  }
}
testConnection();

// 2. Mandatory Error Handling Framework (Pillar 3 from Firebase skill guidelines)
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
