import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { User as UserIcon, Calendar, Activity, Star, Layers, TrendingUp, Palette, Edit2, Check, X, Spade, Brain, ToggleLeft, ToggleRight } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { format } from 'date-fns';

export const Profile: React.FC = () => {
  const { user, publicProfile, refreshPublicProfile } = useAuth();
  
  const [publicName, setPublicName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const publicRef = doc(db, 'users_public', user.uid);
        const publicSnap = await getDoc(publicRef);
        if (publicSnap.exists()) {
          const data = publicSnap.data();
          setPublicName(data.displayName || user.displayName || 'Anonymous User');
        } else {
          setPublicName(user.displayName || 'Anonymous User');
        }
      } catch (error) {
        console.error("Error fetching public profile:", error);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSaveName = async () => {
    if (!user || !editNameValue.trim()) return;
    setIsSavingName(true);
    try {
      const publicRef = doc(db, 'users_public', user.uid);
      await updateDoc(publicRef, {
        displayName: editNameValue.trim()
      });
      setPublicName(editNameValue.trim());
      setIsEditingName(false);
      await refreshPublicProfile();
    } catch (error) {
      console.error("Error updating public name:", error);
    } finally {
      setIsSavingName(false);
    }
  };

  const toggleAvatar = async () => {
    if (!user) return;
    setIsSavingAvatar(true);
    try {
      const currentShowAvatar = publicProfile?.showAvatar || false;
      await setDoc(doc(db, 'users_public', user.uid), { 
        showAvatar: !currentShowAvatar,
        photoURL: !currentShowAvatar ? user.photoURL : null
      }, { merge: true });
      await refreshPublicProfile();
    } catch (error) {
      console.error("Error updating avatar preference:", error);
    } finally {
      setIsSavingAvatar(false);
    }
  };

  if (!user) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <header className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-12 bg-neutral-900/50 p-8 rounded-3xl border border-neutral-800 relative">
        <div className="flex flex-col items-center gap-4">
          {publicProfile?.showAvatar && user.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-24 h-24 rounded-full border-4 border-neutral-800" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-neutral-800 flex items-center justify-center border-4 border-neutral-700">
              <Brain className="w-10 h-10 text-neutral-500" />
            </div>
          )}
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleAvatar}
              disabled={isSavingAvatar}
              className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors px-1 outline-none ${publicProfile?.showAvatar ? 'bg-white' : 'bg-neutral-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full transition-transform ${publicProfile?.showAvatar ? 'bg-black translate-x-6' : 'bg-white translate-x-0'}`} />
            </button>
            <span className="text-sm text-neutral-400">Show Avatar</span>
          </div>
        </div>
        
        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  className="bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-white"
                  placeholder="Enter public name"
                  maxLength={30}
                  autoFocus
                />
                <button 
                  onClick={handleSaveName}
                  disabled={isSavingName}
                  className="p-1.5 bg-white text-black rounded-lg hover:bg-neutral-200 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsEditingName(false)}
                  disabled={isSavingName}
                  className="p-1.5 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold tracking-tight text-white">{publicName}</h1>
                <button 
                  onClick={() => {
                    setEditNameValue(publicName);
                    setIsEditingName(true);
                  }}
                  className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                  title="Edit Public Name"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          <p className="text-sm text-neutral-500 mt-2">
            Set the name that other users might see
          </p>
        </div>
      </header>

      <div className="text-center py-12 bg-neutral-900/50 border border-neutral-800 rounded-3xl">
        <p className="text-xl text-neutral-400">More to come.</p>
      </div>
    </motion.div>
  );
};
