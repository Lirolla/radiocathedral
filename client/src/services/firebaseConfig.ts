
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Configuração do Firebase - Projecto: radiocathedral
const firebaseConfig = {
  apiKey: "AIzaSyCsAiygefmaQ1MUyW4LTB3Tl-VeoinMrjA",
  authDomain: "radiocathedral.firebaseapp.com",
  projectId: "radiocathedral",
  storageBucket: "radiocathedral.firebasestorage.app",
  messagingSenderId: "933264318177",
  appId: "1:933264318177:web:e9372f95bd2013f7df21a0",
  measurementId: "G-9M07MYM01S"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa Analytics apenas se suportado
let analytics = null;
isSupported().then(yes => {
  if (yes) {
    analytics = getAnalytics(app);
  }
});

// Inicializa e exporta o Firestore, Realtime Database e Auth
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const auth = getAuth(app);
