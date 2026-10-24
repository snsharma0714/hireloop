
import { initializeApp } from "firebase/app";
import {getAuth, GoogleAuthProvider} from "firebase/auth"
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY,
  authDomain: "interview-28a53.firebaseapp.com",
  projectId: "interview-28a53",
  storageBucket: "interview-28a53.firebasestorage.app",
  messagingSenderId: "575143530745",
  appId: "1:575143530745:web:d1dbbdbfa439ec468ad228",
  measurementId: "G-NVVG35X4S6"
};

// Without the API key Firebase throws on load and the whole page goes blank,
// so only Google sign-in is switched off until VITE_FIREBASE_APIKEY is set at build time
const auth = firebaseConfig.apiKey ? getAuth(initializeApp(firebaseConfig)) : null;

const provider = new GoogleAuthProvider()

export {auth , provider}