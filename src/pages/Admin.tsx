import * as functions from 'firebase-functions/v1';
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

export const preWarmPing = functions.https.onCall(async (data: any, context: any) => { return { status: 'ok' }; });

export const getMarketData = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  if (data && data.ping) return { status: 'pong' };
  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/^GSPC?range=5d&interval=1d';
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch from Yahoo Finance');
    const json = await response.json();
    const meta = json.chart.result[0].meta;
    const priorClose = meta.chartPreviousClose || meta.previousClose;
    return { priorClose };
  } catch (error) { throw new functions.https.HttpsError('internal', 'Failed to fetch market data'); }
});

export const generateAndGradeTarget = functions.runWith({ minInstances: 1 }).https.onCall(async (data: any, context: any) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  if (data && data.ping) return { status: 'pong' };

  const { testType, guess, targetId, telemetry, guessType, targetDate } = data;
  const uid = context.auth.uid;
  const db = admin.firestore();
  const timestamp = new Date().toISOString();

  let actualTarget: any; let isSuccess = false; let collectionName = ''; let record: any = { userId: uid, timestamp, ...telemetry };
  if (targetId !== undefined) record.targetId = targetId;
  const getRandomInt = (max: number) => crypto.randomInt(0, max);
  let axisResults: Record<string, boolean> | undefined;

  if (testType === 'Zener') { actualTarget = ZENER_CARDS[getRandomInt(ZENER_CARDS.length)]; isSuccess = guess === actualTarget; collectionName = 'zenerAttempts'; record.selectedCard = guess; record.actualCard = actualTarget; record.isSuccess = isSuccess; } 
  else if (testType === 'Color') { actualTarget = COLORS[getRandomInt(COLORS.length)]; isSuccess = guess === actualTarget; collectionName = 'colorAttempts'; record.selectedColor = guess; record.actualColor = actualTarget; record.isSuccess = isSuccess; } 
  else if (testType === 'StandardDeck') { const randomSuit = SUITS[getRandomInt(SUITS.length)]; const randomValue = VALUES[getRandomInt(VALUES.length)]; const randomColor = ['Hearts', 'Diamonds'].includes(randomSuit) ? 'Red' : 'Black'; actualTarget = { suit: randomSuit, value: randomValue, color: randomColor }; if (guessType === 'color') isSuccess = guess === randomColor; if (guessType === 'suit') isSuccess = guess === randomSuit; if (guessType === 'value') isSuccess = guess === randomValue; collectionName = 'standardDeckAttempts'; record.guessType = guessType; record.selectedOption = guess; record.actualCard = actualTarget; record.isSuccess = isSuccess; } 
  else if (testType === 'AstroTarot') { const randomCard = TAROT_CARDS[getRandomInt(TAROT_CARDS.length)]; const actualAttributes = { valence: randomCard.valence, element: randomCard.element, archetype: randomCard.archetype }; actualTarget = { attributes: actualAttributes, card: randomCard }; axisResults = {}; let hitCount = 0; Object.entries(guess).forEach(([key, value]) => { if (value) { const hit = actualAttributes[key as keyof typeof actualAttributes] === value; axisResults![key] = hit; if (hit) hitCount++; } }); isSuccess = hitCount > 0; collectionName = 'astroTarotAttempts'; record.selectedAttributes = guess; record.actualAttributes = actualAttributes; record.axisResults = axisResults; record.isSuccess = isSuccess; } 
  else if (testType === 'Stock') { actualTarget = 'Pending'; isSuccess = false; collectionName = 'stockAttempts'; record.targetDate = targetDate; record.selectedDirection = guess; record.actualDirection = actualTarget; record.isSuccess = isSuccess; } 
  else { throw new functions.https.HttpsError('invalid-argument', 'Invalid test type'); }

  await db.runTransaction(async (transaction) => {
    const userStatsRef = db.collection('userStats').doc(uid);
    const userStatsDoc = await transaction.get(userStatsRef);
    let stats = userStatsDoc.data();
    
    let currentStamina = (stats && typeof stats.focusStamina === 'number' && !isNaN(stats.focusStamina)) ? stats.focusStamina : 3;
    let nextRefill = (stats && stats.nextRefill) ? stats.nextRefill : null;
    let isInfinite = (stats && stats.isInfinite) ? stats.isInfinite : false;
    const now = Date.now();

    if (!isInfinite) {
      if (currentStamina > 0) {
        if (currentStamina === 3) nextRefill = now + 3600000;
        currentStamina -= 1;
      } else if (currentStamina <= 0 && nextRefill !== null && now >= nextRefill) {
        currentStamina = 2; nextRefill = now + 3600000;
      } else { throw new functions.https.HttpsError('out-of-range', 'Focus Stamina depleted'); }
    }
    transaction.set(userStatsRef, { focusStamina: currentStamina, nextRefill, isInfinite }, { merge: true });
    transaction.set(db.collection(collectionName).doc(), record);
  });
  return { actualTarget, isSuccess, axisResults };
});

