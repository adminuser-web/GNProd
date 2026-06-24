import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signOut as firebaseSignOut, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export interface UserProfile {
  fullName: string;
  phone: string;
  email: string;
  role: 'customer' | 'admin';
  dob?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    stateCode?: string;
    pincode: string;
    country?: string;
    countryCode?: string;
  };
  marketingConsent?: boolean;
  profileCompleted: boolean;
  createdAt?: any;
  updatedAt?: any;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  signUp: (data: any) => Promise<void>;
  signIn: (data: any) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            // Create user profile if it doesn't exist
            const newProfile: UserProfile = {
              fullName: currentUser.displayName || 'User',
              phone: '',
              email: currentUser.email || '',
              role: 'customer',
              profileCompleted: false,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };
            await setDoc(userDocRef, newProfile);
            setProfile(newProfile);
          }
        } catch (e) {
          console.error("Error fetching user profile:", e);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async ({ fullName, phone, email, password }: any) => {
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
    const userDocRef = doc(db, 'users', newUser.uid);
    const newProfile: UserProfile = {
      fullName,
      phone,
      email,
      role: 'customer',
      profileCompleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(userDocRef, newProfile);
    setProfile(newProfile);
  };

  const signIn = async ({ email, password }: any) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
