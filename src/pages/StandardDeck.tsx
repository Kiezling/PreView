import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Spade, RefreshCw, ArrowLeft } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { generateTargetId } from '../lib/utils';

const SUITS = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const COLORS = ['Red', 'Black'];

type GuessType = 'color' | 'suit' | 'value';

interface Card {
  suit: string;
  value: string;
  color: string;
}

export const StandardDeck: React.FC = () => {
  const { user } = useAuth();
  const [guessType, setGuessType] = useState<GuessType | null>(null);
  const [targetId, setTargetId] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [actualCard, setActualCard] = useState<Card | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStart = (type: GuessType) => {
    setGuessType(type);
    setTargetId(generateTargetId());
    setSelectedOption(null);
    setActualCard(null);
  };

  const handleSelect = async (option: string) => {
    if (selectedOption || isSubmitting || !user || !guessType) return;
    
    setIsSubmitting(true);
    setSelectedOption(option);
    
    // Generate random card
    const randomSuit = SUITS[Math.floor(Math.random() * SUITS.length)];
    const randomValue = VALUES[Math.floor(Math.random() * VALUES.length)];
    const randomColor = ['Hearts', 'Diamonds'].includes(randomSuit) ? 'Red' : 'Black';
    
    const generatedCard = { suit: randomSuit, value: randomValue, color: randomColor };
    setActualCard(generatedCard);
    
    let isSuccess = false;
    if (guessType === 'color') isSuccess = option === randomColor;
    if (guessType === 'suit') isSuccess = option === randomSuit;
    if (guessType === 'value') isSuccess = option === randomValue;

    try {
      await addDoc(collection(db, 'standardDeckAttempts'), {
        userId: user.uid,
        targetId,
        guessType,
        selectedOption: option,
        actualCard: generatedCard,
        isSuccess,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error saving attempt:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setTargetId(generateTargetId());
    setSelectedOption(null);
    setActualCard(null);
  };

  const changeMode = () => {
    setGuessType(null);
    setSelectedOption(null);
    setActualCard(null);
  };

  const getOptions = () => {
    if (guessType === 'color') return COLORS;
    if (guessType === 'suit') return SUITS;
    if (guessType === 'value') return VALUES;
    return [];
  };

  const getSuitSymbol = (suit: string) => {
    switch(suit) {
      case 'Hearts': return '♥';
      case 'Diamonds': return '♦';
      case 'Clubs': return '♣';
      case 'Spades': return '♠';
      default: return '';
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
          <Spade className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white mb-4">Standard Deck</h1>
        <p className="text-neutral-400 text-lg">
          Practice remote viewing with a standard 52-card deck.
        </p>
      </header>

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 md:p-12 relative overflow-hidden">
        {!guessType ? (
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-white mb-8">Select your category</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button
                onClick={() => handleStart('color')}
                className="p-8 rounded-2xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 transition-colors flex flex-col items-center gap-4"
              >
                <span className="text-2xl font-bold text-white">Color</span>
                <span className="text-neutral-400 text-sm">Red or Black</span>
              </button>
              <button
                onClick={() => handleStart('suit')}
                className="p-8 rounded-2xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 transition-colors flex flex-col items-center gap-4"
              >
                <span className="text-2xl font-bold text-white">Suit</span>
                <span className="text-neutral-400 text-sm">Hearts, Diamonds, Clubs, Spades</span>
              </button>
              <button
                onClick={() => handleStart('value')}
                className="p-8 rounded-2xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 transition-colors flex flex-col items-center gap-4"
              >
                <span className="text-2xl font-bold text-white">Value</span>
                <span className="text-neutral-400 text-sm">A, 2-10, J, Q, K</span>
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
                    <div className="w-48 h-72 bg-white rounded-2xl flex flex-col items-center justify-center border-4 border-neutral-200 shadow-2xl mb-8 relative">
                      <div className={`absolute top-4 left-4 text-2xl font-bold ${actualCard.color === 'Red' ? 'text-red-500' : 'text-neutral-800'}`}>
                        {actualCard.value}
                        <div className="text-xl">{getSuitSymbol(actualCard.suit)}</div>
                      </div>
                      <div className={`text-6xl ${actualCard.color === 'Red' ? 'text-red-500' : 'text-neutral-800'}`}>
                        {getSuitSymbol(actualCard.suit)}
                      </div>
                      <div className={`absolute bottom-4 right-4 text-2xl font-bold rotate-180 ${actualCard.color === 'Red' ? 'text-red-500' : 'text-neutral-800'}`}>
                        {actualCard.value}
                        <div className="text-xl">{getSuitSymbol(actualCard.suit)}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 mb-10 bg-neutral-900/80 px-8 py-5 rounded-2xl border border-neutral-800 shadow-inner">
                  {((guessType === 'color' && selectedOption === actualCard?.color) ||
                    (guessType === 'suit' && selectedOption === actualCard?.suit) ||
                    (guessType === 'value' && selectedOption === actualCard?.value)) ? (
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
