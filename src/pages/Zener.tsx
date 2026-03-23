import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Star, RefreshCw, CheckCircle2, XCircle, Circle, Plus, Waves, Square, Star as StarIcon } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { generateTargetId, getDeviceType } from '../lib/utils';

const CARDS = ['Circle', 'Cross', 'Waves', 'Square', 'Star'];

const ZenerIcon = ({ card, className, isColored }: { card: string, className?: string, isColored?: boolean }) => {
  const getColor = () => {
    if (!isColored) return 'currentColor';
    switch(card) {
      case 'Circle': return '#ef4444'; // red
      case 'Cross': return '#3b82f6'; // blue
      case 'Waves': return '#10b981'; // green
      case 'Square': return '#eab308'; // yellow
      case 'Star': return '#a855f7'; // purple
      default: return 'currentColor';
    }
  };
  const color = getColor();
  switch(card) {
    case 'Circle': return <Circle className={className} color={color} />;
    case 'Cross': return <Plus className={className} color={color} />;
    case 'Waves': return <Waves className={className} color={color} />;
    case 'Square': return <Square className={className} color={color} />;
    case 'Star': return <StarIcon className={className} color={color} />;
    default: return null;
  }
};

export const Zener: React.FC = () => {
  const { user } = useAuth();
  const [targetId, setTargetId] = useState(() => generateTargetId());
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [actualCard, setActualCard] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isColored, setIsColored] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const sequenceIndexRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, [targetId]);

  const handleSelect = async (card: string) => {
    if (selectedCard || isSubmitting || !user) return;
    
    const timeToDecisionMs = Date.now() - startTimeRef.current;
    sequenceIndexRef.current += 1;
    
    setIsSubmitting(true);
    setSelectedCard(card);
    
    try {
      const getStaminaStatus = httpsCallable(functions, 'getStaminaStatus');
      const staminaResult = await getStaminaStatus();
      const stamina = (staminaResult.data as any).focusStamina;

      const generateAndGrade = httpsCallable(functions, 'generateAndGradeTarget');
      const result = await generateAndGrade({
        testType: 'Zener',
        guess: card,
        targetId,
        telemetry: {
          timeToDecisionMs,
          sessionSequenceIndex: sequenceIndexRef.current,
          localTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          deviceType: getDeviceType(),
          focusLevelAtAttempt: stamina
        }
      });
      
      const { actualTarget } = result.data as any;
      setActualCard(actualTarget);
      window.dispatchEvent(new CustomEvent('staminaSpent'));
    } catch (error) {
      console.error("Error saving attempt:", error);
      if (error instanceof Error && error.message.includes("Focus Stamina depleted")) {
        window.dispatchEvent(new CustomEvent('staminaExhausted'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setTargetId(generateTargetId());
    setSelectedCard(null);
    setActualCard(null);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <header className="mb-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-6">
          <Star className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white mb-4">Zener Cards</h1>
        <p className="text-neutral-400 text-lg">
          Focus on the target identifier below. What Zener symbol will it be?
        </p>
      </header>

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
        {/* Target ID Display */}
        <div className="mb-12 relative">
          <div className="absolute right-0 top-0 flex items-center gap-3">
            <span className="text-sm text-neutral-400 font-medium">B/W</span>
            <button 
              onClick={() => setIsColored(!isColored)}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${isColored ? 'bg-white' : 'bg-neutral-700'}`}
            >
              <div className={`w-4 h-4 rounded-full transition-transform ${isColored ? 'bg-black translate-x-6' : 'bg-white translate-x-0'}`} />
            </button>
            <span className="text-sm text-neutral-400 font-medium">Color</span>
          </div>
          <p className="text-sm text-neutral-500 uppercase tracking-widest font-semibold mb-3">Target Identifier</p>
          <div className="inline-block bg-neutral-950 border border-neutral-800 rounded-xl px-8 py-4">
            <span className="text-3xl font-mono text-white tracking-[0.2em]">{targetId}</span>
          </div>
        </div>

        {/* Card Selection */}
        {!selectedCard ? (
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-widest text-center mb-6">Making a selection will expend 1 Focus.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {CARDS.map((card) => (
                <motion.button
                  key={card}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelect(card)}
                  disabled={isSubmitting}
                  className="aspect-[3/4] rounded-xl border-2 border-neutral-700 bg-neutral-800 hover:border-white hover:bg-neutral-700 transition-colors flex items-center justify-center text-lg font-medium text-white shadow-lg"
                >
                  {card}
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center w-full"
          >
            <div className="flex flex-col items-center justify-center mb-8 w-full">
              <p className="text-xl text-neutral-400 mb-6 font-medium">The Actual Target</p>
              <div className={`w-64 sm:w-80 aspect-[3/4] rounded-3xl border-4 flex flex-col items-center justify-center bg-neutral-800 shadow-2xl border-neutral-600 shadow-neutral-900/50`}>
                <ZenerIcon card={actualCard!} className="w-32 h-32 sm:w-40 sm:h-40 text-white mb-8" isColored={isColored} />
                <span className="text-4xl font-bold text-white tracking-wider">{actualCard}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 mb-10 bg-neutral-900/80 px-8 py-5 rounded-2xl border border-neutral-800 shadow-inner">
              <div className="text-center">
                <p className="text-sm text-neutral-500 mb-2 uppercase tracking-wider font-semibold">You Selected</p>
                <p className="text-xl font-bold text-white flex items-center justify-center gap-2">
                  {selectedCard}
                </p>
              </div>
              
              <div className="hidden sm:block w-px h-16 bg-neutral-800 mx-2"></div>
              
              <div className="flex items-center gap-3">
                {selectedCard === actualCard ? (
                  <span className="text-3xl font-bold text-white tracking-widest uppercase">Hit</span>
                ) : (
                  <span className="text-3xl font-bold text-white tracking-widest uppercase">Miss</span>
                )}
              </div>
            </div>

            <button
              onClick={reset}
              className="flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-black font-semibold hover:bg-neutral-200 transition-colors text-lg"
            >
              <RefreshCw className="w-6 h-6" />
              Next Target
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
