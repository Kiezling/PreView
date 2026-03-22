import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Layers, TrendingUp, Palette, Spade } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { motion } from 'motion/react';

interface ModeStats {
  user: { total: number; success: number };
  global: { total: number; success: number };
  subStats?: Record<string, {
    user: { total: number; success: number };
    global: { total: number; success: number };
  }>;
}

export const Home: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, ModeStats>>({
    zener: { user: { total: 0, success: 0 }, global: { total: 0, success: 0 } },
    astroTarot: { user: { total: 0, success: 0 }, global: { total: 0, success: 0 } },
    stock: { user: { total: 0, success: 0 }, global: { total: 0, success: 0 } },
    standardDeck: { 
      user: { total: 0, success: 0 }, 
      global: { total: 0, success: 0 },
      subStats: {
        color: { user: { total: 0, success: 0 }, global: { total: 0, success: 0 } },
        suit: { user: { total: 0, success: 0 }, global: { total: 0, success: 0 } },
        value: { user: { total: 0, success: 0 }, global: { total: 0, success: 0 } }
      }
    },
    colorTarget: { user: { total: 0, success: 0 }, global: { total: 0, success: 0 } },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const fetchPersonalStats = async (uid: string) => {
      const modes = [
        { key: 'zener', collection: 'zenerAttempts' },
        { key: 'astroTarot', collection: 'astroTarotAttempts' },
        { key: 'stock', collection: 'stockAttempts' },
        { key: 'standardDeck', collection: 'standardDeckAttempts' },
        { key: 'colorTarget', collection: 'colorAttempts' },
      ];

      const pStats: Record<string, any> = {
        zener: { total: 0, success: 0 },
        astroTarot: { total: 0, success: 0 },
        stock: { total: 0, success: 0 },
        standardDeck: { 
          total: 0, success: 0,
          subStats: {
            color: { total: 0, success: 0 },
            suit: { total: 0, success: 0 },
            value: { total: 0, success: 0 }
          }
        },
        colorTarget: { total: 0, success: 0 },
      };

      for (const mode of modes) {
        const q = query(
          collection(db, mode.collection),
          where('userId', '==', uid)
        );
        const snapshot = await getDocs(q);

        snapshot.forEach(doc => {
          const data = doc.data();
          const isSuccess = data.isSuccess === true;

          pStats[mode.key].total++;
          if (isSuccess) pStats[mode.key].success++;

          if (mode.key === 'standardDeck' && data.guessType && pStats.standardDeck.subStats[data.guessType]) {
            pStats.standardDeck.subStats[data.guessType].total++;
            if (isSuccess) pStats.standardDeck.subStats[data.guessType].success++;
          }
        });
      }
      return pStats;
    };

    const fetchAllStats = async () => {
      try {
        const [personalData, globalStatsResult] = await Promise.all([
          fetchPersonalStats(user.uid),
          httpsCallable(functions, 'getGlobalStats')()
        ]);

        const globalData = globalStatsResult.data as any;

        const newStats: Record<string, ModeStats> = {
          zener: { 
            user: personalData.zener, 
            global: { total: globalData.zenerAttempts?.total || 0, success: globalData.zenerAttempts?.hits || 0 } 
          },
          astroTarot: { 
            user: personalData.astroTarot, 
            global: { total: globalData.astroTarotAttempts?.total || 0, success: globalData.astroTarotAttempts?.hits || 0 } 
          },
          stock: { 
            user: personalData.stock, 
            global: { total: globalData.stockAttempts?.total || 0, success: globalData.stockAttempts?.hits || 0 } 
          },
          standardDeck: { 
            user: { total: personalData.standardDeck.total, success: personalData.standardDeck.success }, 
            global: { total: globalData.standardDeckAttempts?.total || 0, success: globalData.standardDeckAttempts?.hits || 0 },
            subStats: {
              color: { 
                user: personalData.standardDeck.subStats.color, 
                global: { total: globalData.standardDeckAttempts?.subStats?.color?.total || 0, success: globalData.standardDeckAttempts?.subStats?.color?.hits || 0 } 
              },
              suit: { 
                user: personalData.standardDeck.subStats.suit, 
                global: { total: globalData.standardDeckAttempts?.subStats?.suit?.total || 0, success: globalData.standardDeckAttempts?.subStats?.suit?.hits || 0 } 
              },
              value: { 
                user: personalData.standardDeck.subStats.value, 
                global: { total: globalData.standardDeckAttempts?.subStats?.value?.total || 0, success: globalData.standardDeckAttempts?.subStats?.value?.hits || 0 } 
              }
            }
          },
          colorTarget: { 
            user: personalData.colorTarget, 
            global: { total: globalData.colorAttempts?.total || 0, success: globalData.colorAttempts?.hits || 0 } 
          },
        };

        if (isMounted) {
          setStats(newStats);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAllStats();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const calculateAccuracy = (success: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((success / total) * 100);
  };

  const cards = [
    {
      id: 'zener',
      title: 'Zener Cards',
      icon: Star,
      path: '/zener',
      color: 'text-white',
      bg: 'bg-white/10',
      border: 'border-white/20',
      stats: stats.zener,
    },
    {
      id: 'astroTarot',
      title: 'Astro-Tarot',
      icon: Layers,
      path: '/astro-tarot',
      color: 'text-white',
      bg: 'bg-white/10',
      border: 'border-white/20',
      stats: stats.astroTarot,
    },
    {
      id: 'stock',
      title: 'Stock Strategy',
      icon: TrendingUp,
      path: '/stock',
      color: 'text-white',
      bg: 'bg-white/10',
      border: 'border-white/20',
      stats: stats.stock,
    },
    {
      id: 'standardDeck',
      title: 'Standard Deck',
      icon: Spade,
      path: '/standard-deck',
      color: 'text-white',
      bg: 'bg-white/10',
      border: 'border-white/20',
      stats: stats.standardDeck,
    },
    {
      id: 'colorTarget',
      title: 'Color Target',
      icon: Palette,
      path: '/color',
      color: 'text-white',
      bg: 'bg-white/10',
      border: 'border-white/20',
      stats: stats.colorTarget,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-16 max-w-6xl mx-auto"
    >
      <header className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white mb-4">Dashboard</h1>
        <p className="text-neutral-400 text-lg">Welcome back, {user?.displayName}. Here's an overview of your remote viewing practice.</p>
      </header>

      <div className="flex flex-wrap justify-center gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          const userAcc = calculateAccuracy(card.stats.user.success, card.stats.user.total);
          const globalAcc = calculateAccuracy(card.stats.global.success, card.stats.global.total);
          
          return (
            <Link key={idx} to={card.path} className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-sm">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`h-full rounded-2xl border ${card.border} bg-neutral-900/50 p-6 flex flex-col items-center transition-colors hover:bg-neutral-800/80`}
              >
                <div className={`w-14 h-14 rounded-xl ${card.bg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-7 h-7 ${card.color}`} />
                </div>
                <h2 className="text-xl font-semibold text-white mb-6 text-center">{card.title}</h2>
                
                <div className="w-full space-y-3">
                  <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 w-full">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-2 text-center">Your Stats</p>
                    <div className="flex justify-between items-center">
                      <div className="text-center flex-1">
                        <p className="text-[10px] text-neutral-500 uppercase">Attempts</p>
                        <p className="text-lg font-mono text-white">{card.stats.user.total}</p>
                      </div>
                      <div className="w-px h-8 bg-neutral-800 mx-2"></div>
                      <div className="text-center flex-1">
                        <p className="text-[10px] text-neutral-500 uppercase">Accuracy</p>
                        <p className={`text-lg font-mono text-white`}>{userAcc}%</p>
                      </div>
                    </div>
                    
                    {card.stats.subStats && (
                      <div className="mt-4 pt-4 border-t border-neutral-800 grid grid-cols-3 gap-2">
                        {Object.entries(card.stats.subStats).map(([key, subStat]: [string, any]) => (
                          <div key={key} className="text-center">
                            <p className="text-[9px] text-neutral-500 uppercase">{key}</p>
                            <p className="text-xs font-mono text-white mt-1">
                              {calculateAccuracy(subStat.user.success, subStat.user.total)}%
                            </p>
                            <p className="text-[9px] text-neutral-600 mt-0.5">{subStat.user.total} att</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 w-full">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-2 text-center">Global Average</p>
                    <div className="flex justify-between items-center">
                      <div className="text-center flex-1">
                        <p className="text-[10px] text-neutral-500 uppercase">Attempts</p>
                        <p className="text-lg font-mono text-neutral-400">{card.stats.global.total}</p>
                      </div>
                      <div className="w-px h-8 bg-neutral-800 mx-2"></div>
                      <div className="text-center flex-1">
                        <p className="text-[10px] text-neutral-500 uppercase">Accuracy</p>
                        <p className={`text-lg font-mono text-neutral-400`}>{globalAcc}%</p>
                      </div>
                    </div>
                    
                    {card.stats.subStats && (
                      <div className="mt-4 pt-4 border-t border-neutral-800 grid grid-cols-3 gap-2">
                        {Object.entries(card.stats.subStats).map(([key, subStat]: [string, any]) => (
                          <div key={key} className="text-center">
                            <p className="text-[9px] text-neutral-500 uppercase">{key}</p>
                            <p className="text-xs font-mono text-neutral-400 mt-1">
                              {calculateAccuracy(subStat.global.success, subStat.global.total)}%
                            </p>
                            <p className="text-[9px] text-neutral-600 mt-0.5">{subStat.global.total} att</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
};
