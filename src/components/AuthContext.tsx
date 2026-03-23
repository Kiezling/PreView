import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';

export interface PublicProfile {
  displayName: string | null;
  photoURL: string | null;
  showAvatar: boolean;
}

interface AuthContextType {
  user: User | null;
  publicProfile: PublicProfile | null;
  loading: boolean;
  authError: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshPublicProfile: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  publicProfile: null,
  loading: true,
  authError: null,
  login: async () => {},
  logout: async () => {},
  refreshPublicProfile: async () => {},
  clearAuthError: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchPublicProfile = async (uid: string) => {
    try {
      const publicRef = doc(db, 'users_public', uid);
      const publicSnap = await getDoc(publicRef);
      if (publicSnap.exists()) {
        const data = publicSnap.data();
        setPublicProfile({
          displayName: data.displayName || null,
          photoURL: data.photoURL || null,
          showAvatar: data.showAvatar !== false,
        });
      } else {
        setPublicProfile(null);
      }
    } catch (error) {
      console.error("Error fetching public profile:", error);
    }
  };

  const refreshPublicProfile = async () => {
    if (user) {
      await fetchPublicProfile(user.uid);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Ensure users_public is fetched on initial load
        const publicRef = doc(db, 'users_public', currentUser.uid);
        const publicSnap = await getDoc(publicRef);
        
        if (publicSnap.exists()) {
          const data = publicSnap.data();
          setPublicProfile({
            displayName: data.displayName || null,
            photoURL: data.photoURL || null,
            showAvatar: data.showAvatar !== false,
          });
        } else {
          // Ensure user profile exists in Firestore
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              createdAt: new Date().toISOString(),
            });
          }
          
          await setDoc(publicRef, {
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            showAvatar: true,
          });
          setPublicProfile({
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            showAvatar: true,
          });
        }
      } else {
        setPublicProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      setAuthError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        // User closed the popup, ignore
        return;
      }
      console.error("Login failed:", error);
      setAuthError(error.code || error.message || String(error));
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error("Logout failed:", error);
      setAuthError(error.code || error.message || String(error));
    }
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider value={{ user, publicProfile, loading, authError, login, logout, refreshPublicProfile, clearAuthError }}>
      {children}
    </AuthContext.Provider>
  );
};
