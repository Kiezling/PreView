import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Layers, RefreshCw, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { generateTargetId, getDeviceType } from '../lib/utils';

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
    } catch (error) {
      console.error("Error saving attempt:", error);
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
        <div className="mb-12 text-center">
          <p className="text-sm text-neutral-500 uppercase tracking-widest font-semibold mb-3">Target Identifier</p>
          <div className="inline-block bg-neutral-950 border border-neutral-800 rounded-xl px-8 py-4">
            <span className="text-3xl font-mono text-white tracking-[0.2em]">{targetId}</span>
          </div>
        </div>

        <div className="flex justify-center">
          {!actualCard ? (
            <div className="w-full max-w-lg">
              {!guessType ? (
                <div className="space-y-4">
                  <h3 className="text-xl font-medium text-white mb-6 text-center">Select Category</h3>
                  {Object.keys(CATEGORIES).map(category => (
                    <button
                      key={category}
                      onClick={() => setGuessType(category)}
                      className="w-full p-6 rounded-2xl border-2 border-neutral-800 bg-neutral-900 text-white font-semibold text-lg hover:border-white transition-colors"
                    >
                      {category}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center mb-6">
                    <button 
                      onClick={() => setGuessType(null)}
                      disabled={isSubmitting}
                      className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 transition-colors disabled:opacity-50"
                    >
                      <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h3 className="text-xl font-medium text-white flex-1 text-center pr-10">Select {guessType}</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {CATEGORIES[guessType as keyof typeof CATEGORIES].map(option => (
                      <button
                        key={option}
                        onClick={() => handleSelectOption(option)}
                        disabled={isSubmitting}
                        className={`p-6 rounded-2xl border-2 transition-colors text-lg font-semibold
                          ${guess === option ? 'border-white bg-white/10 text-white' : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-500 hover:text-white'}
                          ${isSubmitting && guess !== option ? 'opacity-50' : 'opacity-100'}
                        `}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center w-full"
            >
              <div className="flex items-center gap-3 mb-8 bg-neutral-900/80 px-8 py-5 rounded-2xl border border-neutral-800 shadow-inner">
                {isSuccess ? (
                  <span className="text-3xl font-bold text-white tracking-widest uppercase">Hit</span>
                ) : (
                  <span className="text-3xl font-bold text-neutral-400 tracking-widest uppercase">Miss</span>
                )}
              </div>

              <div className="w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden relative mb-6 bg-black border border-neutral-800">
                <img src={actualCard.url} alt={actualCard.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
              
              <div className="text-center mb-10">
                <h4 className="text-white font-bold text-2xl">{actualCard.name}</h4>
                <p className="text-neutral-500 mt-2 font-medium text-lg uppercase tracking-wider">
                  {guessType}: {actualAttribute}
                </p>
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
      </div>
    </motion.div>
  );
};
