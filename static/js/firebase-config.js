// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDt7kIuy_rbz4XyVT0c-c6yvTDZotUuNPw",
    authDomain: "breakfree-745c3.firebaseapp.com",
    projectId: "breakfree-745c3",
    storageBucket: "breakfree-745c3.firebasestorage.app",
    messagingSenderId: "166680076416",
    appId: "1:166680076416:web:72918d9b6193ab86d24665",
    measurementId: "G-00EZBT0N4Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
