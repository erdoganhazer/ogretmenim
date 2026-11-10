export { initializeApp, deleteApp } from "firebase/app";
export { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, updatePassword,
  setPersistence, browserLocalPersistence, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
export { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, collection, getDoc, getDocs, setDoc, updateDoc,
  deleteDoc, writeBatch, onSnapshot, query, where, arrayUnion, serverTimestamp, documentId } from "firebase/firestore";
