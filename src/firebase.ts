// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for other Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyChzIFFKYhW7CEFf2SIY-cHTiiBz3TcRcA",
  authDomain: "tashkent-oasis.firebaseapp.com",
  databaseURL: "https://tashkent-oasis-default-rtdb.firebaseio.com",
  projectId: "tashkent-oasis",
  storageBucket: "tashkent-oasis.firebasestorage.app",
  messagingSenderId: "671404737537",
  appId: "1:671404737537:web:552082679627e527902c00",
  measurementId: "G-TCEL20YFBF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});