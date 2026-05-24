import { initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getStorage } from "firebase/storage"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyALZoXwV-6_RPABkZNJ1_kVqLhYpTShDcg",
  authDomain: "discord-clone-351b1.firebaseapp.com",
  projectId: "discord-clone-351b1",
  storageBucket: "discord-clone-351b1.firebasestorage.app",
  messagingSenderId: "312338028681",
  appId: "1:312338028681:web:525ebc1eb0ef9ffce74e58"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const storage = getStorage(app)
export const db = getFirestore(app)