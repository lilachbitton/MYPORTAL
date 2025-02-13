import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD2Wju8Qz247AiTa1QztCevUzVzE74e5ss",
  authDomain: "biz-ex-d876a.firebaseapp.com",
  projectId: "biz-ex-d876a",
  storageBucket: "biz-ex-d876a.firebasestorage.app",
  messagingSenderId: "735088419166",
  appId: "1:735088419166:web:5e76bf9b1954cdcd282fcf",
  measurementId: "G-7W7EXHHC6N"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// כדי למנוע שגיאות CORS
export const storageRef = storage;