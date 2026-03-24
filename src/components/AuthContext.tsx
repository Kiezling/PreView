import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';

export interface PublicProfile { displayName: string | null; photoURL: string | null; showAvatar: boolean; }
interface AuthContextType { user: User | null; publicProfile: PublicProfile | null; loading: boolean; authError: string | null; login: () => Promise<void>; logout: () => Promise<void>; refreshPublicProfile: () => Promise<void>; setOptimisticProfile: (profile: Partial<PublicProfile>) => void; clearAuthError: () => void; }

const AuthContext = createContext<AuthContextType>({ user: null, publicProfile: null, loading: true, authError: null, login: async () => {}, logout: async () => {}, refreshPublicProfile: async () => {}, setOptimisticProfile: () => {}, clearAuthError: () => {}, });
export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const setOptimisticProfile = (updates: Partial<PublicProfile>) => {
    setPublicProfile(prev => prev ? { ...prev, ...updates } : { displayName: null, photoURL: null, showAvatar: true, ...updates });
  };

  const fetchPublicProfile = async (uid: string) => {
    try {
      const snap = await getDoc(doc(db, 'users_public', uid));
      if (snap.exists()) setPublicProfile({ displayName: snap.data().displayName || null, photoURL: snap.data().photoURL || null, showAvatar: snap.data().showAvatar !== false });
    } catch (e) { console.error(e); }
  };
  const refreshPublicProfile = async () => { if (user) await fetchPublicProfile(user.uid); };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const publicRef = doc(db, 'users_public', currentUser.uid);
          const publicSnap = await getDoc(publicRef);
          if (publicSnap.exists()) {
            setPublicProfile({ displayName: publicSnap.data().displayName || null, photoURL: publicSnap.data().photoURL || null, showAvatar: publicSnap.data().showAvatar !== false });
          } else {
            const fallback = { displayName: currentUser.displayName || 'Profile', photoURL: currentUser.photoURL || null, showAvatar: true };
            setPublicProfile(fallback);
            setDoc(doc(db, 'users', currentUser.uid), { uid: currentUser.uid, email: currentUser.email || null, displayName: currentUser.displayName || null, photoURL: currentUser.photoURL || null, createdAt: new Date().toISOString() }, { merge: true }).catch(()=>{});
            setDoc(publicRef, { uid: currentUser.uid, ...fallback }, { merge: true }).catch(()=>{});
          }
        } catch (error) {
          setPublicProfile({ displayName: currentUser.displayName || 'Profile', photoURL: currentUser.photoURL || null, showAvatar: true });
        }
      } else { setPublicProfile(null); }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => { try { setAuthError(null); await signInWithPopup(auth, googleProvider); } catch (e: any) { if (e.code !== 'auth/popup-closed-by-user') setAuthError(e.message); } };
  const logout = async () => { try { await signOut(auth); } catch (e: any) { setAuthError(e.message); } };
  const clearAuthError = () => setAuthError(null);

  return <AuthContext.Provider value={{ user, publicProfile, loading, authError, login, logout, refreshPublicProfile, setOptimisticProfile, clearAuthError }}>{children}</AuthContext.Provider>;
};
