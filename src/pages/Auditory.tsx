import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Headphones, RefreshCw, Play } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { generateTargetId, getDeviceType, playAuditoryTarget } from '../lib/utils';

const CATEGORIES = {
  Frequency: ['High Pitch', 'Low Pitch'],
  Environment: ['White Noise', 'Brown Noise'],
  Rhythm: ['Fast/Erratic', 'Slow/Pulsing']
};

export const Auditory: React.FC = () => {
  const { user } = useAuth();
  const [targetId, setTargetId] = useState(() => generateTargetId());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPolarity, setSelectedPolarity] = useState<string | null>(null);
  const [actualTarget, setActualTarget] = useState<{ category: string, polarity: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const sequenceIndexRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, [targetId]);

  const handleCategorySelect = (category: string) => {
    if (actualTarget || isSubmitting) return;
    setSelectedCategory(category);
    setSelectedPolarity(null);
  };

  const handlePolaritySelect = (polarity: string) => {
    if (actualTarget || isSubmitting) return;
    setSelectedPolarity(polarity);
  };

  const handleSubmit = async () => {
    if (!selectedCategory || !selectedPolarity || isSubmitting || !user) return;
    
    const timeToDecisionMs = Date.now() - startTimeRef.current;
    sequenceIndexRef.current += 1;

    setIsSubmitting(true);
    
    try {
      const generateAndGrade = httpsCallable(functions, 'generateAndGradeTarget');
      const result = await generateAndGrade({
        testType: 'Auditory',
        guess: {
          category: selectedCategory,
          polarity: selectedPolarity
        },
        targetId,
        telemetry: {
          timeToDecisionMs,
          sessionSequenceIndex: sequenceIndexRef.current,
          localTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          deviceType: getDeviceType()
        }
      });
      
      const { actualTarget } = result.data as any;
      setActualTarget(actualTarget);
    } catch (error) {
      console.error("Error saving attempt:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setTargetId(generateTargetId());
    setSelectedCategory(null);
    setSelectedPolarity(null);
    setActualTarget(null);
  };

  const handlePlayTarget = () => {
    if (actualTarget) {
      playAuditoryTarget(actualTarget.category, actualTarget.polarity);
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
          <Headphones className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white mb-4">Auditory Target</h1>
        <p className="text-neutral-400 text-lg">
          Focus on the target identifier. Select a category and guess the specific polarity of the sound.
        </p>
      </header>

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 md:p-12 relative overflow-hidden">
        {/* Target ID Display */}
        <div className="mb-12 text-center">
          <p className="text-sm text-neutral-500 uppercase tracking-widest font-semibold mb-3">Target Identifier</p>
          <div className="inline-block bg-neutral-950 border border-neutral-800 rounded-xl px-8 py-4">
            <span className="text-3xl font-mono text-white tracking-[0.2em]">{targetId}</span>
          </div>
        </div>

        {/* Category Selection */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-white mb-4 text-center">1. Select Category</h3>
          <div className="flex flex-wrap justify-center gap-4">
            {Object.keys(CATEGORIES).map((category) => {
              const isSelected = selectedCategory === category;
              const isActual = actualTarget?.category === category;
              const showResult = actualTarget !== null;
              
              let btnClass = "px-6 py-3 rounded-xl border transition-colors text-lg font-medium ";
              
              if (showResult) {
                if (isSelected && isActual) {
                  btnClass += "border-white bg-white/20 text-white";
                } else if (isSelected && !isActual) {
                  btnClass += "border-neutral-500 bg-neutral-500/20 text-white";
                } else if (!isSelected && isActual) {
                  btnClass += "border-white/50 bg-white/10 text-white/70";
                } else {
                  btnClass += "border-neutral-800 bg-neutral-900/50 text-neutral-600 opacity-50";
                }
              } else if (isSelected) {
                btnClass += "border-white bg-white/20 text-white";
              } else {
                btnClass += "border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700";
              }

              return (
                <button
                  key={category}
                  onClick={() => handleCategorySelect(category)}
                  disabled={showResult || isSubmitting}
                  className={btnClass}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        {/* Polarity Selection */}
        {selectedCategory && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-12"
          >
            <h3 className="text-lg font-medium text-white mb-4 text-center">2. Select Polarity</h3>
            <div className="flex flex-wrap justify-center gap-4">
              {CATEGORIES[selectedCategory as keyof typeof CATEGORIES].map((polarity) => {
                const isSelected = selectedPolarity === polarity;
                const isActual = actualTarget?.polarity === polarity;
                const showResult = actualTarget !== null;
                
                let btnClass = "px-6 py-3 rounded-xl border transition-colors text-lg font-medium ";
                
                if (showResult) {
                  if (isSelected && isActual) {
                    btnClass += "border-white bg-white/20 text-white";
                  } else if (isSelected && !isActual) {
                    btnClass += "border-neutral-500 bg-neutral-500/20 text-white";
                  } else if (!isSelected && isActual) {
                    btnClass += "border-white/50 bg-white/10 text-white/70";
                  } else {
                    btnClass += "border-neutral-800 bg-neutral-900/50 text-neutral-600 opacity-50";
                  }
                } else if (isSelected) {
                  btnClass += "border-white bg-white/20 text-white";
                } else {
                  btnClass += "border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700";
                }

                return (
                  <button
                    key={polarity}
                    onClick={() => handlePolaritySelect(polarity)}
                    disabled={showResult || isSubmitting}
                    className={btnClass}
                  >
                    {polarity}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        <div className="flex justify-center">
          {!actualTarget ? (
            <button
              onClick={handleSubmit}
              disabled={!selectedCategory || !selectedPolarity || isSubmitting}
              className="px-8 py-4 rounded-xl bg-white text-black font-semibold hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Prediction
            </button>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center w-full"
            >
              <div className="flex flex-col items-center justify-center mb-10 w-full">
                <p className="text-xl text-neutral-400 mb-6 font-medium">The Actual Target</p>
                
                <div className="w-full max-w-md text-center mb-8">
                  <div className="bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
                    <span className="text-neutral-500 text-sm uppercase tracking-widest font-semibold block mb-2">{actualTarget.category}</span>
                    <span className="text-white font-bold text-2xl">{actualTarget.polarity}</span>
                  </div>
                </div>

                <button
                  onClick={handlePlayTarget}
                  className="flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-colors w-full max-w-md mb-8"
                >
                  <Play className="w-6 h-6 fill-current" />
                  Play Actual Target
                </button>
              </div>

              <div className="flex items-center gap-4 mb-10 bg-neutral-900/80 px-8 py-5 rounded-2xl border border-neutral-800 shadow-inner">
                {selectedCategory === actualTarget.category && selectedPolarity === actualTarget.polarity ? (
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
                Next Target
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
