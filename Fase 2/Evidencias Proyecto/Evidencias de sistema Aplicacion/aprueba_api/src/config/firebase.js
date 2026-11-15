import { initializeApp, getApps,cert } from 'firebase-admin/app';
import { readFileSync } from 'node:fs';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  // La VPS ya dispone de la cuenta de servicio. Usarla explícitamente permite
  // firmar tokens localmente, sin depender de IAM Credentials/signBlob.
  const credentials=process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const useCertificate=credentials && !process.env.FIRESTORE_EMULATOR_HOST && !process.env.FIREBASE_AUTH_EMULATOR_HOST;
  initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'aprueba-app-9d317',
    ...(useCertificate ? {credential:cert(JSON.parse(readFileSync(credentials,'utf8')))} : {}),
  });
}

export const db = getFirestore();
export const auth = getAuth();
