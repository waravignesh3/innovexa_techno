// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAbqYIfagav76Vuj_LK_aJkx4HH4hVx5h0",
  authDomain: "innovex-techno.firebaseapp.com",
  projectId: "innovex-techno",
  storageBucket: "innovex-techno.firebasestorage.app",
  messagingSenderId: "640276356457",
  appId: "1:640276356457:web:a45543cc59b7e03ed131f8",
  measurementId: "G-52FYP01TL3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export { app, analytics };