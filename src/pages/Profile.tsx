import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { User as UserIcon, Calendar, Activity, Star, Layers, TrendingUp, Palette, Edit2, Check, X, Spade, Brain, ToggleLeft, ToggleRight, Clock } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, setDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { format } from 'date-fns';

export const Profile: React.FC = () => {
  const { user, publicProfile, refreshPublicProfile, setOptimisticProfile } = useAuth();
  
  const [publicName, setPublicName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [filterMode, setFilterMode] = useState<string>('Zener');

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
    if (!user || !publicProfile) return;
    const newShowAvatar = !publicProfile.showAvatar;
    setIsSavingAvatar(true);
    
    // 1. Optimistic Update
    setOptimisticProfile({ 
      showAvatar: newShowAvatar
    });
    
    // 2. Background DB Write
    try {
      await updateDoc(doc(db, 'users_public', user.uid), { 
        showAvatar: newShowAvatar
      });
    } catch (error) {
      console.error("Avatar DB Write Failed:", error);
      setOptimisticProfile({ showAvatar: !newShowAvatar }); // Rollback on fail
    } finally {
      setIsSavingAvatar(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchUserStats = async () => {
      try {
        const collections = ['zenerAttempts', 'colorAttempts', 'astroTarotAttempts', 'standardDeckAttempts'];
        let allAttempts: any[] = [];

        for (const col of collections) {
          const q = query(
            collection(db, col),
            where('userId', '==', user.uid)
          );
          const snap = await getDocs(q);
          snap.forEach(doc => {
            allAttempts.push({ id: doc.id, mode: col.replace('Attempts', ''), ...doc.data() });
          });
        }

        allAttempts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setAttempts(allAttempts);
      } catch (error) {
        console.error("Error fetching user stats:", error);
      }
    };

    fetchUserStats();
  }, [user]);

  const getChronobiologyData = () => {
    const filtered = attempts.filter(a => {
      if (filterMode === 'Zener') return a.testType === 'Zener';
      if (filterMode === 'Color') return a.testType === 'Color';
      if (filterMode === 'Stock') return a.testType === 'Stock';
      if (filterMode.startsWith('Deck:')) return a.testType === 'StandardDeck' && a.guessType?.toLowerCase() === filterMode.split(': ')[1].toLowerCase();
      if (filterMode.startsWith('Tarot:')) return a.testType === 'AstroTarot' && a.guessType === filterMode.split(': ')[1];
      return true;
    });
    
    const buckets = [
      { label: '00-03', total: 0, hits: 0 },
      { label: '04-07', total: 0, hits: 0 },
      { label: '08-11', total: 0, hits: 0 },
      { label: '12-15', total: 0, hits: 0 },
      { label: '16-19', total: 0, hits: 0 },
      { label: '20-23', total: 0, hits: 0 },
    ];

    filtered.forEach(attempt => {
      const hour = new Date(attempt.timestamp).getHours();
      const bucketIndex = Math.floor(hour / 4);
      if (buckets[bucketIndex]) {
        buckets[bucketIndex].total++;
        if (attempt.isSuccess) buckets[bucketIndex].hits++;
      }
    });

    return buckets.map(b => ({
      ...b,
      percentage: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0
    }));
  };

  const chronoData = getChronobiologyData();
  const recentAttempts = attempts.slice(0, 15);

  const formatAttemptData = (a: any) => {
    let guess = 'N/A', actual = 'N/A';
    if (a.testType === 'Zener') { guess = a.selectedCard; actual = a.actualCard; }
    else if (a.testType === 'Color') { guess = a.selectedColor; actual = a.actualColor; }
    else if (a.testType === 'Stock') { guess = a.selectedDirection; actual = a.actualDirection; }
    else if (a.testType === 'StandardDeck') { 
      guess = a.selectedOption; 
      actual = a.actualCard ? `${a.actualCard.value} of ${a.actualCard.suit}` : 'N/A'; 
    }
    else if (a.testType === 'AstroTarot') { 
      guess = a.selectedAttributes ? Object.values(a.selectedAttributes)[0] as string : 'N/A'; 
      actual = a.actualAttributes ? Object.values(a.actualAttributes)[0] as string : 'N/A'; 
    }
    return { guess: String(guess || 'N/A'), actual: String(actual || 'N/A') };
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
            <img src={user.photoURL} alt="Profile" className="w-24 h-24 rounded-full border-4 border-neutral-800 object-cover flex-shrink-0" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-neutral-800 flex items-center justify-center border-4 border-neutral-700">
              <UserIcon className="w-10 h-10 text-neutral-500" />
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
            Your username will be public.
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-8 w-full mb-8">
        {/* Temporal Performance (Chronobiology) */}
        <div className="w-full bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Temporal Performance
            </h2>
            <select 
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-white"
            >
              <option value="Zener">Zener</option>
              <option value="Color">Color</option>
              <option value="Deck: Color">Deck: Color</option>
              <option value="Deck: Suit">Deck: Suit</option>
              <option value="Deck: Value">Deck: Value</option>
              <option value="Tarot: Energy">Tarot: Energy</option>
              <option value="Tarot: Element">Tarot: Element</option>
              <option value="Tarot: Archetype">Tarot: Archetype</option>
              <option value="Stock">Stock Strategy</option>
            </select>
          </div>
          
          <div className="flex items-end justify-between h-40 gap-2 mb-4">
            {chronoData.map((bucket) => (
              <div key={bucket.label} className="flex flex-col items-center flex-1 gap-2 group">
                <div className="w-full bg-neutral-800 rounded-t-sm h-full flex items-end relative overflow-hidden">
                  <div 
                    className="w-full bg-white transition-all duration-500"
                    style={{ height: `${bucket.percentage}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                    <span className="text-xs font-bold text-white">{bucket.percentage}%</span>
                  </div>
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">{bucket.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-neutral-500 text-center mt-4">Accuracy by local hour (4-hour intervals)</p>
        </div>

        {/* Focus State Correlation */}
        <div className="w-full bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Focus State Correlation
          </h2>
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-8 text-center h-full flex items-center justify-center">
            <p className="text-neutral-400 font-mono text-sm">Insufficient Data: Focus telemetry collection initiated.</p>
          </div>
        </div>
      </div>

      {/* Recent Attempt Ledger */}
      <div className="w-full bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Clock className="w-8 h-8 text-white" />
          Recent Attempts
        </h2>
        <div className="pr-2 space-y-2">
          {recentAttempts.length > 0 ? (
            recentAttempts.map((attempt) => {
              const { guess, actual } = formatAttemptData(attempt);
              return (
              <div key={attempt.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-sm">
                <div className="flex items-center gap-3 text-neutral-400 mb-2 sm:mb-0">
                  <span className="font-mono text-xs">{format(new Date(attempt.timestamp), 'MM/dd HH:mm')}</span>
                  <span className="uppercase tracking-wider text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-800 text-white">{attempt.mode}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-neutral-300">
                    {guess} 
                    <span className="text-neutral-600 mx-2">→</span> 
                    {actual}
                  </span>
                  <span className={`font-bold w-12 text-right ${attempt.isSuccess ? 'text-white' : 'text-neutral-500'}`}>
                    {attempt.isSuccess ? 'HIT' : 'MISS'}
                  </span>
                </div>
              </div>
              );
            })
          ) : (
            <p className="text-neutral-500 text-center py-8">No recent attempts found.</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};
