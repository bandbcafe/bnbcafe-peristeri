// Firebase Admin SDK for server-side operations
import admin from 'firebase-admin';

// Check if Firebase Admin is already initialized
if (!admin.apps.length) {
  try {
    // Initialize with service account credentials from environment variables
    const serviceAccount = {
      type: process.env.FIREBASE_SERVICE_ACCOUNT_TYPE,
      project_id: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID,
      private_key_id: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_ID,
      auth_uri: process.env.FIREBASE_SERVICE_ACCOUNT_AUTH_URI,
      token_uri: process.env.FIREBASE_SERVICE_ACCOUNT_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL,
      universe_domain: process.env.FIREBASE_SERVICE_ACCOUNT_UNIVERSE_DOMAIN,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export const adminStorage = admin.storage();

export default admin;
