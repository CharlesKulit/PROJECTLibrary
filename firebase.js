// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// CONFIG MO (galing Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyDQcntDYS_D4dZcO3dkks7sHVy1a2hPE6A",
  authDomain: "neu-library-db7af.firebaseapp.com",
  projectId: "neu-library-db7af",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services
const auth = getAuth(app);
const db = getFirestore(app);

// Export
export { auth, db };