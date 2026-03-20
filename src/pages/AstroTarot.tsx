import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Layers, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { generateTargetId, cryptoRandom, getDeviceType } from '../lib/utils';

const ATTRIBUTES = {
  modality: ['Cardinal', 'Fixed', 'Mutable'],
  element: ['Fire', 'Earth', 'Air', 'Water'],
  zodiacSign: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'],
  arcana: ['Major', 'Minor'],
};

const TAROT_CARDS = [
  { name: "The Fool", url: "https://upload.wikimedia.org/wikipedia/commons/9/90/RWS_Tarot_00_Fool.jpg" },
  { name: "The Magician", url: "https://upload.wikimedia.org/wikipedia/commons/d/de/RWS_Tarot_01_Magician.jpg" },
  { name: "The High Priestess", url: "https://upload.wikimedia.org/wikipedia/commons/8/88/RWS_Tarot_02_High_Priestess.jpg" },
  { name: "The Empress", url: "https://upload.wikimedia.org/wikipedia/commons/d/d2/RWS_Tarot_03_Empress.jpg" },
  { name: "The Emperor", url: "https://upload.wikimedia.org/wikipedia/commons/c/c3/RWS_Tarot_04_Emperor.jpg" },
  { name: "The Hierophant", url: "https://upload.wikimedia.org/wikipedia/commons/8/8d/RWS_Tarot_05_Hierophant.jpg" },
  { name: "The Lovers", url: "https://upload.wikimedia.org/wikipedia/commons/3/3a/TheLovers.jpg" },
  { name: "The Chariot", url: "https://upload.wikimedia.org/wikipedia/commons/9/9b/RWS_Tarot_07_Chariot.jpg" },
  { name: "Strength", url: "https://upload.wikimedia.org/wikipedia/commons/f/f5/RWS_Tarot_08_Strength.jpg" },
  { name: "The Hermit", url: "https://upload.wikimedia.org/wikipedia/commons/4/4d/RWS_Tarot_09_Hermit.jpg" },
  { name: "Wheel of Fortune", url: "https://upload.wikimedia.org/wikipedia/commons/3/3c/RWS_Tarot_10_Wheel_of_Fortune.jpg" },
  { name: "Justice", url: "https://upload.wikimedia.org/wikipedia/commons/e/e0/RWS_Tarot_11_Justice.jpg" },
  { name: "The Hanged Man", url: "https://upload.wikimedia.org/wikipedia/commons/2/2b/RWS_Tarot_12_Hanged_Man.jpg" },
  { name: "Death", url: "https://upload.wikimedia.org/wikipedia/commons/d/d7/RWS_Tarot_13_Death.jpg" },
  { name: "Temperance", url: "https://upload.wikimedia.org/wikipedia/commons/f/f8/RWS_Tarot_14_Temperance.jpg" },
  { name: "The Devil", url: "https://upload.wikimedia.org/wikipedia/commons/5/55/RWS_Tarot_15_Devil.jpg" },
  { name: "The Tower", url: "https://upload.wikimedia.org/wikipedia/commons/5/53/RWS_Tarot_16_Tower.jpg" },
  { name: "The Star", url: "https://upload.wikimedia.org/wikipedia/commons/c/cd/RWS_Tarot_17_Star.jpg" },
  { name: "The Moon", url: "https://upload.wikimedia.org/wikipedia/commons/7/7f/RWS_Tarot_18_Moon.jpg" },
  { name: "The Sun", url: "https://upload.wikimedia.org/wikipedia/commons/1/17/RWS_Tarot_19_Sun.jpg" },
  { name: "Judgement", url: "https://upload.wikimedia.org/wikipedia/commons/d/dd/RWS_Tarot_20_Judgment.jpg" },
  { name: "The World", url: "https://upload.wikimedia.org/wikipedia/commons/f/ff/RWS_Tarot_21_World.jpg" }
];