export const getGlobalStats = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  if (data && data.ping) return { status: 'pong' };
  const db = admin.firestore();
  const aggregateDoc = await db.collection('globalStats').doc('aggregate').get();
  if (!aggregateDoc.exists) { return { zenerAttempts: { total: 0, hits: 0 }, colorAttempts: { total: 0, hits: 0 }, stockAttempts: { total: 0, hits: 0 }, astroTarotAttempts: { total: 0, hits: 0 }, standardDeckAttempts: { total: 0, hits: 0, subStats: { color: { total: 0, hits: 0 }, suit: { total: 0, hits: 0 }, value: { total: 0, hits: 0 } } } }; }
  return aggregateDoc.data();
});

export const onAttemptCreated = functions.firestore.document('{collectionId}/{attemptId}').onCreate(async (snap, context) => {
  const collectionId = context.params.collectionId;
  const allowedCollections = ['zenerAttempts', 'colorAttempts', 'standardDeckAttempts', 'astroTarotAttempts', 'stockAttempts'];
  if (!allowedCollections.includes(collectionId)) return null;

  const data = snap.data();
  if (collectionId === 'stockAttempts' && data.actualDirection === 'Pending') return null;

  const userId = data.userId; const isSuccess = data.isSuccess;
  const db = admin.firestore(); const batch = db.batch();

  const globalStatsRef = db.collection('globalStats').doc('aggregate');
  const userStatsRef = db.collection('userStats').doc(userId);

  const incrementTotal = admin.firestore.FieldValue.increment(1);
  const incrementHits = isSuccess ? admin.firestore.FieldValue.increment(1) : admin.firestore.FieldValue.increment(0);

  const globalUpdate: any = { [collectionId]: { total: incrementTotal, hits: incrementHits } };
  const userUpdate: any = { [collectionId]: { total: incrementTotal, hits: incrementHits } };

  if (collectionId === 'standardDeckAttempts' && data.guessType) {
    const guessType = data.guessType;
    globalUpdate[collectionId].subStats = { [guessType]: { total: incrementTotal, hits: incrementHits } };
    userUpdate[collectionId].subStats = { [guessType]: { total: incrementTotal, hits: incrementHits } };
  }
  batch.set(globalStatsRef, globalUpdate, { merge: true });
  batch.set(userStatsRef, userUpdate, { merge: true });
  await batch.commit(); return null;
});

export const purgeUserRecords = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  const db = admin.firestore();
  const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
  if (!adminDoc.exists) throw new functions.https.HttpsError('permission-denied', 'Must be admin');

  const { targetUserId, moduleName } = data;
  if (!targetUserId || !moduleName) throw new functions.https.HttpsError('invalid-argument', 'Missing parameters');
  
  let collectionsToPurge: string[] = [];
  if (moduleName === 'All') {
    collectionsToPurge = ['zenerAttempts', 'colorAttempts', 'astroTarotAttempts', 'standardDeckAttempts', 'stockAttempts'];
  } else {
    collectionsToPurge = [moduleName];
  }
  
  let deletedCount = 0;
  const userUpdate: any = {};
  const globalUpdate: any = {};

  for (const collectionName of collectionsToPurge) {
    let colTotal = 0; let colHits = 0; let colSubStats: any = {};
    
    let hasMore = true;
    while (hasMore) {
      const snapshot = await db.collection(collectionName).where('userId', '==', targetUserId).limit(500).get();
      if (snapshot.empty) { hasMore = false; break; }
      const batch = db.batch(); 
      snapshot.docs.forEach(doc => { 
        const d = doc.data();
        colTotal++;
        if (d.isSuccess) colHits++;
        if (collectionName === 'standardDeckAttempts' && d.guessType) {
          if (!colSubStats[d.guessType]) colSubStats[d.guessType] = { total: 0, hits: 0 };
          colSubStats[d.guessType].total++;
          if (d.isSuccess) colSubStats[d.guessType].hits++;
        }
        batch.delete(doc.ref); 
        deletedCount++; 
      }); 
      await batch.commit();
    }

    // Force a zero-out in the User's Personal Stats
    userUpdate[collectionName] = { total: 0, hits: 0 };
    if (collectionName === 'standardDeckAttempts') userUpdate[collectionName].subStats = {};

    // Accurately decrement the Global Aggregation
    if (colTotal > 0) {
      globalUpdate[`${collectionName}.total`] = admin.firestore.FieldValue.increment(-colTotal);
      globalUpdate[`${collectionName}.hits`] = admin.firestore.FieldValue.increment(-colHits);
      
      if (collectionName === 'standardDeckAttempts') {
        for (const guessType of Object.keys(colSubStats)) {
           globalUpdate[`${collectionName}.subStats.${guessType}.total`] = admin.firestore.FieldValue.increment(-colSubStats[guessType].total);
           globalUpdate[`${collectionName}.subStats.${guessType}.hits`] = admin.firestore.FieldValue.increment(-colSubStats[guessType].hits);
        }
      }
    }
  }

  if (Object.keys(userUpdate).length > 0) {
    await db.collection('userStats').doc(targetUserId).set(userUpdate, { merge: true });
  }
  if (Object.keys(globalUpdate).length > 0) {
    await db.collection('globalStats').doc('aggregate').update(globalUpdate).catch(() => {});
  }

  return { success: true, deletedCount };
});

