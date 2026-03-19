import { auth, db } from "./firebase.js";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const loginBtn = document.getElementById("loginBtn");

// 🔥 ONLY CHECK IF BLOCKED (NO AUTO REDIRECT)
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const docSnap = await getDoc(doc(db, "users", user.uid));
      if (!docSnap.exists()) {
        await signOut(auth);
        return;
      }

      const data = docSnap.data();

      if (data.blocked === true) {
        alert("🚫 Your account is blocked.");
        await signOut(auth);
        return;
      }

      // ❌ REMOVE AUTO REDIRECT HERE
      // Users stay on login page until they click Login button

    } catch (error) {
      console.error("Auth state check failed:", error);
      await signOut(auth);
    }
  }
});

// 🔥 MANUAL LOGIN BUTTON
loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const docSnap = await getDoc(doc(db, "users", user.uid));

    if (!docSnap.exists()) {
      alert("User data not found!");
      await signOut(auth);
      return;
    }

    const data = docSnap.data();

    // 🚫 BLOCK CHECK
    if (data.blocked === true) {
      alert("🚫 Your account is blocked by admin.");
      await signOut(auth);
      return;
    }

    // ✅ REDIRECT AFTER SUCCESSFUL LOGIN ONLY
    if (data.role === "admin") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "dashboard.html";
    }

  } catch (error) {
    alert("Login Failed: " + error.message);
  }
});