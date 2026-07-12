import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBrPd3MK6qqCkyeuCM1qXEqvHTaUsoIoi0",
  authDomain: "likhil-projects.firebaseapp.com",
  databaseURL: "https://likhil-projects-default-rtdb.firebaseio.com",
  projectId: "likhil-projects",
  storageBucket: "likhil-projects.firebasestorage.app",
  messagingSenderId: "273016496110",
  appId: "1:273016496110:web:824022c56967348161f8ff",
  measurementId: "G-2CC3RPJJQS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
