import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Star, LogOut, User as UserIcon, LogIn, LayoutDashboard, Layers, TrendingUp, Palette, Spade, Brain, XCircle, Headphones } from 'lucide-react';
import { cn } from '../lib/utils';

export const Layout: React.FC = () => {
  const { user, publicProfile, login, logout, authError, clearAuthError, loading } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Zener Cards', path: '/zener', icon: Star },
    { name: 'Color Target', path: '/color', icon: Palette },
    { name: 'Standard Deck', path: '/standard-deck', icon: Spade },
    { name: 'Astro-Tarot', path: '/astro-tarot', icon: Layers },
    { name: 'Stock Strategy', path: '/stock', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-white/30">
      <nav className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2 text-3xl font-bold tracking-tight text-white hover:text-neutral-200 transition-colors">
                <Brain className="w-8 h-8 text-white" />
                PreView
              </Link>
              
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
                  <Link 
                    to="/profile" 
                    className="flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
                  >
                    {publicProfile?.showAvatar && publicProfile?.photoURL ? (
                      <img src={publicProfile.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-neutral-700" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700">
                        <Brain className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <span className="hidden sm:inline">{publicProfile?.displayName || user.displayName || 'Profile'}</span>
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
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg flex justify-between items-center">
            <div>
              <p className="font-bold">Authentication Error</p>
              <p className="font-mono text-sm">{authError}</p>
            </div>
            <button onClick={clearAuthError} className="text-red-500 hover:text-red-400">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mb-4"></div>
            <p className="text-neutral-400">Verifying authentication...</p>
          </div>
        ) : user ? (
          <Outlet />
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
    </div>
  );
};
