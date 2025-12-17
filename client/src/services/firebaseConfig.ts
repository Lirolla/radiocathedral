
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Configuração do Firebase
// IMPORTANTE: Verifique se o projectId aqui é EXATAMENTE igual ao do seu console.
const firebaseConfig = {
  apiKey: "AIzaSyDpn5k1khiJ4ZKNqgducqQFsw1I7ZLC0z4",
  authDomain: "radiotocai.firebaseapp.com",
  projectId: "radiotocai",
  storageBucket: "radiotocai.firebasestorage.app",
  messagingSenderId: "882642966656",
  appId: "1:882642966656:web:df9542d9ab66a54f1fae65",
  measurementId: "G-K7SX56686D"
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
