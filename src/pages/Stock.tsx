import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, RefreshCw, ArrowUpCircle, ArrowDownCircle, ChevronLeft, ChevronRight, Undo, Redo, Eraser, Trash2 } from 'lucide-react';
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

const getPrevTradingDay = (date: Date) => {
  let prev = subDays(date, 1);
  if (prev.getDay() === 0) prev = subDays(prev, 2);
  if (prev.getDay() === 6) prev = subDays(prev, 1);
  return prev;
};

export const Stock: React.FC = () => {
  const { user } = useAuth();
  const [targetDate, setTargetDate] = useState<Date>(() => {
    let nextDay = new Date();
    if (isWeekend(nextDay)) {
      nextDay = addDays(nextDay, nextDay.getDay() === 6 ? 2 : 1);
    }
    return nextDay;
  });
  
  const [attemptState, setAttemptState] = useState<'NoAttempt' | 'Pending' | 'Resolved'>('NoAttempt');
  const [selectedDirection, setSelectedDirection] = useState<'Higher' | 'Lower' | null>(null);
  const [actualDirection, setActualDirection] = useState<'Higher' | 'Lower' | 'Pending'>('Pending');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState({ higher: '', lower: '' });
  const [priorClose, setPriorClose] = useState<number | null>(null);
  const [isLoadingClose, setIsLoadingClose] = useState(true);
  const [isRevealed, setIsRevealed] = useState(false);

  // Sketchpad State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
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
      if (isMounted) {
        setIsLoadingClose(true);
        setPriorClose(null);
        setAttemptState('NoAttempt');
        setSelectedDirection(null);
        setActualDirection('Pending');
        setIsRevealed(false);
        setStrokes([]);
        setRedoStack([]);
      }

      const dateStr = format(targetDate, 'yyyy-MM-dd');
      
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

      if (!user) return;

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
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const drawStroke = (stroke: Stroke) => {
        if (stroke.points.length === 0) return;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        if (stroke.isEraser) {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = stroke.color;
        }
        ctx.lineWidth = stroke.width;
        ctx.stroke();
      };

      strokes.forEach(drawStroke);
      if (currentStroke) drawStroke(currentStroke);
      
      ctx.globalCompositeOperation = 'source-over';
    }

    return () => { isMounted = false; };
  }, [strokes, currentStroke]);

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
    setCurrentStroke({ points: [coords], color: currentColor, width: isEraser ? 20 : 3, isEraser });
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || isRevealed || attemptState !== 'NoAttempt') return;
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords || !currentStroke) return;
    setCurrentStroke(prev => prev ? { ...prev, points: [...prev.points, coords] } : null);
  };

  const stopDrawing = () => {
    if (!isDrawing || isRevealed || attemptState !== 'NoAttempt') return;
    setIsDrawing(false);
    if (currentStroke) {
      setStrokes(prev => [...prev, currentStroke]);
      setRedoStack([]);
      setCurrentStroke(null);
    }
  };

  const handleSelect = async (direction: 'Higher' | 'Lower') => {
    if (selectedDirection || isSubmitting || !user) return;
    
    const timeToDecisionMs = Date.now() - startTimeRef.current;
    sequenceIndexRef.current += 1;

    setIsSubmitting(true);
    
    try {
      const generateAndGrade = httpsCallable(functions, 'generateAndGradeTarget');
      const result = await generateAndGrade({
        testType: 'Stock',
        guess: direction,
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
    } catch (error) {
      console.error("Error saving attempt:", error);
    } finally {
      setIsSubmitting(false);
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
          <button onClick={() => setTargetDate(getPrevTradingDay(targetDate))} className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-xl font-bold text-white min-w-[200px]">
            {format(targetDate, 'EEEE, MMMM do')}
          </div>
          <button onClick={() => setTargetDate(getNextTradingDay(targetDate))} className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white transition-colors">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </header>

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 md:p-12 relative overflow-hidden">
        
        {attemptState === 'NoAttempt' && (
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
                    if (strokes.length === 0) return;
                    const newStrokes = [...strokes];
                    const popped = newStrokes.pop();
                    setStrokes(newStrokes);
                    if (popped) setRedoStack([...redoStack, popped]);
                  }} disabled={strokes.length === 0 || isRevealed} className="p-1 hover:bg-neutral-200 rounded disabled:opacity-50">
                    <Undo className="w-5 h-5 text-neutral-700" />
                  </button>
                  <button onClick={() => {
                    if (redoStack.length === 0) return;
                    const newRedo = [...redoStack];
                    const popped = newRedo.pop();
                    setRedoStack(newRedo);
                    if (popped) setStrokes([...strokes, popped]);
                  }} disabled={redoStack.length === 0 || isRevealed} className="p-1 hover:bg-neutral-200 rounded disabled:opacity-50">
                    <Redo className="w-5 h-5 text-neutral-700" />
                  </button>
                  <button onClick={() => {
                    setStrokes([]);
                    setRedoStack([]);
                  }} disabled={strokes.length === 0 || isRevealed} className="p-1 hover:bg-neutral-200 rounded disabled:opacity-50">
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
              </>
            )}
          </>
        )}

        {attemptState === 'Pending' && (
          <div className="text-center py-12">
            <RefreshCw className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
            <p className="text-xl font-semibold text-white">Prediction Recorded. Waiting for Market Close.</p>
            <p className="text-neutral-400 mt-2">Check back later to see the results.</p>
          </div>
        )}

        {attemptState === 'Resolved' && (
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
              {selectedDirection === actualDirection ? (
                <span className="text-3xl font-bold text-green-400 tracking-widest uppercase">Hit</span>
              ) : (
                <span className="text-3xl font-bold text-red-400 tracking-widest uppercase">Miss</span>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
