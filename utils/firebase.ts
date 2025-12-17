import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDBVqj_Zh1S1wPSyisA4Rz95jLiuD8uduE",
  authDomain: "gen-lang-client-0692577671.firebaseapp.com",
  projectId: "gen-lang-client-0692577671",
  storageBucket: "gen-lang-client-0692577671.firebasestorage.app",
  messagingSenderId: "643111877560",
  appId: "1:643111877560:web:b9d782d8471a4d29c16d4d",
  measurementId: "G-3MQ6QN19PD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app, "gs://gen-lang-client-0692577671.firebasestorage.app");

// Analytics (Safe check for environment and support)
if (typeof window !== 'undefined') {
    isSupported().then(supported => {
        if (supported) {
            try {
                getAnalytics(app);
            } catch (e) {
                console.warn("Firebase Analytics failed to initialize:", e);
            }
        }
    }).catch(e => {
        console.warn("Firebase Analytics support check failed:", e);
    });
}