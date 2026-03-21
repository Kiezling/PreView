import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

admin.initializeApp();

const ZENER_CARDS = ['Circle', 'Cross', 'Waves', 'Square', 'Star'];
const COLORS = ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet'];
const SUITS = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const TAROT_CARDS = [
  { name: "The Fool", url: "https://upload.wikimedia.org/wikipedia/commons/9/90/RWS_Tarot_00_Fool.jpg", archetype: "Major", valence: "Positive", element: "Sharp" },
  { name: "The Magician", url: "https://upload.wikimedia.org/wikipedia/commons/d/de/RWS_Tarot_01_Magician.jpg", archetype: "Major", valence: "Positive", element: "Hot" },
  { name: "The High Priestess", url: "https://upload.wikimedia.org/wikipedia/commons/8/88/RWS_Tarot_02_High_Priestess.jpg", archetype: "Major", valence: "Positive", element: "Cold" },
  { name: "The Empress", url: "https://upload.wikimedia.org/wikipedia/commons/d/d2/RWS_Tarot_03_Empress.jpg", archetype: "Major", valence: "Positive", element: "Heavy" },
  { name: "The Emperor", url: "https://upload.wikimedia.org/wikipedia/commons/c/c3/RWS_Tarot_04_Emperor.jpg", archetype: "Major", valence: "Positive", element: "Hot" },
  { name: "The Hierophant", url: "https://upload.wikimedia.org/wikipedia/commons/8/8d/RWS_Tarot_05_Hierophant.jpg", archetype: "Major", valence: "Positive", element: "Heavy" },
  { name: "The Lovers", url: "https://upload.wikimedia.org/wikipedia/commons/3/3a/TheLovers.jpg", archetype: "Major", valence: "Positive", element: "Sharp" },
  { name: "The Chariot", url: "https://upload.wikimedia.org/wikipedia/commons/9/9b/RWS_Tarot_07_Chariot.jpg", archetype: "Major", valence: "Positive", element: "Cold" },
  { name: "Strength", url: "https://upload.wikimedia.org/wikipedia/commons/f/f5/RWS_Tarot_08_Strength.jpg", archetype: "Major", valence: "Positive", element: "Hot" },
  { name: "The Hermit", url: "https://upload.wikimedia.org/wikipedia/commons/4/4d/RWS_Tarot_09_Hermit.jpg", archetype: "Major", valence: "Negative", element: "Heavy" },
  { name: "Wheel of Fortune", url: "https://upload.wikimedia.org/wikipedia/commons/3/3c/RWS_Tarot_10_Wheel_of_Fortune.jpg", archetype: "Major", valence: "Positive", element: "Hot" },
  { name: "Justice", url: "https://upload.wikimedia.org/wikipedia/commons/e/e0/RWS_Tarot_11_Justice.jpg", archetype: "Major", valence: "Positive", element: "Sharp" },
  { name: "The Hanged Man", url: "https://upload.wikimedia.org/wikipedia/commons/2/2b/RWS_Tarot_12_Hanged_Man.jpg", archetype: "Major", valence: "Negative", element: "Cold" },
  { name: "Death", url: "https://upload.wikimedia.org/wikipedia/commons/d/d7/RWS_Tarot_13_Death.jpg", archetype: "Major", valence: "Negative", element: "Cold" },
  { name: "Temperance", url: "https://upload.wikimedia.org/wikipedia/commons/f/f8/RWS_Tarot_14_Temperance.jpg", archetype: "Major", valence: "Positive", element: "Hot" },
  { name: "The Devil", url: "https://upload.wikimedia.org/wikipedia/commons/5/55/RWS_Tarot_15_Devil.jpg", archetype: "Major", valence: "Negative", element: "Heavy" },
  { name: "The Tower", url: "https://upload.wikimedia.org/wikipedia/commons/5/53/RWS_Tarot_16_Tower.jpg", archetype: "Major", valence: "Negative", element: "Hot" },
  { name: "The Star", url: "https://upload.wikimedia.org/wikipedia/commons/c/cd/RWS_Tarot_17_Star.jpg", archetype: "Major", valence: "Positive", element: "Sharp" },
  { name: "The Moon", url: "https://upload.wikimedia.org/wikipedia/commons/7/7f/RWS_Tarot_18_Moon.jpg", archetype: "Major", valence: "Negative", element: "Cold" },
  { name: "The Sun", url: "https://upload.wikimedia.org/wikipedia/commons/1/17/RWS_Tarot_19_Sun.jpg", archetype: "Major", valence: "Positive", element: "Hot" },
  { name: "Judgement", url: "https://upload.wikimedia.org/wikipedia/commons/d/dd/RWS_Tarot_20_Judgment.jpg", archetype: "Major", valence: "Positive", element: "Hot" },
  { name: "The World", url: "https://upload.wikimedia.org/wikipedia/commons/f/ff/RWS_Tarot_21_World.jpg", archetype: "Major", valence: "Positive", element: "Heavy" },
  { name: "Ace of Wands", url: "https://upload.wikimedia.org/wikipedia/commons/1/11/Wands01.jpg", archetype: "Minor", valence: "Positive", element: "Hot" },
  { name: "Ace of Cups", url: "https://upload.wikimedia.org/wikipedia/commons/3/36/Cups01.jpg", archetype: "Minor", valence: "Positive", element: "Cold" },
  { name: "Ace of Swords", url: "https://upload.wikimedia.org/wikipedia/commons/1/1a/Swords01.jpg", archetype: "Minor", valence: "Negative", element: "Sharp" },
  { name: "Ace of Pentacles", url: "https://upload.wikimedia.org/wikipedia/commons/f/fd/Pents01.jpg", archetype: "Minor", valence: "Positive", element: "Heavy" }
];

export const getMarketData = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/^GSPC?range=5d&interval=1d';
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch from Yahoo Finance');
    }
    const data = await response.json();
    const meta = data.chart.result[0].meta;
    const priorClose = meta.chartPreviousClose || meta.previousClose;
    return { priorClose };
  } catch (error) {
    console.error("Error fetching market data:", error);
    throw new functions.https.HttpsError('internal', 'Failed to fetch market data');
  }
});

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
    timestamp,
    ...telemetry
  };
  if (targetId !== undefined) {
    record.targetId = targetId;
  }

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
    const randomCard = TAROT_CARDS[getRandomInt(TAROT_CARDS.length)];
    const actualAttributes = {
      valence: randomCard.valence,
      element: randomCard.element,
      archetype: randomCard.archetype
    };
    actualTarget = { attributes: actualAttributes, card: randomCard };
    
    const axisResults: Record<string, boolean> = {};
    Object.entries(guess).forEach(([key, value]) => {
      if (value) {
        axisResults[key] = actualAttributes[key as keyof typeof actualAttributes] === value;
      }
    });
    
    collectionName = 'astroTarotAttempts';
    record.selectedAttributes = guess;
    record.actualAttributes = actualAttributes;
    record.axisResults = axisResults;
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
  return { actualTarget, isSuccess, axisResults: record.axisResults };
});