export const adminManageStamina = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  const db = admin.firestore();
  const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
  if (!adminDoc.exists) throw new functions.https.HttpsError('permission-denied', 'Must be admin');

  const { targetUserId, action } = data;
  if (!targetUserId || !action) throw new functions.https.HttpsError('invalid-argument', 'Missing parameters');
  const userStatsRef = db.collection('userStats').doc(targetUserId);
  
  if (action === 'refill') {
    await userStatsRef.set({ focusStamina: 3, nextRefill: null }, { merge: true });
  } else if (action === 'deplete') {
    await userStatsRef.set({ focusStamina: 0, nextRefill: Date.now() + 3600000 }, { merge: true });
  } else if (action === 'toggleInfinite') {
    const docSnap = await userStatsRef.get();
    const isInfinite = docSnap.data()?.isInfinite || false;
    await userStatsRef.set({ isInfinite: !isInfinite }, { merge: true });
  } else { throw new functions.https.HttpsError('invalid-argument', 'Invalid action'); }
  return { success: true };
});

export const getStaminaStatus = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  if (data && data.ping) return { status: 'pong' };
  const db = admin.firestore();
  const userStatsDoc = await db.collection('userStats').doc(context.auth.uid).get();
  if (!userStatsDoc.exists) return { currentStamina: 3, remainingMs: 0, isInfinite: false };

  const stats = userStatsDoc.data();
  const now = Date.now();
  let currentStamina = stats?.focusStamina ?? 3;
  let nextRefill = stats?.nextRefill ?? null;
  const isInfinite = stats?.isInfinite ?? false;

  if (!isInfinite && currentStamina === 0 && nextRefill !== null && now >= nextRefill) {
    currentStamina = 3; nextRefill = null;
  }
  const remainingMs = nextRefill ? Math.max(0, nextRefill - now) : 0;
  return { currentStamina, remainingMs, isInfinite };
});

export const recalculatePersonalStats = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  const uid = context.auth.uid;
  const db = admin.firestore();
  const collections = ['zenerAttempts', 'colorAttempts', 'astroTarotAttempts', 'standardDeckAttempts', 'stockAttempts'];
  const userUpdate: any = {};

  for (const col of collections) {
    const snapshot = await db.collection(col).where('userId', '==', uid).get();
    let total = 0; let hits = 0; let subStats: any = {};

    snapshot.docs.forEach(doc => {
      total++; const d = doc.data(); if (d.isSuccess) hits++;
      if (col === 'standardDeckAttempts' && d.guessType) {
        if (!subStats[d.guessType]) subStats[d.guessType] = { total: 0, hits: 0 };
        subStats[d.guessType].total++; if (d.isSuccess) subStats[d.guessType].hits++;
      }
    });

    userUpdate[col] = { total, hits };
    if (col === 'standardDeckAttempts') userUpdate[col].subStats = subStats;
  }

  await db.collection('userStats').doc(uid).set(userUpdate, { merge: true });
  return { success: true, processed: Object.keys(userUpdate).length };
});

export const adminGetUsers = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  const db = admin.firestore();
  const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
  if (!adminDoc.exists) throw new functions.https.HttpsError('permission-denied', 'Must be admin');

  try {
    const userRecords = await admin.auth().listUsers(1000);
    return userRecords.users.map(u => ({
      uid: u.uid,
      email: u.email || 'No Email',
      displayName: u.displayName || 'Unknown'
    }));
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Failed to fetch users');
  }
});