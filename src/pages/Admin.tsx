import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { useOutletContext } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { ShieldAlert, Database, AlertTriangle, Loader2, BatteryMedium, TrendingUp, RefreshCw, Zap } from 'lucide-react';

export const Admin: React.FC = () => {
  const { user } = useAuth();
  const { isInfinite } = useOutletContext<{ isInfinite: boolean }>();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [localIsInfinite, setLocalIsInfinite] = useState<boolean>(isInfinite);

  // Scrubber State
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [moduleName, setModuleName] = useState<string>('All');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [focusStatusMessage, setFocusStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    setLocalIsInfinite(isInfinite);
  }, [isInfinite]);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) { setIsAdmin(false); return; }
      try {
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        setIsAdmin(adminDoc.exists());
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [user]);

  const executePurge = async () => {
    if (!targetUserId) return;
    setIsSubmitting(true);
    setStatusMessage(null);
    setShowConfirm(false);

    try {
      const purgeFunc = httpsCallable(functions, 'purgeUserRecords');
      const result = await purgeFunc({ targetUserId, moduleName });
      const data = result.data as any;
      setStatusMessage({ type: 'success', text: `Successfully purged ${data.deletedCount} records for user ${targetUserId}.` });
      setTargetUserId('');
    } catch (error: any) {
      console.error("Purge Error:", error);
      setStatusMessage({ type: 'error', text: error.message || "Failed to purge records." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFocusAction = async (action: 'refill' | 'deplete') => {
    if (!targetUserId) {
      setFocusStatusMessage({ type: 'error', text: "Target UID required." });
      return;
    }
    setIsSubmitting(true);
    setFocusStatusMessage(null);
    try {
      await httpsCallable(functions, 'adminManageStamina')({ targetUserId, action });
      setFocusStatusMessage({ type: 'success', text: `Successfully ${action === 'refill' ? 'refilled' : 'depleted'} focus.` });
      window.dispatchEvent(new CustomEvent('forceStaminaSync'));
    } catch (error: any) {
      setFocusStatusMessage({ type: 'error', text: error.message || "Failed to manage focus." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleInfiniteFocus = async () => {
    setIsSubmitting(true);
    const newValue = !localIsInfinite;
    setLocalIsInfinite(newValue); // Optimistic UI update
    
    try {
      await httpsCallable(functions, 'adminManageStamina')({ targetUserId: user!.uid, action: 'toggleInfinite' });
      setStatusMessage({ type: 'success', text: `Infinite focus has been ${newValue ? 'ENABLED' : 'DISABLED'}.` });
      window.dispatchEvent(new CustomEvent('forceStaminaSync'));
    } catch (error) {
      setLocalIsInfinite(!newValue); // Rollback on error
      setStatusMessage({ type: 'error', text: "Failed to toggle infinite focus." });
    }
    setIsSubmitting(false);
  };

  const handleRecalculateStats = async () => {
    setIsSubmitting(true);
    try {
      await httpsCallable(functions, 'recalculatePersonalStats')();
      setStatusMessage({ type: 'success', text: "Successfully recalculated historical stats." });
    } catch (error) {
      setStatusMessage({ type: 'error', text: "Failed to recalculate stats." });
    }
    setIsSubmitting(false);
  };

  if (isAdmin === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
        <p className="text-neutral-400">Verifying credentials...</p>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert className="w-16 h-16 text-white mb-6" />
        <h1 className="text-3xl font-bold tracking-tight mb-4">Unauthorized</h1>
        <p className="text-neutral-400 max-w-md">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-white mb-2">System Administration</h1>
        <p className="text-neutral-400 text-lg">Manage global state, user records, and database integrity.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Global Quick Actions */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-6 h-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Quick Actions</h2>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-800 bg-neutral-950">
              <div>
                <p className="text-white font-medium">Infinite Focus (Self)</p>
                <p className="text-neutral-500 text-sm">Bypass all stamina restrictions.</p>
              </div>
              <button
                onClick={handleToggleInfiniteFocus}
                disabled={isSubmitting}
                className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 ${localIsInfinite ? 'bg-white' : 'bg-neutral-700'}`}
              >
                <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${localIsInfinite ? 'translate-x-7 bg-black' : 'translate-x-0 bg-white'}`} />
              </button>
            </div>

            <button
              onClick={handleRecalculateStats}
              disabled={isSubmitting}
              className="w-full py-4 px-4 font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
              Recalculate Personal Stats
            </button>
          </div>

          {statusMessage && (
            <div className={`mt-6 p-4 rounded-xl border ${statusMessage.type === 'success' ? 'bg-green-900/20 border-green-900/50 text-green-400' : 'bg-red-900/20 border-red-900/50 text-red-400'}`}>
              {statusMessage.text}
            </div>
          )}
        </div>

        {/* Focus Management Module */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <BatteryMedium className="w-6 h-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Focus Management</h2>
          </div>
          <p className="text-neutral-400 text-sm mb-6">Manually adjust a user's stamina points.</p>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Target User ID</label>
              <input
                type="text"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="Enter exact Firebase UID..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all font-mono text-sm"
              />
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={() => handleFocusAction('refill')}
                disabled={isSubmitting || !targetUserId}
                className="flex-1 py-3 px-4 bg-white hover:bg-neutral-200 text-black font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Refill (Max)
              </button>
              <button
                onClick={() => handleFocusAction('deplete')}
                disabled={isSubmitting || !targetUserId}
                className="flex-1 py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-xl transition-colors border border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Deplete (Zero)
              </button>
            </div>
          </div>

          {focusStatusMessage && (
            <div className={`mt-6 p-4 rounded-xl border ${focusStatusMessage.type === 'success' ? 'bg-green-900/20 border-green-900/50 text-green-400' : 'bg-red-900/20 border-red-900/50 text-red-400'}`}>
              {focusStatusMessage.text}
            </div>
          )}
        </div>

        {/* Database Scrubber */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 md:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-6 h-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Database Scrubber</h2>
          </div>
          <p className="text-neutral-400 text-sm mb-8">Hard-delete user telemetry and history. This cannot be undone.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            <div className="md:col-span-6">
              <label className="block text-sm font-medium text-neutral-300 mb-2">Target User ID</label>
              <input
                type="text"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="Enter exact Firebase UID..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all font-mono text-sm"
              />
            </div>
            
            <div className="md:col-span-4">
              <label className="block text-sm font-medium text-neutral-300 mb-2">Target Collection</label>
              <select 
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all appearance-none"
              >
                <option value="All">All Attempts</option>
                <option value="stockAttempts">Stock Strategy Only</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <button
                onClick={() => setShowConfirm(true)}
                disabled={isSubmitting || !targetUserId}
                className="w-full py-3 px-4 bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900/50 font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Purge Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertTriangle className="w-8 h-8" />
              <h3 className="text-xl font-bold">Confirm Purge</h3>
            </div>
            <p className="text-neutral-300 mb-6">
              Are you absolutely sure you want to purge <strong>{moduleName}</strong> records for user <strong>{targetUserId}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-4 justify-end">
              <button 
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-lg font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={executePurge}
                className="px-4 py-2 rounded-lg font-bold bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Execute Purge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};