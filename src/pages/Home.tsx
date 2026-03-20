import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Layers, TrendingUp, Palette, Spade, Trophy } from 'lucide-react';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
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

interface LeaderboardEntry {
  uid: string;
  name: string;
  accuracy: number;
  total: number;
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
  const [leaderboards, setLeaderboards] = useState<Record<string, LeaderboardEntry[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchAllStats = async () => {
      try {
        const modes = [
          { key: 'zener', collection: 'zenerAttempts' },
          { key: 'astroTarot', collection: 'astroTarotAttempts' },
          { key: 'stock', collection: 'stockAttempts' },
          { key: 'standardDeck', collection: 'standardDeckAttempts' },
          { key: 'colorTarget', collection: 'colorAttempts' },
        ];

        const newStats: Record<string, ModeStats> = {
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
        };

        const newLeaderboards: Record<string, LeaderboardEntry[]> = {};

        for (const mode of modes) {
          const snapshot = await getDocs(collection(db, mode.collection));
          const modeUserAggregates: Record<string, { total: number; success: number }> = {};
          const subModeUserAggregates: Record<string, Record<string, { total: number; success: number }>> = {};

          snapshot.forEach(doc => {
            const data = doc.data();
            const isSuccess = data.isSuccess === true;
            const uid = data.userId;

            // Global stats
            newStats[mode.key].global.total++;
            if (isSuccess) newStats[mode.key].global.success++;

            // User stats
            if (uid === user.uid) {
              newStats[mode.key].user.total++;
              if (isSuccess) newStats[mode.key].user.success++;
            }

            // Sub-stats for standard deck
            if (mode.key === 'standardDeck' && data.guessType && newStats.standardDeck.subStats) {
              const guessType = data.guessType as 'color' | 'suit' | 'value';
              if (newStats.standardDeck.subStats[guessType]) {
                newStats.standardDeck.subStats[guessType].global.total++;
                if (isSuccess) newStats.standardDeck.subStats[guessType].global.success++;
                
                if (uid === user.uid) {
                  newStats.standardDeck.subStats[guessType].user.total++;
                  if (isSuccess) newStats.standardDeck.subStats[guessType].user.success++;
                }
              }

              if (!subModeUserAggregates[guessType]) subModeUserAggregates[guessType] = {};
              if (!subModeUserAggregates[guessType][uid]) subModeUserAggregates[guessType][uid] = { total: 0, success: 0 };
              subModeUserAggregates[guessType][uid].total++;
              if (isSuccess) subModeUserAggregates[guessType][uid].success++;
            }

            // Leaderboard aggregates for this mode
            if (!modeUserAggregates[uid]) modeUserAggregates[uid] = { total: 0, success: 0 };
            modeUserAggregates[uid].total++;
            if (isSuccess) modeUserAggregates[uid].success++;
          });

          // Compute leaderboard for this mode
          const eligibleUsers = Object.entries(modeUserAggregates)
            .filter(([_, s]) => s.total >= 50)
            .map(([uid, s]) => ({
              uid,
              accuracy: (s.success / s.total) * 100,
              total: s.total,
            }))
            .sort((a, b) => b.accuracy - a.accuracy)
            .slice(0, 3);

          newLeaderboards[mode.key] = await Promise.all(
            eligibleUsers.map(async (u) => {
              const userDoc = await getDoc(doc(db, 'users_public', u.uid));
              const name = userDoc.exists() ? userDoc.data().displayName || 'Anonymous' : 'Anonymous';
              return { ...u, name };
            })
          );

          if (mode.key === 'standardDeck') {
            for (const guessType of ['color', 'suit', 'value']) {
              if (subModeUserAggregates[guessType]) {
                const subEligibleUsers = Object.entries(subModeUserAggregates[guessType])
                  .filter(([_, s]) => s.total >= 50)
                  .map(([uid, s]) => ({
                    uid,
                    accuracy: (s.success / s.total) * 100,
                    total: s.total,
                  }))
                  .sort((a, b) => b.accuracy - a.accuracy)
                  .slice(0, 3);

                newLeaderboards[`standardDeck_${guessType}`] = await Promise.all(
                  subEligibleUsers.map(async (u) => {
                    const userDoc = await getDoc(doc(db, 'users_public', u.uid));
                    const name = userDoc.exists() ? userDoc.data().displayName || 'Anonymous' : 'Anonymous';
                    return { ...u, name };
                  })
                );
              }
            }
          }
        }

        setStats(newStats);
        setLeaderboards(newLeaderboards);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllStats();
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

      <div className="pt-8 border-t border-neutral-800">
        <div className="flex flex-col items-center mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/10 mb-4">
            <Trophy className="w-6 h-6 text-yellow-500" />
          </div>
          <h2 className="text-3xl font-bold text-white">Top Clairvoyants</h2>
          <p className="text-neutral-400 mt-2">Highest accuracy per category (min. 50 attempts)</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.flatMap(card => {
            if (card.id === 'standardDeck') {
              return ['color', 'suit', 'value'].map(guessType => {
                const modeLeaderboard = leaderboards[`standardDeck_${guessType}`] || [];
                const title = `Standard Deck (${guessType.charAt(0).toUpperCase() + guessType.slice(1)})`;
                return (
                  <div key={`standardDeck_${guessType}`} className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <card.icon className="w-5 h-5 text-neutral-400" />
                      <h3 className="text-lg font-semibold text-white">{title}</h3>
                    </div>
                    
                    {modeLeaderboard.length > 0 ? (
                      <div className="space-y-3">
                        {modeLeaderboard.map((leader, idx) => (
                          <div key={leader.uid} className="flex items-center justify-between bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                            <div className="flex items-center gap-4">
                              <span className={`text-xl font-bold ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-neutral-300' : idx === 2 ? 'text-amber-600' : 'text-neutral-500'}`}>
                                #{idx + 1}
                              </span>
                              <span className="font-medium text-white truncate max-w-[100px]">{leader.name}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-mono text-white">{leader.accuracy.toFixed(1)}%</p>
                              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">{leader.total} att</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-neutral-950 rounded-xl border border-neutral-800 border-dashed">
                        <p className="text-sm text-neutral-500">No users with 50+ attempts</p>
                      </div>
                    )}
                  </div>
                );
              });
            }

            const modeLeaderboard = leaderboards[card.id] || [];
            
            return [
              <div key={card.id} className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <card.icon className="w-5 h-5 text-neutral-400" />
                  <h3 className="text-lg font-semibold text-white">{card.title}</h3>
                </div>
                
                {modeLeaderboard.length > 0 ? (
                  <div className="space-y-3">
                    {modeLeaderboard.map((leader, idx) => (
                      <div key={leader.uid} className="flex items-center justify-between bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                        <div className="flex items-center gap-4">
                          <span className={`text-xl font-bold ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-neutral-300' : idx === 2 ? 'text-amber-600' : 'text-neutral-500'}`}>
                            #{idx + 1}
                          </span>
                          <span className="font-medium text-white truncate max-w-[100px]">{leader.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-mono text-white">{leader.accuracy.toFixed(1)}%</p>
                          <p className="text-[10px] text-neutral-500 uppercase tracking-wider">{leader.total} att</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-neutral-950 rounded-xl border border-neutral-800 border-dashed">
                    <p className="text-sm text-neutral-500">No users with 50+ attempts</p>
                  </div>
                )}
              </div>
            ];
          })}
        </div>
      </div>
    </motion.div>
  );
};
