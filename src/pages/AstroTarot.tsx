import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Layers, RefreshCw, ArrowLeft } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { generateTargetId, getDeviceType } from '../lib/utils';

const CATEGORIES = {
  energy: ['Positive', 'Negative'],
  element: ['Hot', 'Cold', 'Heavy', 'Sharp'],
  archetype: ['Major', 'Minor'],
};

type GuessType = 'energy' | 'element' | 'archetype';

export const AstroTarot: React.FC = () => {
  const { user } = useAuth();
  const [guessType, setGuessType] = useState<GuessType | null>(null);
  const [targetId, setTargetId] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [actualAttributes, setActualAttributes] = useState<Record<string, string> | null>(null);
  const [actualCard, setActualCard] = useState<{name: string, url: string} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const sequenceIndexRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, [targetId]);

  const handleStart = (type: GuessType) => {
    setGuessType(type);
    setTargetId(generateTargetId());
    setSelectedOption(null);
    setActualAttributes(null);
    setActualCard(null);
  };

  const handleSelect = async (option: string) => {
    if (selectedOption || isSubmitting || !user || !guessType) return;
    
    const timeToDecisionMs = Date.now() - startTimeRef.current;
    sequenceIndexRef.current += 1;

    setIsSubmitting(true);
    setSelectedOption(option);
    
    try {
      const generateAndGrade = httpsCallable(functions, 'generateAndGradeTarget');
      const result = await generateAndGrade({
        testType: 'AstroTarot',
        guessType,
        guess: option,
        targetId,
        telemetry: {
          timeToDecisionMs,
          sessionSequenceIndex: sequenceIndexRef.current,
          localTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          deviceType: getDeviceType()
        }
      });
      
      const { actualTarget } = result.data as any;
      setActualAttributes(actualTarget.attributes);
      setActualCard(actualTarget.card);
    } catch (error) {
      console.error("Error saving attempt:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setTargetId(generateTargetId());
    setSelectedOption(null);
    setActualAttributes(null);
    setActualCard(null);
  };

  const changeMode = () => {
    setGuessType(null);
    setSelectedOption(null);
    setActualAttributes(null);
    setActualCard(null);
  };

  const getOptions = () => {
    if (guessType) return CATEGORIES[guessType];
    return [];
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
          Practice remote viewing with Astro-Tarot cards.
        </p>
      </header>

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 md:p-12 relative overflow-hidden">
        {!guessType ? (
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-white mb-8">Select your category</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button
                onClick={() => handleStart('energy')}
                className="p-8 rounded-2xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 transition-colors flex flex-col items-center gap-4"
              >
                <span className="text-2xl font-bold text-white">Energy</span>
                <span className="text-neutral-400 text-sm">Positive or Negative</span>
              </button>
              <button
                onClick={() => handleStart('element')}
                className="p-8 rounded-2xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 transition-colors flex flex-col items-center gap-4"
              >
                <span className="text-2xl font-bold text-white">Element</span>
                <span className="text-neutral-400 text-sm">Hot, Cold, Heavy, Sharp</span>
              </button>
              <button
                onClick={() => handleStart('archetype')}
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
              onClick={changeMode}
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

            {!selectedOption ? (
              <div className="flex flex-wrap justify-center gap-4">
                {getOptions().map((option) => (
                  <button
                    key={option}
                    onClick={() => handleSelect(option)}
                    disabled={isSubmitting}
                    className="px-8 py-4 rounded-xl border border-neutral-700 bg-neutral-800 text-white font-semibold hover:bg-neutral-700 transition-colors text-lg min-w-[120px]"
                  >
                    {option}
                  </button>
                ))}
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
                    <div className="w-full max-w-md aspect-[3/4] rounded-3xl overflow-hidden relative mb-6 bg-black">
                      <img src={actualCard.url} alt={actualCard.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  {actualCard && (
                    <h4 className="text-white font-bold text-xl mb-4">{actualCard.name}</h4>
                  )}
                </div>

                <div className="flex items-center gap-4 mb-10 bg-neutral-900/80 px-8 py-5 rounded-2xl border border-neutral-800 shadow-inner">
                  {actualAttributes && selectedOption === actualAttributes[guessType === 'energy' ? 'valence' : guessType] ? (
                    <span className="text-3xl font-bold text-white tracking-widest uppercase">Hit</span>
                  ) : (
                    <span className="text-3xl font-bold text-white tracking-widest uppercase">Miss</span>
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
