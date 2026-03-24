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

export const preWarmPing = functions.https.onCall(async (data: any, context: any) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

export const getMarketData = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  if (data && data.ping) {
    return { status: 'pong', timestamp: new Date().toISOString() };
  }

  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/^GSPC?range=5d&interval=1d';
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch from Yahoo Finance');
    }
    const json = await response.json();
    const meta = json.chart.result[0].meta;
    const priorClose = meta.chartPreviousClose || meta.previousClose;
    return { priorClose };
  } catch (error) {
    console.error("Error fetching market data:", error);
    throw new functions.https.HttpsError('internal', 'Failed to fetch market data');
  }
});

export const generateAndGradeTarget = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  if (data && data.ping) {
    return { status: 'pong', timestamp: new Date().toISOString() };
  }

  const { testType, guess, targetId, telemetry, guessType, targetDate } = data;
  const uid = context.auth.uid;
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

  let axisResults: Record<string, boolean> | undefined;

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
    
    axisResults = {};
    Object.entries(guess).forEach(([key, value]) => {
      if (value) {
        axisResults![key] = actualAttributes[key as keyof typeof actualAttributes] === value;
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

  await db.runTransaction(async (transaction) => {
    const userStatsRef = db.collection('userStats').doc(uid);
    const userStatsDoc = await transaction.get(userStatsRef);
    
    let stats = userStatsDoc.data() as { focusStamina: number, nextRefill: number | null, isInfinite: boolean } | undefined;
    
    if (!stats) {
      stats = { focusStamina: 4, nextRefill: null, isInfinite: false };
    }

    const now = Date.now();

    if (!stats.isInfinite) {
      if (stats.focusStamina > 0) {
        if (stats.focusStamina === 4) {
          stats.nextRefill = now + 900000;
        }
        stats.focusStamina -= 1;
      } else if (stats.focusStamina === 0 && stats.nextRefill !== null && now >= stats.nextRefill) {
        stats.focusStamina = 3; // Reset to 4, then deduct 1
        stats.nextRefill = now + 900000;
      } else {
        throw new functions.https.HttpsError('out-of-range', 'Not enough stamina');
      }
    }

    transaction.set(userStatsRef, stats, { merge: true });
    
    const attemptRef = db.collection(collectionName).doc();
    transaction.set(attemptRef, record);
  });

  return { actualTarget, isSuccess, axisResults };
});

export const getGlobalStats = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  if (data && data.ping) {
    return { status: 'pong', timestamp: new Date().toISOString() };
  }

  const db = admin.firestore();
  
  const getStats = async (collectionName: string) => {
    const snapshot = await db.collection(collectionName).get();
    let hits = 0;
    snapshot.forEach(doc => {
      if (doc.data().isSuccess) hits++;
    });
    return { total: snapshot.size, hits };
  };

  const [zenerAttempts, colorAttempts, stockAttempts, astroTarotAttempts] = await Promise.all([
    getStats('zenerAttempts'),
    getStats('colorAttempts'),
    getStats('stockAttempts'),
    getStats('astroTarotAttempts')
  ]);

  const standardDeckSnapshot = await db.collection('standardDeckAttempts').get();
  let standardDeckHits = 0;
  const subStats = {
    color: { total: 0, hits: 0 },
    suit: { total: 0, hits: 0 },
    value: { total: 0, hits: 0 }
  };
  standardDeckSnapshot.forEach(doc => {
    const docData = doc.data();
    if (docData.isSuccess) standardDeckHits++;
    if (docData.guessType && subStats[docData.guessType as keyof typeof subStats]) {
      subStats[docData.guessType as keyof typeof subStats].total++;
      if (docData.isSuccess) subStats[docData.guessType as keyof typeof subStats].hits++;
    }
  });
  const standardDeckAttempts = { total: standardDeckSnapshot.size, hits: standardDeckHits, subStats };

  return {
    zenerAttempts,
    colorAttempts,
    stockAttempts,
    astroTarotAttempts,
    standardDeckAttempts
  };
});

export const purgeUserRecords = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const db = admin.firestore();
  const callerDoc = await db.collection('users').doc(context.auth.uid).get();
  if (callerDoc.data()?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Must be admin');
  }

  const { targetUserId } = data;
  if (!targetUserId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing parameters');
  }

  const collectionsToPurge = ['stockAttempts'];
  let deletedCount = 0;

  for (const collectionName of collectionsToPurge) {
    let hasMore = true;
    while (hasMore) {
      const snapshot = await db.collection(collectionName)
        .where('userId', '==', targetUserId)
        .limit(500)
        .get();

      if (snapshot.empty) {
        hasMore = false;
        break;
      }

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        deletedCount++;
      });
      await batch.commit();
    }
  }
  
  return { success: true, deletedCount };
});

export const adminManageStamina = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const db = admin.firestore();
  const callerDoc = await db.collection('users').doc(context.auth.uid).get();
  if (callerDoc.data()?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Must be admin');
  }

  const { targetUserId, action } = data;
  if (!targetUserId || !action) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing parameters');
  }

  const userStatsRef = db.collection('userStats').doc(targetUserId);
  
  if (action === 'refill') {
    await userStatsRef.set({ focusStamina: 4, nextRefill: null }, { merge: true });
  } else if (action === 'deplete') {
    await userStatsRef.set({ focusStamina: 0, nextRefill: Date.now() + 900000 }, { merge: true });
  } else {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid action');
  }

  return { success: true };
});

export const getStaminaStatus = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  if (data && data.ping) {
    return { status: 'pong', timestamp: new Date().toISOString() };
  }

  const db = admin.firestore();
  const userStatsDoc = await db.collection('userStats').doc(context.auth.uid).get();
  
  if (!userStatsDoc.exists) {
    return { currentStamina: 4, nextRegenInMs: 0, isInfinite: false };
  }

  const stats = userStatsDoc.data();
  const now = Date.now();
  let currentStamina = stats?.focusStamina ?? 4;
  let nextRefill = stats?.nextRefill ?? null;
  const isInfinite = stats?.isInfinite ?? false;

  if (!isInfinite && currentStamina === 0 && nextRefill !== null && now >= nextRefill) {
    currentStamina = 4;
    nextRefill = null;
    // We could update the DB here, but it's not strictly necessary for a read.
    // The transaction in generateAndGradeTarget handles the actual reset.
  }

  let nextRegenInMs = 0;
  if (nextRefill !== null && currentStamina < 4) {
    nextRegenInMs = Math.max(0, nextRefill - now);
  }

  return {
    currentStamina,
    nextRegenInMs,
    isInfinite
  };
});
