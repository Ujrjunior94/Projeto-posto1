import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  getDocs,
  query,
  where
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { 
  app, 
  auth, 
  db, 
  storage,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  ref,
  uploadBytes,
  getDownloadURL,
  type FirebaseUser
};
