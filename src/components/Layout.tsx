import React, { useEffect, useState, useCallback } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Star, LogOut, User as UserIcon, LogIn, LayoutDashboard, Layers, TrendingUp, Palette, Spade, Brain, XCircle, Headphones, BatteryMedium, X, Shield } from 'lucide-react';
import { cn } from '../lib/utils';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export const Layout: React.FC = () => {
  const { user, publicProfile, login, logout, authError, clearAuthError, loading } = useAuth();
  const location = useLocation();
  const [stamina, setStamina] = useState<number | null>(null);
  const [targetRegenTime, setTargetRegenTime] = useState<number | null>(null);
  const [isInfinite, setIsInfinite] = useState<boolean>(false);
  const [timeLeftStr, setTimeLeftStr] = useState<string>('--:--');

  const fetchStamina = useCallback(() => {
    if (user) {
      httpsCallable(functions, 'getStaminaStatus')().then(res => {
        const data = res.data as any;
        setStamina(data.currentStamina);
        setTargetRegenTime(data.remainingMs > 0 ? Date.now() + data.remainingMs : null);
        setIsInfinite(data.isInfinite || false);
      }).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const wakeServer = async () => {
      const payload = { ping: true };
      await Promise.allSettled([
        httpsCallable(functions, 'preWarmPing')(payload),
        httpsCallable(functions, 'generateAndGradeTarget')(payload),
        httpsCallable(functions, 'getGlobalStats')(payload),
        httpsCallable(functions, 'getMarketData')(payload),
        httpsCallable(functions, 'getStaminaStatus')(payload)
      ]);
    };
    wakeServer(); // Fire immediately
    const heartbeat = setInterval(wakeServer, 14 * 60 * 1000); // Fire every 14 mins
    return () => clearInterval(heartbeat);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchStamina();
    }
  }, [location.pathname, user, fetchStamina]);

  useEffect(() => {
    const handleStaminaSpent = () => {
      setStamina(prev => {
        if (prev === null || isInfinite) return prev;
        const newStamina = Math.max(0, prev - 1);
        if (prev === 3) {
          setTargetRegenTime(Date.now() + 60 * 60 * 1000);
        }
        return newStamina;
      });
    };

    window.addEventListener('staminaSpent', handleStaminaSpent);

    return () => {
      window.removeEventListener('staminaSpent', handleStaminaSpent);
    };
  }, [isInfinite]);

  useEffect(() => {
    const handleForceSync = () => {
      fetchStamina();
    };
    window.addEventListener('forceStaminaSync', handleForceSync);
    return () => window.removeEventListener('forceStaminaSync', handleForceSync);
  }, [fetchStamina]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (targetRegenTime && !isInfinite) {
        const remaining = targetRegenTime - Date.now();
        if (remaining <= 0) {
          setTimeLeftStr('00:00');
          setTargetRegenTime(null);
          fetchStamina();
        } else {
          const minutes = Math.floor(remaining / 60000);
          const seconds = Math.floor((remaining % 60000) / 1000);
          setTimeLeftStr(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }
      } else {
        setTimeLeftStr('--:--');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [targetRegenTime, isInfinite, fetchStamina]);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Zener Cards', path: '/zener', icon: Star },
    { name: 'Astro-Tarot', path: '/astro-tarot', icon: Layers },
    { name: 'Stock Strategy', path: '/stock', icon: TrendingUp },
    { name: 'Standard Deck', path: '/standard-deck', icon: Spade },
    { name: 'Color Target', path: '/color', icon: Palette },
  ];

  const isMaxFocus = stamina === 3 || isInfinite;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-white/30">
      <nav className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center gap-2 relative">
                <Link to="/admin" className="hover:opacity-80 transition-opacity">
                  <Brain className="w-8 h-8 text-white" />
                </Link>
                <Link to="/" className="text-3xl font-bold tracking-tight text-white hover:text-neutral-200 transition-colors">
                  PreView
                </Link>
              </div>
              
              {user && (
                <div className="hidden md:ml-10 md:flex md:space-x-4">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.name}
                        to={item.path}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                          isActive 
                            ? "bg-neutral-800 text-white" 
                            : "text-neutral-400 hover:bg-neutral-800/50 hover:text-white"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {loading ? (
                <div className="w-24 h-8 animate-pulse bg-neutral-800 rounded-md"></div>
              ) : user ? (
                <>
                  {stamina !== null && (
                    <div className={`flex flex-col items-center justify-center relative group cursor-default`}>
                      <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-[4px]">Focus</span>
                      <div className="relative flex items-center border-2 border-neutral-600 rounded-[4px] p-[2px] gap-[2px] w-12 h-[20px]">
                        <div className="absolute -right-[5px] w-[3px] h-[8px] bg-neutral-600 rounded-r-[2px]"></div>
                        {[1, 2, 3].map((i) => (
                          <div key={i} className={`flex-1 h-full rounded-[2px] transition-colors duration-300 ${isInfinite || stamina >= i ? 'bg-white' : 'bg-neutral-800'}`}></div>
                        ))}
                        {isInfinite && (
                          <div className="absolute inset-0 flex items-center justify-center text-black font-bold text-lg bg-white/90 rounded-sm">∞</div>
                        )}
                      </div>
                      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-neutral-800 text-white text-xs p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                        {isMaxFocus ? 'Max Focus points' : `Next Focus point in: ${timeLeftStr}`}
                      </div>
                    </div>
                  )}
                  <Link 
                    to="/profile" 
                    className="flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
                  >
                    {publicProfile?.showAvatar && publicProfile?.photoURL ? (
                      <img src={publicProfile.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-neutral-700 object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700">
                        <UserIcon className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </Link>
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </nav>

      {authError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-white/10 border border-white/50 text-white p-4 rounded-lg flex justify-between items-center">
            <div>
              <p className="font-bold">Authentication Error</p>
              <p className="font-mono text-sm">{authError}</p>
            </div>
            <button onClick={clearAuthError} className="text-white hover:text-neutral-300">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
            <p className="text-neutral-400">Verifying authentication...</p>
          </div>
        ) : user ? (
          <Outlet context={{ stamina, isInfinite, targetRegenTime, timeLeftStr }} />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <Brain className="w-24 h-24 text-white/50 mb-6" />
            <h1 className="text-4xl font-bold tracking-tight mb-4">Welcome to PreView</h1>
            <p className="text-xl text-neutral-400 max-w-2xl mb-8">
              Practice remote viewing and record your attempts across different modes. See how you stack up against all other users and the leaderboard!
            </p>
            <button
              onClick={login}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-lg font-medium bg-white hover:bg-neutral-200 text-black transition-colors shadow-lg shadow-white/10"
            >
              <LogIn className="w-5 h-5" />
              Sign in with Google
            </button>
          </div>
        )}
      </main>
      <footer className="text-center text-xs text-neutral-600 p-4 border-t border-neutral-900">
        <a href="/privacy" className="hover:text-neutral-400 transition-colors">Privacy Policy</a>
      </footer>
    </div>
  );
};