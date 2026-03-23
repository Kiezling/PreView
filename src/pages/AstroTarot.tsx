import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Layers, RefreshCw, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { generateTargetId, getDeviceType, cn } from '../lib/utils';

const CATEGORIES = {
  Energy: ['Positive', 'Negative'],
  Element: ['Hot', 'Cold', 'Heavy', 'Sharp'],
  Archetype: ['Major', 'Minor'],
};

export const AstroTarot: React.FC = () => {
  const { user } = useAuth();
  const [targetId, setTargetId] = useState(() => generateTargetId());
  
  const [guessType, setGuessType] = useState<string | null>(null);
  const [guess, setGuess] = useState<string | null>(null);
  
  const [actualAttribute, setActualAttribute] = useState<string | null>(null);
  const [actualCard, setActualCard] = useState<{name: string, url: string} | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const sequenceIndexRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, [targetId]);

  const handleSelectOption = async (selectedOption: string) => {
    if (isSubmitting || !user || !guessType) return;
    
    setGuess(selectedOption);
    setIsSubmitting(true);
    
    const timeToDecisionMs = Date.now() - startTimeRef.current;
    sequenceIndexRef.current += 1;

    try {
      const generateAndGrade = httpsCallable(functions, 'generateAndGradeTarget');
      const result = await generateAndGrade({
        testType: 'AstroTarot',
        guessType: guessType,
        guess: selectedOption,
        targetId,
        telemetry: {
          timeToDecisionMs,
          sessionSequenceIndex: sequenceIndexRef.current,
          localTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          deviceType: getDeviceType()
        }
      });
      
      const { actualTarget, isSuccess: hit } = result.data as any;
      setActualAttribute(actualTarget.actualAttribute);
      setActualCard(actualTarget.card);
      setIsSuccess(hit);
      window.dispatchEvent(new CustomEvent('staminaSpent'));
    } catch (error) {
      console.error("Error saving attempt:", error);
      if (error instanceof Error && error.message.includes("Focus Stamina depleted")) {
        window.dispatchEvent(new CustomEvent('staminaExhausted'));
      }
      setGuess(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setTargetId(generateTargetId());
    setGuessType(null);
    setGuess(null);
    setActualAttribute(null);
    setActualCard(null);
    setIsSuccess(null);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <header className="mb-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-6">
          <Layers className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white mb-4">Astro-Tarot Deck</h1>
        <p className="text-neutral-400 text-lg">
          Focus on the target identifier. Select a category, then choose your impression.
        </p>
      </header>

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 md:p-12 relative overflow-hidden">
        {!guessType ? (
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-white mb-8">Select your category</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button
                onClick={() => setGuessType('Energy')}
                className="p-8 rounded-2xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 transition-colors flex flex-col items-center gap-4"
              >
                <span className="text-2xl font-bold text-white">Energy</span>
                <span className="text-neutral-400 text-sm">Positive or Negative</span>
              </button>
              <button
                onClick={() => setGuessType('Element')}
                className="p-8 rounded-2xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 transition-colors flex flex-col items-center gap-4"
              >
                <span className="text-2xl font-bold text-white">Element</span>
                <span className="text-neutral-400 text-sm">Hot, Cold, Heavy, Sharp</span>
              </button>
              <button
                onClick={() => setGuessType('Archetype')}
                className="p-8 rounded-2xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 transition-colors flex flex-col items-center gap-4"
              >
                <span className="text-2xl font-bold text-white">Archetype</span>
                <span className="text-neutral-400 text-sm">Major or Minor</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <button 
              onClick={() => {
                setGuessType(null);
                setGuess(null);
                setActualAttribute(null);
                setActualCard(null);
                setIsSuccess(null);
              }}
              className="absolute top-8 left-8 flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Change Mode
            </button>

            <div className="mb-12 text-center mt-8">
              <p className="text-sm text-neutral-500 uppercase tracking-widest font-semibold mb-3">Target Identifier</p>
              <div className="inline-block bg-neutral-950 border border-neutral-800 rounded-xl px-8 py-4">
                <span className="text-3xl font-mono text-white tracking-[0.2em]">{targetId}</span>
              </div>
            </div>

            {!guess ? (
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-widest text-center mb-6">Making a selection below will expend 1 Focus.</p>
                <div className="flex flex-wrap justify-center gap-4">
                  {CATEGORIES[guessType as keyof typeof CATEGORIES].map(option => (
                    <button
                      key={option}
                      onClick={() => handleSelectOption(option)}
                      disabled={isSubmitting}
                      className={cn(
                        "p-6 rounded-xl border border-neutral-800 bg-neutral-900 transition-colors flex flex-col items-center justify-center gap-2 text-white",
                        isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:bg-neutral-800"
                      )}
                    >
                      <span className="text-lg font-bold">{option}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center"
              >
                <div className="flex flex-col items-center justify-center mb-10 w-full">
                  <p className="text-xl text-neutral-400 mb-6 font-medium">The Actual Target</p>
                  
                  {actualCard && (
                    <div className="w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden relative mb-6 bg-black border border-neutral-800">
                      <img src={actualCard.url} alt={actualCard.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  {actualCard && (
                    <div className="text-center">
                      <h4 className="text-white font-bold text-2xl">{actualCard.name}</h4>
                      <p className="text-lg text-neutral-500 font-medium mt-1">{guessType}: {actualAttribute}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 mb-10 bg-neutral-900/80 px-8 py-5 rounded-2xl border border-neutral-800 shadow-inner">
                  {isSuccess === true ? (
                    <span className="text-3xl font-bold text-white tracking-widest uppercase">Hit</span>
                  ) : isSuccess === false ? (
                    <span className="text-3xl font-bold text-white tracking-widest uppercase">Miss</span>
                  ) : (
                    <span className="text-3xl font-bold text-neutral-500 tracking-widest uppercase">...</span>
                  )}
                </div>

                <button
                  onClick={reset}
                  className="flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-black font-semibold hover:bg-neutral-200 transition-colors text-lg"
                >
                  <RefreshCw className="w-6 h-6" />
                  Try Again
                </button>
              </motion.div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};
