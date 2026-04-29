import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { app } from "../firebase/config.js";

// Initialize auth with your app
const auth = getAuth(app);

// Google provider
const provider = new GoogleAuthProvider();

// 👉 Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    console.log("User:", user);
    return user;
  } catch (error) {
    console.error("Login Error:", error.message);
  }
};

// 👉 Logout
export const logout = async () => {
  try {
    await signOut(auth);
    console.log("User logged out");
  } catch (error) {
    console.error("Logout Error:", error.message);
  }
};