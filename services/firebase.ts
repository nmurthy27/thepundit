import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCJ69gBvJvXtKyn7dF_KT2Kwmxmzkjk_N4",
  authDomain: "thepundit-8aaee.firebaseapp.com",
  projectId: "thepundit-8aaee",
  storageBucket: "thepundit-8aaee.firebasestorage.app",
  messagingSenderId: "1062359807734",
  appId: "1:1062359807734:web:fd3cc4cf3a2713af079ed7",
  measurementId: "G-0QBL6PKCYJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Register a new user with email and password
 */
export const registerWithEmail = async (name: string, email: string, pass: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(result.user, { displayName: name });
    
    // Save initial user profile in Firestore
    await setDoc(doc(db, "users", result.user.uid), {
      email: email,
      name: name,
      createdAt: new Date().toISOString(),
      sources: [],
      keywords: [],
      companies: [],
      archive: []
    }, { merge: true });

    return result.user;
  } catch (error: any) {
    console.error("ThePundit: Registration Error:", error.code, error.message);
    if (error.code === 'auth/email-already-in-use') {
      throw new Error("This email is already registered.");
    } else if (error.code === 'auth/weak-password') {
      throw new Error("Password is too weak. Use at least 6 characters.");
    } else if (error.code === 'auth/invalid-email') {
      throw new Error("Invalid email format.");
    } else if (error.code === 'auth/unauthorized-domain') {
      throw new Error(`This domain (${window.location.hostname}) is not authorized in Firebase Console.`);
    }
    throw new Error(error.message);
  }
};

/**
 * Log in an existing user
 */
export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error: any) {
    console.error("ThePundit: Login Error:", error.code, error.message);
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error("Invalid email or password.");
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error("Too many failed attempts. Try again later.");
    } else if (error.code === 'auth/unauthorized-domain') {
      throw new Error(`Domain ${window.location.hostname} unauthorized. Add it to Firebase Authentication > Settings > Authorized Domains.`);
    }
    throw new Error(error.message);
  }
};

/**
 * Sign out the current user
 */
export const logout = () => signOut(auth);

/**
 * Persist user-specific configuration and archives to Firestore
 */
export const saveUserSettings = async (uid: string, data: any) => {
  if (!uid) return;
  try {
    const userRef = doc(db, "users", uid);
    
    // Explicitly stringify and parse to strip any non-serializable properties/circular references
    const sanitizedData = JSON.parse(JSON.stringify(data));
    
    await setDoc(userRef, {
      ...sanitizedData,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
    console.debug("ThePundit: Firestore settings sync successful");
  } catch (error) {
    console.error("ThePundit: Firestore sync error:", error);
  }
};

/**
 * Retrieve user-specific configuration from Firestore
 */
export const getUserSettings = async (uid: string) => {
  if (!uid) return null;
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error("ThePundit: Firestore fetch error:", error);
    return null;
  }
};