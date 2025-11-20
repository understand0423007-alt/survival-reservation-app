// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCtenoXCZleRECA86mx1XDC2RdYpb5jpLk",
  authDomain: "surgame-reservation-app.firebaseapp.com",
  projectId: "surgame-reservation-app",
  storageBucket: "surgame-reservation-app.firebasestorage.app",
  messagingSenderId: "554166197398",
  appId: "1:554166197398:web:28e7765c964a52eb6f36b7",
  measurementId: "G-T9G6BLHH2S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
