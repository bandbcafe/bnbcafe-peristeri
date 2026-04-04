// Firebase initialization for renderer (Next.js)
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// WRAPP Configuration Helper Functions

/**
 * Get WRAPP configuration from Firebase
 * @returns Promise with WRAPP config object
 */
export async function getWrappConfig(): Promise<any> {
  try {
    const configDoc = await getDoc(doc(db, "config", "wrapp"));
    return configDoc.exists() ? configDoc.data() : {};
  } catch (error) {
    console.error("Error getting WRAPP config:", error);
    return {};
  }
}

/**
 * Set WRAPP configuration in Firebase
 * @param config WRAPP configuration object
 */
export async function setWrappConfig(config: any): Promise<void> {
  try {
    const configRef = doc(db, "config", "wrapp");
    await setDoc(configRef, config, { merge: true });
    console.log("WRAPP config saved successfully");
  } catch (error) {
    console.error("Error saving WRAPP config:", error);
    throw error;
  }
}

/**
 * Get or create user document (placeholder - implement based on your user management)
 * @returns Promise with user object
 */
export async function getOrCreateUser(): Promise<any> {
  try {
    // This is a placeholder implementation
    // You should implement this based on your user management system
    const userDoc = await getDoc(doc(db, "users", "current_user"));
    if (userDoc.exists()) {
      return { id: "current_user", ...userDoc.data() };
    } else {
      // Create default user settings
      const defaultUser = {
        userSettings: {
          wrapp: {
            email: "",
            api_key: "",
            default_payment_method_type: 0,
            default_invoice_type_code: "11.1",
            default_vat_rate: 24,
            email_locale: "el",
            generate_pdf: true,
            draft: false
          }
        }
      };
      await setDoc(doc(db, "users", "current_user"), defaultUser);
      return { id: "current_user", ...defaultUser };
    }
  } catch (error) {
    console.error("Error getting/creating user:", error);
    throw error;
  }
}

/**
 * Update user document
 * @param userId User ID
 * @param updates Updates to apply
 */
export async function updateDocument(collection: string, docId: string, updates: any): Promise<void> {
  try {
    const docRef = doc(db, collection, docId);
    await updateDoc(docRef, updates);
    console.log(`Document ${collection}/${docId} updated successfully`);
  } catch (error) {
    console.error(`Error updating document ${collection}/${docId}:`, error);
    throw error;
  }
}
