import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Palette, RefreshCw } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { generateTargetId, getDeviceType } from '../lib/utils';

const COLORS = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Violet', hex: '#8b5cf6' }
];

export const ColorTarget: React.FC = () => {
  const { user } = useAuth();
  const [targetId, setTargetId] = useState(() => generateTargetId());
  const [selectedColor, setSelectedColor] = useState<{name: string, hex: string} | null>(null);
  const [actualColor, setActualColor] = useState<{name: string, hex: string} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const sequenceIndexRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, [targetId]);

  const handleSelect = async (colorObj: {name: string, hex: string}) => {
    if (selectedColor || isSubmitting || !user) return;
    
    const timeToDecisionMs = Date.now() - startTimeRef.current;
    sequenceIndexRef.current += 1;

    setIsSubmitting(true);
    setSelectedColor(colorObj);
    
    try {
      const generateAndGrade = httpsCallable(functions, 'generateAndGradeTarget');
      const result = await generateAndGrade({
        testType: 'Color',
        guess: colorObj.name,
        targetId,
        telemetry: {
          timeToDecisionMs,
          sessionSequenceIndex: sequenceIndexRef.current,
          localTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          deviceType: getDeviceType()
        }
      });
      
      const { actualTarget } = result.data as any;
      const fullColorObj = COLORS.find(c => c.name === actualTarget) || { name: actualTarget, hex: '#000000' };
      setActualColor(fullColorObj);
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
    setSelectedColor(null);
    setActualColor(null);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <header className="mb-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-6">
          <Palette className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white mb-4">Color Target</h1>
        <p className="text-neutral-400 text-lg">
          Focus on the target identifier below. What color will it be?
        </p>
      </header>

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
        {/* Target ID Display */}
        <div className="mb-12">
          <p className="text-sm text-neutral-500 uppercase tracking-widest font-semibold mb-3">Target Identifier</p>
          <div className="inline-block bg-neutral-950 border border-neutral-800 rounded-xl px-8 py-4">
            <span className="text-3xl font-mono text-white tracking-[0.2em]">{targetId}</span>
          </div>
        </div>

        {/* Color Selection */}
        {!selectedColor ? (
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-widest text-center mb-6">Making a selection below will expend 1 Focus.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {COLORS.map((color) => (
                <motion.button
                  key={color.name}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelect(color)}
                  disabled={isSubmitting}
                  className="aspect-[3/4] rounded-xl border-2 border-neutral-700 bg-neutral-800 hover:border-white hover:bg-neutral-700 transition-colors flex items-center justify-center text-lg font-medium text-white shadow-lg"
                >
                  {color.name}
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
              <div 
                className="w-64 sm:w-80 aspect-[3/4] rounded-3xl border-4 flex flex-col items-center justify-center shadow-2xl border-neutral-600 shadow-neutral-900/50 transition-colors duration-1000"
                style={{ backgroundColor: actualColor?.hex }}
              >
                {/* Empty space filled with color */}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 mb-10 bg-neutral-900/80 px-8 py-5 rounded-2xl border border-neutral-800 shadow-inner">
              <div className="text-center">
                <p className="text-sm text-neutral-500 mb-2 uppercase tracking-wider font-semibold">You Selected</p>
                <p className="text-xl font-bold text-white flex items-center justify-center gap-2">
                  {selectedColor.name}
                </p>
              </div>
              
              <div className="hidden sm:block w-px h-16 bg-neutral-800 mx-2"></div>
              
              <div className="flex items-center gap-3">
                {selectedColor.name === actualColor?.name ? (
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
