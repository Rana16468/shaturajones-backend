import { initializeApp, applicationDefault } from 'firebase-admin/app';

try {
  initializeApp({
    credential: applicationDefault(),
  });
  console.log('Firebase Admin SDK initialized successfully.');
} catch (error) {
  console.error('Firebase Admin SDK initialization error (might be missing GOOGLE_APPLICATION_CREDENTIALS):', error);
}
