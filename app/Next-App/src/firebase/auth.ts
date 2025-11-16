'use client';

import { Auth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, signInAnonymously, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { ethers } from 'ethers';

async function createUserProfile(user: User) {
    const db = getFirestore();
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        const wallet = ethers.Wallet.createRandom();
        
        await setDoc(userRef, {
            uid: user.uid,
            displayName: user.displayName || `Player ${user.uid.substring(0,5)}`,
            email: user.email,
            photoURL: user.photoURL,
            walletAddress: wallet.address,
            privateKey: wallet.privateKey, // Storing as plain text - NOT RECOMMENDED
        });
        console.log(`Created new user profile and wallet for ${user.uid}`);
    }
}


export const signInWithGoogle = async (auth: Auth | null) => {
  if (!auth) {
      console.error("Auth service is not available.");
      return;
  }
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    await createUserProfile(result.user);
  } catch (error)
  {
    console.error('Error signing in with Google:', error);
  }
};

export const signOut = async (auth: Auth | null) => {
  if (!auth) {
      console.error("Auth service is not available.");
      return;
  }
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
  }
};

export const signInAnonymouslyIfNeeded = async (auth: Auth) => {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  try {
    const userCredential = await signInAnonymously(auth);
    await createUserProfile(userCredential.user);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in anonymously:', error);
    throw error;
  }
};
