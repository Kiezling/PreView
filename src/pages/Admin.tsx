// src/pages/Admin.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { db, functions } from '../firebase';
import { collection, getDocs, doc, getDoc, writeBatch } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ShieldAlert, Database, Users, Activity, Loader2, CheckCircle2, XCircle, Zap } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

export const Admin: React.FC = () => {
  const { user } = useAuth();
  const { isInfinite } = useOutletContext<{ isInfinite: boolean }>();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [user]);

  const handleRecalculateStats = async () => {
    if (!user || !isAdmin || isSubmitting) return;
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const recalculate = httpsCallable(functions, 'recalculatePersonalStats');
      await recalculate();
      setStatusMessage({ type: 'success', text: 'Personal stats recalculated successfully.' });
    } catch (error: any) {
      console.error("Error recalculating stats:", error);
      setStatusMessage({ type: 'error', text: error.message || 'Failed to recalculate stats.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleInfiniteFocus = async () => {
    if (!user || !isAdmin || isSubmitting) return;
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const toggleInfinite = httpsCallable(functions, 'adminManageStamina');
      await toggleInfinite({ action: 'toggleInfinite', targetUserId: user.uid });
      setStatusMessage({ type: 'success', text: `Infinite focus ${!isInfinite ? 'enabled' : 'disabled'}.` });
      // The UI will update automatically via the onSnapshot listener in Layout.tsx
    } catch (error: any) {
      console.error("Error toggling infinite focus:", error);
      setStatusMessage({ type: 'error', text: error.message || 'Failed to toggle infinite focus.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <ShieldAlert className="w-16 h-16 text-white mb-4" />
        <h1 className="text-3xl font-bold text-white mb-2">Unauthorized</h1>
        <p className="text-neutral-400">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Admin Dashboard</h1>
        <p className="text-neutral-400 text-lg">Manage application settings and data.</p>
      </header>

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8">
        <div className="flex items-center gap-4 mb-6">
          <Database className="w-8 h-8 text-white" />
          <h2 className="text-2xl font-semibold text-white">System Actions</h2>
        </div>

        {statusMessage && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${statusMessage.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            {statusMessage.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-6 h-6 text-neutral-400" />
              <h3 className="text-xl font-medium text-white">Recalculate Stats</h3>
            </div>
            <p className="text-neutral-500 text-sm mb-6">
              Forces a recalculation of your personal statistics based on all historical attempts. Useful if stats appear out of sync.
            </p>
            <button
              onClick={handleRecalculateStats}
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-white text-black font-semibold rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
              Recalculate Personal Stats
            </button>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-6 h-6 text-neutral-400" />
              <h3 className="text-xl font-medium text-white">Infinite Focus</h3>
            </div>
            <p className="text-neutral-500 text-sm mb-6">
              Toggle infinite focus for your account. When enabled, stamina is not consumed during tests.
            </p>
            <button
              onClick={handleToggleInfiniteFocus}
              disabled={isSubmitting}
              className={`w-full py-3 px-4 font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border-2 ${isInfinite ? 'bg-white text-black border-white hover:bg-neutral-200' : 'bg-transparent text-white border-neutral-700 hover:border-white'}`}
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className={`w-5 h-5 ${isInfinite ? 'fill-current' : ''}`} />}
              {isInfinite ? 'Infinite Focus: ON' : 'Infinite Focus: OFF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};