export const AstroTarot: React.FC = () => {
  const { user } = useAuth();
  const [targetId, setTargetId] = useState(() => generateTargetId());
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [actualAttributes, setActualAttributes] = useState<Record<string, string> | null>(null);
  const [actualCard, setActualCard] = useState<{name: string, url: string} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const sequenceIndexRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, [targetId]);

  const handleSelect = (category: string, value: string) => {
    if (actualAttributes || isSubmitting) return;
    setSelectedAttributes(prev => ({
      ...prev,
      [category]: value === prev[category] ? '' : value // Toggle off if clicked again
    }));
  };

  const handleSubmit = async () => {
    if (Object.keys(selectedAttributes).length === 0 || isSubmitting || !user) return;
    
    const timeToDecisionMs = Date.now() - startTimeRef.current;
    sequenceIndexRef.current += 1;

    setIsSubmitting(true);
    
    try {
      const generateAndGrade = httpsCallable(functions, 'generateAndGradeTarget');
      const result = await generateAndGrade({
        testType: 'AstroTarot',
        guess: selectedAttributes,
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
    setSelectedAttributes({});
    setActualAttributes(null);
    setActualCard(null);
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
          Focus on the target identifier. Select any attributes you feel drawn to. You don't have to guess all of them.
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

        {/* Attribute Selection */}
        <div className="space-y-8 mb-12">
          {Object.entries(ATTRIBUTES).map(([category, options]) => (
            <div key={category} className="border-b border-neutral-800 pb-8 last:border-0">
              <h3 className="text-lg font-medium text-white mb-4 capitalize">{category.replace(/([A-Z])/g, ' $1').trim()}</h3>
              <div className="flex flex-wrap gap-3">
                {options.map((option) => {
                  const isSelected = selectedAttributes[category] === option;
                  const isActual = actualAttributes?.[category] === option;
                  const showResult = actualAttributes !== null;
                  
                  let btnClass = "px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors";
                  
                  if (showResult) {
                    if (isSelected && isActual) {
                      btnClass = "px-4 py-2 rounded-lg border border-white bg-white/20 text-white font-bold";
                    } else if (isSelected && !isActual) {
                      btnClass = "px-4 py-2 rounded-lg border border-neutral-500 bg-neutral-500/20 text-white";
                    } else if (!isSelected && isActual) {
                      btnClass = "px-4 py-2 rounded-lg border border-white/50 bg-white/10 text-white/70";
                    } else {
                      btnClass = "px-4 py-2 rounded-lg border border-neutral-800 bg-neutral-900/50 text-neutral-600 opacity-50";
                    }
                  } else if (isSelected) {
                    btnClass = "px-4 py-2 rounded-lg border border-white bg-white/20 text-white font-bold";
                  }

                  return (
                    <button
                      key={option}
                      onClick={() => handleSelect(category, option)}
                      disabled={showResult || isSubmitting}
                      className={btnClass}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          {!actualAttributes ? (
            <button
              onClick={handleSubmit}
              disabled={Object.keys(selectedAttributes).length === 0 || isSubmitting}
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
                <div className="w-full max-w-md aspect-[3/4] rounded-3xl overflow-hidden relative mb-6 bg-black">
                  {actualCard && <img src={actualCard.url} alt={actualCard.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />}
                </div>
                
                <div className="w-full max-w-md text-center">
                  <h4 className="text-white font-bold text-xl mb-4 border-b border-neutral-800 pb-3">{actualCard?.name}</h4>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-left">
                    {Object.entries(actualAttributes).map(([key, val]) => (
                      <div key={key} className="bg-neutral-900/50 p-3 rounded-lg border border-neutral-800">
                        <span className="text-neutral-500 text-xs uppercase tracking-widest font-semibold block mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="text-white font-medium text-sm">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-10 bg-neutral-900/80 px-8 py-5 rounded-2xl border border-neutral-800 shadow-inner">
                {Object.entries(selectedAttributes).some(([k, v]) => v && actualAttributes[k] === v) ? (
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
