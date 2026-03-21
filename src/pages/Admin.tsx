import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ShieldAlert, Database } from 'lucide-react';

export const Admin: React.FC = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
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
          <p className="text-neutral-500 text-center italic">
            Scrubber interface coming soon...
          </p>
        </div>
      </div>
    </div>
  );
};
