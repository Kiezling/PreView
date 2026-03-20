import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

admin.initializeApp();

const ZENER_CARDS = ['Circle', 'Cross', 'Waves', 'Square', 'Star'];
const COLORS = ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet'];
const SUITS = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
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

export const generateAndGradeTarget = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { testType, guess, targetId, telemetry, guessType, targetDate } = request.data;
  const uid = request.auth.uid;
  const db = admin.firestore();
  const timestamp = new Date().toISOString();

  let actualTarget: any;
  let isSuccess = false;
  let collectionName = '';
  let record: any = {
    userId: uid,
    targetId,
    timestamp,
    ...telemetry
  };

  const getRandomInt = (max: number) => crypto.randomInt(0, max);

  if (testType === 'Zener') {
    actualTarget = ZENER_CARDS[getRandomInt(ZENER_CARDS.length)];
    isSuccess = guess === actualTarget;
    collectionName = 'zenerAttempts';
    record.selectedCard = guess;
    record.actualCard = actualTarget;
    record.isSuccess = isSuccess;
  } else if (testType === 'Color') {
    actualTarget = COLORS[getRandomInt(COLORS.length)];
    isSuccess = guess === actualTarget;
    collectionName = 'colorAttempts';
    record.selectedColor = guess;
    record.actualColor = actualTarget;
    record.isSuccess = isSuccess;
  } else if (testType === 'StandardDeck') {
    const randomSuit = SUITS[getRandomInt(SUITS.length)];
    const randomValue = VALUES[getRandomInt(VALUES.length)];
    const randomColor = ['Hearts', 'Diamonds'].includes(randomSuit) ? 'Red' : 'Black';
    actualTarget = { suit: randomSuit, value: randomValue, color: randomColor };
    
    if (guessType === 'color') isSuccess = guess === randomColor;
    if (guessType === 'suit') isSuccess = guess === randomSuit;
    if (guessType === 'value') isSuccess = guess === randomValue;
    
    collectionName = 'standardDeckAttempts';
    record.guessType = guessType;
    record.selectedOption = guess;
    record.actualCard = actualTarget;
    record.isSuccess = isSuccess;
  } else if (testType === 'AstroTarot') {
    const generated: Record<string, string> = {};
    Object.entries(ATTRIBUTES).forEach(([key, values]) => {
      generated[key] = values[getRandomInt(values.length)];
    });
    const randomCard = TAROT_CARDS[getRandomInt(TAROT_CARDS.length)];
    actualTarget = { attributes: generated, card: randomCard };
    
    isSuccess = false;
    Object.entries(guess).forEach(([key, value]) => {
      if (value && generated[key] === value) {
        isSuccess = true;
      }
    });
    
    collectionName = 'astroTarotAttempts';
    record.selectedAttributes = guess;
    record.actualAttributes = generated;
    record.isSuccess = isSuccess;
  } else if (testType === 'Stock') {
    actualTarget = 'Pending';
    isSuccess = false;
    collectionName = 'stockAttempts';
    record.targetDate = targetDate;
    record.selectedDirection = guess;
    record.actualDirection = actualTarget;
    record.isSuccess = isSuccess;
  } else {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid test type');
  }

  await db.collection(collectionName).add(record);
  return { actualTarget, isSuccess };
});
