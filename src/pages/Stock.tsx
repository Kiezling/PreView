// src/pages/Stock.tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useOutletContext } from 'react-router-dom';
import { TrendingUp, RefreshCw, ArrowUpCircle, ArrowDownCircle, Undo, Redo, Eraser, Trash2, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { format, addDays, subDays, isWeekend } from 'date-fns';
import { getDeviceType } from '../lib/utils';

interface Point { x: number; y: number }
interface Stroke { points: Point[]; color: string; width: number; isEraser: boolean }

const COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'Red', hex: '#ef4444' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Violet', hex: '#8b5cf6' }
];

const getNextTradingDay = (date: Date) => {
  let next = addDays(date, 1);
  if (next.getDay() === 6) next = addDays(next, 2);
  if (next.getDay() === 0) next = addDays(next, 1);
  return next;
};

export const Stock: React.FC = () => {
  const { user } = useAuth();
  const { stamina, isInfinite, timeLeftStr } = useOutletContext<{ stamina: number | null, isInfinite: boolean, timeLeftStr: string }>();
  const [targetDate, setTargetDate] = useState<Date>(() => {
    return getNextTradingDay(new Date());
  });
  
  const [attemptState, setAttemptState] = useState<'NoAttempt' | 'Pending' | 'Resolved'>('NoAttempt');
  const [selectedDirection, setSelectedDirection] = useState<'Higher' | 'Lower' | null>(null);
  const [actualDirection, setActualDirection] = useState<'Higher' | 'Lower' | 'Pending'>('Pending');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAttempt, setIsCheckingAttempt] = useState(true);
  const [pendingDirection, setPendingDirection] = useState<'Higher' | 'Lower' | null>(null);
  const [images, setImages] = useState({ higher: '', lower: '' });
  const [priorClose, setPriorClose] = useState<number | null>(null);
  const [isLoadingClose, setIsLoadingClose] = useState(true);
  const [isRevealed, setIsRevealed] = useState(false);

  // Sketchpad State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState<number>(-1);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [isEraser, setIsEraser] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const sequenceIndexRef = useRef<number>(0);

  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      startTimeRef.current = Date.now();
    }
    return () => { isMounted = false; };
  }, [targetDate]);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      const dateStr = format(targetDate, 'yyyy-MM-dd');

      if (isMounted) {
        setIsCheckingAttempt(true);
        setIsLoadingClose(true);
        setPriorClose(null);
        setAttemptState('NoAttempt');
        setSelectedDirection(null);
        setActualDirection('Pending');
        setIsRevealed(false);
        
        const cachedData = sessionStorage.getItem('sketch_' + dateStr);
        if (cachedData && cachedData.startsWith('data:image')) {
          setHistory([cachedData]);
          setHistoryStep(0);
        } else {
          setHistory([]);
          setHistoryStep(-1);
        }
      }
      
      if (isMounted) {
        setImages({
          higher: `https://picsum.photos/seed/higher-${dateStr}/400/300`,
          lower: `https://picsum.photos/seed/lower-${dateStr}/400/300`
        });
      }

      try {
        const getMarketData = httpsCallable(functions, 'getMarketData');
        const marketRes = await getMarketData({ targetDate: dateStr });
        if (isMounted) {
          setPriorClose((marketRes.data as any).priorClose);
        }
      } catch (error) {
        console.error("Error fetching market data:", error);
      } finally {
        if (isMounted) {
          setIsLoadingClose(false);
        }
      }

      if (!user) {
        if (isMounted) setIsCheckingAttempt(false);
        return;
      }

      try {
        const q = query(
          collection(db, 'stockAttempts'),
          where('userId', '==', user.uid),
          where('targetDate', '==', dateStr),
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (isMounted && !snapshot.empty) {
          const attempt = snapshot.docs[0].data();
          setSelectedDirection(attempt.selectedDirection);
          setActualDirection(attempt.actualDirection || 'Pending');
          if (attempt.actualDirection && attempt.actualDirection !== 'Pending') {
            setAttemptState('Resolved');
          } else {
            setAttemptState('Pending');
          }
        }
      } catch (error) {
        console.error("Error fetching attempt:", error);
      } finally {
        if (isMounted) {
          setIsCheckingAttempt(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [targetDate, user]);

  useEffect(() => {
    let isMounted = true;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isMounted) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (historyStep >= 0 && history[historyStep]) {
        const img = new Image();
        img.onload = () => {
          if (isMounted) {
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(img, 0, 0);
          }
        };
        img.src = history[historyStep];
      }
    }

    return () => { isMounted = false; };
  }, [historyStep, history, targetDate]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    if (!canvasRef.current) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate scale factors
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    } else {
      return {
        x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
        y: ((e as React.MouseEvent).clientY - rect.top) * scaleY
      };
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (isRevealed || attemptState !== 'NoAttempt') return;
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;
    setIsDrawing(true);
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = isEraser ? 20 : 3;
      if (isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = currentColor;
      }
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || isRevealed || attemptState !== 'NoAttempt') return;
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing || isRevealed || attemptState !== 'NoAttempt') return;
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      let newHistory = history.slice(0, historyStep + 1);
      newHistory.push(dataUrl);
      if (newHistory.length > 15) {
          newHistory = newHistory.slice(newHistory.length - 15);
      }
      setHistory(newHistory);
      setHistoryStep(newHistory.length - 1);
      sessionStorage.setItem('sketch_' + format(targetDate, 'yyyy-MM-dd'), dataUrl);
    }
  };

  const handleSelect = async (direction: 'Higher' | 'Lower') => {
    if (selectedDirection || isSubmitting || !user) return;
    
    const timeToDecisionMs = Date.now() - startTimeRef.current;
    sequenceIndexRef.current += 1;

    setIsSubmitting(true);
    setPendingDirection(direction);
    
    try {
      const getStaminaStatus = httpsCallable(functions, 'getStaminaStatus');
      const staminaResult = await getStaminaStatus();
      const stamina = (staminaResult.data as any).focusStamina;

      const generateAndGrade = httpsCallable(functions, 'generateAndGradeTarget');
      const result = await generateAndGrade({
        testType: 'Stock',
        guess: direction,
        targetId: format(targetDate, 'yyyy-MM-dd'),
        targetDate: format(targetDate, 'yyyy-MM-dd'),
        telemetry: {
          timeToDecisionMs,
          sessionSequenceIndex: sequenceIndexRef.current,
          localTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          deviceType: getDeviceType()
        }
      });
      
      const { actualTarget } = result.data as any;
      setSelectedDirection(direction);
      setActualDirection(actualTarget);
      if (actualTarget === 'Pending') {
        setAttemptState('Pending');
      } else {
        setAttemptState('Resolved');
      }
      window.dispatchEvent(new CustomEvent('staminaSpent'));
    } catch (error: any) {
      console.error("Error saving attempt:", error);
      if (error?.code === 'out-of-range' || (error instanceof Error && error.message.includes("Focus Stamina depleted"))) {
        window.dispatchEvent(new CustomEvent('staminaExhausted'));
      }
    } finally {
      setIsSubmitting(false);
      setPendingDirection(null);
    }
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
        <p className="text-neutral-400 text-lg mb-6">
          Predict if the S&P 500 will close Higher or Lower.
        </p>
        
        <div className="flex items-center justify-center gap-4">
          <div className="text-xl font-bold text-white min-w-[200px]">
            {format(targetDate, 'EEEE, MMMM do')}
          </div>
        </div>
      </header>

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 md:p-12 relative overflow-hidden">
        
        {isCheckingAttempt ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
            <p className="text-neutral-400 font-medium">Checking target status...</p>
          </div>
        ) : (
          <>
            {selectedDirection === null && (
          <>
            {/* Sketchpad */}
            <div className="bg-white rounded-xl overflow-hidden border border-neutral-300 mb-8 max-w-2xl mx-auto">
              <div className="bg-neutral-100 p-2 flex items-center justify-between border-b border-neutral-300">
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button
                      key={c.name}
                      onClick={() => { setCurrentColor(c.hex); setIsEraser(false); }}
                      className={`w-6 h-6 rounded-full border-2 ${currentColor === c.hex && !isEraser ? 'border-black scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c.hex }}
                      disabled={isRevealed}
                    />
                  ))}
                  <button
                    onClick={() => setIsEraser(true)}
                    className={`p-1 rounded ${isEraser ? 'bg-neutral-300' : 'hover:bg-neutral-200'}`}
                    disabled={isRevealed}
                  >
                    <Eraser className="w-5 h-5 text-neutral-700" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => {
                    if (historyStep > 0) {
                      setHistoryStep(prev => prev - 1);
                    } else if (historyStep === 0) {
                      setHistoryStep(-1);
                    }
                  }} disabled={historyStep < 0 || isRevealed} className="p-1 hover:bg-neutral-200 rounded disabled:opacity-50">
                    <Undo className="w-5 h-5 text-neutral-700" />
                  </button>
                  <button onClick={() => {
                    if (historyStep < history.length - 1) {
                      setHistoryStep(prev => prev + 1);
                    }
                  }} disabled={historyStep >= history.length - 1 || isRevealed} className="p-1 hover:bg-neutral-200 rounded disabled:opacity-50">
                    <Redo className="w-5 h-5 text-neutral-700" />
                  </button>
                  <button onClick={() => {
                    setHistory([]);
                    setHistoryStep(-1);
                    if (canvasRef.current) {
                      const ctx = canvasRef.current.getContext('2d');
                      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                      sessionStorage.removeItem('sketch_' + format(targetDate, 'yyyy-MM-dd'));
                    }
                  }} disabled={(historyStep < 0 && !sessionStorage.getItem('sketch_' + format(targetDate, 'yyyy-MM-dd'))) || isRevealed} className="p-1 hover:bg-neutral-200 rounded disabled:opacity-50">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </button>
                </div>
              </div>
              <canvas
                ref={canvasRef}
                width={800}
                height={400}
                className="w-full h-auto bg-white touch-none cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                style={{ opacity: isRevealed ? 0.7 : 1, pointerEvents: isRevealed ? 'none' : 'auto' }}
              />
            </div>
            
            {!isRevealed ? (
              <div className="text-center mt-8">
                <button onClick={() => setIsRevealed(true)} className="px-8 py-4 rounded-xl bg-white text-black font-semibold hover:bg-neutral-200 transition-colors text-lg">
                  Reveal Target Options
                </button>
              </div>
            ) : (
              <>
                {/* S&P 500 Prior Close */}
                <div className="mt-12 mb-8 flex flex-col items-center">
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

                {/* Higher / Lower Buttons */}
                {stamina === 0 && !isInfinite && !selectedDirection ? (
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-8 text-center mt-8">
                    <p className="text-neutral-500 uppercase tracking-widest text-sm font-semibold mb-2">Time until next focus point</p>
                    <p className="text-4xl font-mono text-white">{timeLeftStr}</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-neutral-500 uppercase tracking-widest text-center mb-6">Making a selection will expend 1 Focus.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelect('Higher')}
                        disabled={isSubmitting}
                        className={`flex flex-col items-center gap-4 p-6 rounded-2xl border-2 bg-neutral-900 transition-colors group
                          ${pendingDirection === 'Higher' ? 'border-white ring-4 ring-white/50' : 'border-neutral-800 hover:border-white'}
                          ${pendingDirection === 'Lower' ? 'opacity-50' : 'opacity-100'}
                        `}
                      >
                        <div className="w-full aspect-video rounded-xl overflow-hidden border border-neutral-800">
                          {images.higher && <img src={images.higher} alt="Higher" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />}
                        </div>
                        <div className="flex items-center gap-2 text-xl font-bold text-white group-hover:text-white">
                          {pendingDirection === 'Higher' ? <Loader2 className="w-6 h-6 animate-spin" /> : <ArrowUpCircle className="w-6 h-6" />}
                          HIGHER
                        </div>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelect('Lower')}
                        disabled={isSubmitting}
                        className={`flex flex-col items-center gap-4 p-6 rounded-2xl border-2 bg-neutral-900 transition-colors group
                          ${pendingDirection === 'Lower' ? 'border-white ring-4 ring-white/50' : 'border-neutral-800 hover:border-white'}
                          ${pendingDirection === 'Higher' ? 'opacity-50' : 'opacity-100'}
                        `}
                      >
                        <div className="w-full aspect-video rounded-xl overflow-hidden border border-neutral-800">
                          {images.lower && <img src={images.lower} alt="Lower" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />}
                        </div>
                        <div className="flex items-center gap-2 text-xl font-bold text-white group-hover:text-white">
                          {pendingDirection === 'Lower' ? <Loader2 className="w-6 h-6 animate-spin" /> : <ArrowDownCircle className="w-6 h-6" />}
                          LOWER
                        </div>
                      </motion.button>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {selectedDirection !== null && actualDirection === 'Pending' && (
          <div className="text-center py-12">
            <RefreshCw className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
            <p className="text-xl font-semibold text-white">Prediction Recorded. Waiting for Market Close.</p>
            <p className="text-neutral-400 mt-2">Check back later to see the results.</p>
          </div>
        )}

        {selectedDirection !== null && actualDirection !== 'Pending' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center"
          >
            <div className="flex items-center justify-center gap-8 mb-8">
              <div className="text-center">
                <p className="text-sm text-neutral-500 mb-3">Actual Market Direction</p>
                <div className={`w-64 aspect-video rounded-xl border-2 overflow-hidden relative border-white shadow-2xl shadow-white/20`}>
                  {(actualDirection === 'Higher' ? images.higher : images.lower) && (
                    <img src={actualDirection === 'Higher' ? images.higher : images.lower} alt={actualDirection} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-3xl font-bold text-white drop-shadow-lg">
                    {actualDirection}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-8 bg-neutral-900/80 px-8 py-5 rounded-2xl border border-neutral-800 shadow-inner">
              <span className="text-sm text-neutral-500 uppercase tracking-wider font-semibold mr-2">Accuracy:</span>
              {selectedDirection === actualDirection ? (
                <span className="text-3xl font-bold text-white tracking-widest uppercase">Hit</span>
              ) : (
                <span className="text-3xl font-bold text-neutral-300 tracking-widest uppercase">Miss</span>
              )}
            </div>
          </motion.div>
        )}
          </>
        )}
      </div>
    </motion.div>
  );
};