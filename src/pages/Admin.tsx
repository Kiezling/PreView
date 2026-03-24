import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { ShieldAlert, Database, AlertTriangle, Loader2, BatteryMedium, TrendingUp, ToggleRight } from 'lucide-react';

export const Admin: React.FC = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Scrubber State
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [moduleName, setModuleName] = useState<string>('All');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [focusStatusMessage, setFocusStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      try {
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        setIsAdmin(adminDoc.exists());
        if (adminDoc.exists()) {
          setTargetUserId(user.uid);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [user]);

  const handlePurgeClick = () => {
    if (!targetUserId.trim()) {
      setStatusMessage({ type: 'error', text: 'Target User ID is required.' });
      return;
    }
    setShowConfirm(true);
  };

  const executePurge = async () => {
    setShowConfirm(false);
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const purgeUserRecords = httpsCallable(functions, 'purgeUserRecords');
      const result = await purgeUserRecords({ targetUserId, moduleName });
      const data = result.data as any;
      setStatusMessage({ 
        type: 'success', 
        text: `Successfully purged ${data.deletedCount || 0} records for user ${targetUserId} in module ${moduleName}.` 
      });
    } catch (error: any) {
      console.error("Error purging records:", error);
      setStatusMessage({ 
        type: 'error', 
        text: error.message || 'An error occurred while purging records.' 
      });
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
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
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
          <Database className="w-8 h-8 text-indigo-400" />
          <h2 className="text-2xl font-semibold text-white">Database Scrubber</h2>
        </div>
        <p className="text-neutral-400 mb-6">
          This tool allows you to clean up orphaned or invalid records from the database.
        </p>
        
        <div className="bg-neutral-950 rounded-xl p-6 border border-neutral-800">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Target User ID</label>
              <input 
                type="text" 
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter User ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Module Name</label>
              <select 
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">All</option>
                <option value="Zener">Zener</option>
                <option value="Color">Color</option>
                <option value="StandardDeck">StandardDeck</option>
                <option value="AstroTarot">AstroTarot</option>
                <option value="Stock">Stock</option>
              </select>
            </div>

            <button
              onClick={handlePurgeClick}
              disabled={isSubmitting}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertTriangle className="w-5 h-5" />}
              PURGE RECORDS
            </button>

            {statusMessage && (
              <div className={`mt-4 p-4 rounded-lg border ${statusMessage.type === 'success' ? 'bg-green-900/20 border-green-900/50 text-green-400' : 'bg-red-900/20 border-red-900/50 text-red-400'}`}>
                {statusMessage.text}
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-neutral-800">
              <h3 className="text-lg font-medium text-white mb-4">Quick Actions</h3>
              <button
                onClick={() => {
                  if (!user) return;
                  setTargetUserId(user.uid);
                  setModuleName('Stock');
                  setShowConfirm(true);
                }}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
                Clear My Stock Attempts
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 mt-8">
        <div className="flex items-center gap-4 mb-6">
          <BatteryMedium className="w-8 h-8 text-green-400" />
          <h2 className="text-2xl font-semibold text-white">Focus Controls</h2>
        </div>
        <p className="text-neutral-400 mb-6">
          Manage focus for your account.
        </p>
        
        <div className="bg-neutral-950 rounded-xl p-6 border border-neutral-800">
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={async () => {
                setFocusStatusMessage(null);
                try {
                  const adminManageStamina = httpsCallable(functions, 'adminManageStamina');
                  await adminManageStamina({ targetUserId: user?.uid, action: 'refill' });
                  setFocusStatusMessage({ type: 'success', text: 'Focus refilled successfully.' });
                  window.dispatchEvent(new CustomEvent('forceStaminaSync'));
                } catch (error: any) {
                  setFocusStatusMessage({ type: 'error', text: 'Error: ' + error.message });
                }
              }}
              className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 px-4 rounded-lg transition-colors border border-neutral-700"
            >
              Refill Focus (Self)
            </button>
            <button
              onClick={async () => {
                setFocusStatusMessage(null);
                try {
                  const adminManageStamina = httpsCallable(functions, 'adminManageStamina');
                  await adminManageStamina({ targetUserId: user?.uid, action: 'toggleInfinite' });
                  setFocusStatusMessage({ type: 'success', text: 'Toggled infinite focus successfully.' });
                  window.dispatchEvent(new CustomEvent('forceStaminaSync'));
                } catch (error: any) {
                  setFocusStatusMessage({ type: 'error', text: 'Error: ' + error.message });
                }
              }}
              className="flex-1 flex items-center justify-between bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 px-6 rounded-lg transition-colors border border-neutral-700"
            >
              <span>Infinite Focus (Self)</span>
              <div className="flex items-center gap-2 text-sm font-normal text-neutral-400">
                <span>Toggle Mode</span>
                <ToggleRight className="w-5 h-5 text-indigo-400" />
              </div>
            </button>
          </div>
          {focusStatusMessage && (
            <div className={`mt-4 p-4 rounded-lg border ${focusStatusMessage.type === 'success' ? 'bg-green-900/20 border-green-900/50 text-green-400' : 'bg-red-900/20 border-red-900/50 text-red-400'}`}>
              {focusStatusMessage.text}
            </div>
          )}
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
                className="px-4 py-2 rounded-lg font-bold bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                Yes, Purge Records
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
