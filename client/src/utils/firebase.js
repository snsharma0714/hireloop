
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

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const provider = new GoogleAuthProvider()

export {auth , provider}