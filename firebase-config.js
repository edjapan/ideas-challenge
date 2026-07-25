// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  projectId: "earth-space-challe-1234",
  appId: "1:803313293199:web:8a13f4626e30764be41dfa",
  storageBucket: "earth-space-challe-1234.firebasestorage.app",
  apiKey: "AIzaSyCPnx7N8dc5230-mjmes3W-AR7TbuY3d7E",
  authDomain: "earth-space-challe-1234.firebaseapp.com",
  messagingSenderId: "803313293199",
  projectNumber: "803313293199"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
