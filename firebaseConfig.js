import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBKmkJq34y0ZdzacBcxq0--iQRXxIi6m9g",
  authDomain: "zony-a1d8b.firebaseapp.com",
  projectId: "zony-a1d8b",
  storageBucket: "zony-a1d8b.firebasestorage.app",
  messagingSenderId: "295900317104",
  appId: "1:295900317104:web:adf685862d8a94a4ff4275",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);