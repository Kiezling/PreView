import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, RefreshCw, CheckCircle2, XCircle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { format, addDays, isWeekend } from 'date-fns';

export const Stock: React.FC = () => {
  const { user } = useAuth();
  const [targetDate, setTargetDate] = useState<Date>(new Date());
  const [selectedDirection, setSelectedDirection] = useState<'Higher' | 'Lower' | null>(null);
  const [actualDirection, setActualDirection] = useState<'Higher' | 'Lower' | 'Pending'>('Pending');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState({ higher: '', lower: '', prior: '' });
  const [priorClose, setPriorClose] = useState<number | null>(null);
  const [isLoadingClose, setIsLoadingClose] = useState(true);

  useEffect(() => {
    // Calculate next trading day
    let nextDay = new Date();
    // Simple logic: if it's weekend, move to Monday
    if (isWeekend(nextDay)) {
      nextDay = addDays(nextDay, nextDay.getDay() === 6 ? 2 : 1);
    }
    setTargetDate(nextDay);
    
    const dateStr = format(nextDay, 'yyyy-MM-dd');
    setImages({
      higher: `https://picsum.photos/seed/higher-${dateStr}/400/300`,
      lower: `https://picsum.photos/seed/lower-${dateStr}/400/300`,
      prior: '',
    });

    // Fetch prior day close for S&P 500
    const fetchPriorClose = async () => {
      try {
        const url = encodeURIComponent('https://query1.finance.yahoo.com/v8/finance/chart/^GSPC?range=5d&interval=1d');
        const response = await fetch(`https://api.allorigins.win/get?url=${url}`);
        if (response.ok) {
          const data = await response.json();
          const parsed = JSON.parse(data.contents);
          const meta = parsed.chart.result[0].meta;
          setPriorClose(meta.chartPreviousClose || meta.previousClose);
        }
      } catch (error) {
        console.error("Error fetching S&P 500 data:", error);
      } finally {
        setIsLoadingClose(false);
      }
    };

    const fetchExistingAttempt = async () => {
      if (!user) return;
      const q = query(
        collection(db, 'stockAttempts'),
        where('userId', '==', user.uid),
        where('targetDate', '==', format(nextDay, 'yyyy-MM-dd')),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const attempt = snapshot.docs[0].data();
        setSelectedDirection(attempt.selectedDirection);
        setActualDirection(attempt.actualDirection || 'Pending');
      }
    };

    fetchPriorClose();
    fetchExistingAttempt();
  }, [user]);

  const handleSelect = async (direction: 'Higher' | 'Lower') => {
    if (selectedDirection || isSubmitting || !user) return;
    
    setIsSubmitting(true);
    
    try {
      await addDoc(collection(db, 'stockAttempts'), {
        userId: user.uid,
        targetDate: format(targetDate, 'yyyy-MM-dd'),
        selectedDirection: direction,
        actualDirection: 'Pending',
        isSuccess: false,
        timestamp: new Date().toISOString(),
      });
      setSelectedDirection(direction);
      setActualDirection('Pending');
    } catch (error) {
      console.error("Error saving attempt:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    // No-op since it's one play per day
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <header className="mb-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-6">
          <TrendingUp className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white mb-4">Stock Strategy</h1>
        <p className="text-neutral-400 text-lg">
          Predict if the S&P 500 will close Higher or Lower on {format(targetDate, 'EEEE, MMMM do')}.
        </p>
      </header>

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 md:p-12 relative overflow-hidden">
        
        <div className="mb-12 flex flex-col items-center">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 w-full max-w-md text-center">
            <p className="text-sm text-neutral-500 uppercase tracking-widest font-semibold mb-2">S&P 500 Prior Close</p>
            {isLoadingClose ? (
              <div className="h-10 flex items-center justify-center">
                <div className="animate-pulse w-24 h-8 bg-neutral-800 rounded"></div>
              </div>
            ) : (
              <p className="text-3xl font-mono text-white">
                {priorClose ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(priorClose) : '---'}
              </p>
            )}
          </div>
        </div>

        {!selectedDirection ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect('Higher')}
              disabled={isSubmitting}
              className="flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-neutral-800 bg-neutral-900 hover:border-white transition-colors group"
            >
              <div className="w-full aspect-video rounded-xl overflow-hidden border border-neutral-800">
                {images.higher && <img src={images.higher} alt="Higher" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />}
              </div>
              <div className="flex items-center gap-2 text-xl font-bold text-white group-hover:text-white">
                <ArrowUpCircle className="w-6 h-6" />
                HIGHER
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect('Lower')}
              disabled={isSubmitting}
              className="flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-neutral-800 bg-neutral-900 hover:border-white transition-colors group"
            >
              <div className="w-full aspect-video rounded-xl overflow-hidden border border-neutral-800">
                {images.lower && <img src={images.lower} alt="Lower" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />}
              </div>
              <div className="flex items-center gap-2 text-xl font-bold text-white group-hover:text-white">
                <ArrowDownCircle className="w-6 h-6" />
                LOWER
              </div>
            </motion.button>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center"
          >
            {actualDirection === 'Pending' ? (
              <div className="text-center py-12">
                <RefreshCw className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
                <p className="text-xl font-semibold text-white">Simulating Market Close...</p>
                <p className="text-neutral-400">In a real app, this would wait until the end of the trading day.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center gap-8 mb-8">
                  <div className="text-center">
                    <p className="text-sm text-neutral-500 mb-3">You Selected</p>
                    <div className="w-48 aspect-video rounded-xl border-2 border-neutral-700 bg-neutral-800 overflow-hidden relative">
                      {(selectedDirection === 'Higher' ? images.higher : images.lower) && (
                        <img src={selectedDirection === 'Higher' ? images.higher : images.lower} alt={selectedDirection} className="w-full h-full object-cover opacity-50" referrerPolicy="no-referrer" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-white drop-shadow-lg">
                        {selectedDirection}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-neutral-500 mb-3">Actual Market</p>
                    <div className={`w-48 aspect-video rounded-xl border-2 overflow-hidden relative ${
                      selectedDirection === actualDirection 
                        ? 'border-white' 
                        : 'border-white'
                    }`}>
                      {(actualDirection === 'Higher' ? images.higher : images.lower) && (
                        <img src={actualDirection === 'Higher' ? images.higher : images.lower} alt={actualDirection} className="w-full h-full object-cover opacity-50" referrerPolicy="no-referrer" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-white drop-shadow-lg">
                        {actualDirection}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-8 bg-neutral-900/80 px-8 py-5 rounded-2xl border border-neutral-800 shadow-inner">
                  {actualDirection === 'Pending' ? (
                    <span className="text-xl font-bold text-neutral-400 tracking-widest uppercase">Waiting for Market Close</span>
                  ) : selectedDirection === actualDirection ? (
                    <span className="text-3xl font-bold text-white tracking-widest uppercase">Hit</span>
                  ) : (
                    <span className="text-3xl font-bold text-white tracking-widest uppercase">Miss</span>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
