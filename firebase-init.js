// firebase-init.js
// Save this file next to your HTML and include with:
// <script type="module" src="./firebase-init.js"></script>
//
// Uses Firebase JS SDK v12 (modular). Helpers are attached to window.firebaseHelpers.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";

// === Your Firebase config (from the Console) ===
const firebaseConfig = {
  apiKey: "AIzaSyBidMZ0nBy7QcsCggQC2h1HVoESDsYBdB4",
  authDomain: "proclea-49b23.firebaseapp.com",
  projectId: "proclea-49b23",
  storageBucket: "proclea-49b23.firebasestorage.app",
  messagingSenderId: "1021274066331",
  appId: "1:1021274066331:web:20d55750b7d88c6585653e",
  measurementId: "G-5GWNB5QBPV"
};
// ==============================================

const app = initializeApp(firebaseConfig);
let analytics = null;
try { analytics = getAnalytics(app); } catch (e) { /* analytics may not be available in some contexts */ }

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

window.firebaseHelpers = {
  app,
  auth,
  db,
  storage,

  // Sign in with email/password
  async firebaseLogin(email, password) {
    if (!email || !password) throw new Error('Email and password required');
    const cred = await signInWithEmailAndPassword(auth, email, password);
    // after login fetch data (best-effort)
    try { await window.firebaseHelpers.fetchAndPopulateData(); } catch(e){ console.warn('fetch after login failed', e); }
    return cred.user;
  },

  // Logout
  async firebaseLogout() {
    await signOut(auth);
    window.currentUser = null;
  },

  // Fetch core collections into the page's global arrays and call UI populate functions if present
  async fetchAndPopulateData() {
    try {
      const custSnap = await getDocs(collection(db, 'customers'));
      window.customers = custSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (typeof populateCustomerDropdown === 'function') populateCustomerDropdown();
    } catch (e) {
      console.warn('fetch customers error', e);
    }

    try {
      const pkgSnap = await getDocs(collection(db, 'packages'));
      window.packages = pkgSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (typeof populatePackagesTable === 'function') populatePackagesTable();
    } catch (e) {
      console.warn('fetch packages error', e);
    }

    try {
      const sSnap = await getDocs(collection(db, 'stockItems'));
      window.stockItems = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (typeof populateStockTable === 'function') populateStockTable();
    } catch (e) {
      console.warn('fetch stock error', e);
    }

    if (typeof updateDefinitionCounts === 'function') updateDefinitionCounts();
  },

  // Save package to Firestore (returns doc id)
  async savePackageToFirestore(pkgObj) {
    const docRef = await addDoc(collection(db, 'packages'), pkgObj);
    return docRef.id;
  },

  // Upload a file to Storage and return { path, url }
  async uploadFileToStorage(file, path = null) {
    if (!file) throw new Error('No file provided');
    const dest = path || `uploads/${Date.now()}_${file.name}`;
    const ref = storageRef(storage, dest);
    await uploadBytes(ref, file);
    const url = await getDownloadURL(ref);
    return { path: dest, url };
  }
};

// Keep window.currentUser in sync
onAuthStateChanged(auth, (user) => {
  window.currentUser = user || null;
  if (user && typeof window.firebaseHelpers?.fetchAndPopulateData === 'function') {
    window.firebaseHelpers.fetchAndPopulateData().catch(()=>{});
  }
});
