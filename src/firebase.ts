import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyAPrxU2SFQniS7llLTCTInw1LZLA4Rx6PE",
  authDomain: "preview-arv-backend.firebaseapp.com",
  projectId: "preview-arv-backend",
  storageBucket: "preview-arv-backend.firebasestorage.app",
  messagingSenderId: "970553079999",
  appId: "1:970553079999:web:1325cf54d42151b3876e0a"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const functions = getFunctions(app);
