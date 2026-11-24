import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAtrbsqf87ZquGt5fMAhWirmm3qiLIkTq4",
  authDomain: "printing-zone.firebaseapp.com",
  projectId: "printing-zone",
  storageBucket: "printing-zone.firebasestorage.app",
  messagingSenderId: "1012982349333",
  appId: "1:1012982349333:web:99713a47e0d329172ad81c",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// A second connection, used to create customer accounts
// without logging out the current user (admin or visitor).
const secondaryApp = initializeApp(firebaseConfig, "secondary");
export const secondaryAuth = getAuth(secondaryApp);
export const secondaryDb = getFirestore(secondaryApp);

export const ADMIN_UID = "TRaI5bxcFoVOImWxNyBERu8y7243";