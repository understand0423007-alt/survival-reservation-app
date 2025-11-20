import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyCtenoXCZleRECA86mx1XDC2RdYpb5jpLk",
  authDomain: "surgame-reservation-app.firebaseapp.com",
  projectId: "surgame-reservation-app",
  storageBucket: "surgame-reservation-app.appspot.com", // ← 修正！
  messagingSenderId: "554166197398",
  appId: "1:554166197398:web:28e7765c964a52eb6f36b7",
  measurementId: "G-T9G6BLHH2S"
};

// 初期化
const app = initializeApp(firebaseConfig);

// auth & db
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;