// ══════════════════════════════════════════════
// STORAGE
// ══════════════════════════════════════════════
const SKEY = 'dd_v4';
const SKEY_OLD = 'dd_clean_v1';
let DB = { learned: new Set(), favorites: new Set(), understood: new Set(), streak: 0, lastStudy: null, dailyGoal: 10, dailyQueue: [], dailyQueueDate: null, dailyLearned: new Set(), history: {}, historyWords: {}, srs: {} };

function dbToObj() {
  return {
    learned: [...DB.learned], favorites: [...DB.favorites], understood: [...DB.understood],
    streak: DB.streak, lastStudy: DB.lastStudy, dailyGoal: DB.dailyGoal,
    dailyQueue: DB.dailyQueue, dailyQueueDate: DB.dailyQueueDate,
    dailyLearned: [...DB.dailyLearned], history: DB.history, historyWords: DB.historyWords, srs: DB.srs
  };
}
function objToDB(p) {
  DB.learned = new Set(p.learned || []); DB.favorites = new Set(p.favorites || []); DB.understood = new Set(p.understood || []);
  DB.streak = p.streak || 0; DB.lastStudy = p.lastStudy || null; DB.dailyGoal = p.dailyGoal || 10;
  DB.dailyQueue = p.dailyQueue || []; DB.dailyQueueDate = p.dailyQueueDate || null;
  DB.dailyLearned = new Set(p.dailyLearned || []); DB.history = p.history || {};
  DB.historyWords = p.historyWords || {};
  DB.srs = p.srs || {};
}

async function load() {
  try {
    let raw = localStorage.getItem(SKEY);
    if (!raw) raw = localStorage.getItem(SKEY_OLD);
    if (raw) objToDB(JSON.parse(raw));
  } catch (e) { }

  let needsSave = false;

  // ── Migration: remove orphaned IDs not present in SENTENCES ─────────────
  // Protects against phantom counts if sentence IDs changed across versions
  // or a bad import added non-existent IDs.
  const validIds = new Set(SENTENCES.map(s => s.id));
  DB.learned.forEach(id => { if (!validIds.has(id)) { DB.learned.delete(id); needsSave = true; } });
  DB.favorites.forEach(id => { if (!validIds.has(id)) { DB.favorites.delete(id); needsSave = true; } });
  DB.dailyLearned.forEach(id => { if (!validIds.has(id)) { DB.dailyLearned.delete(id); needsSave = true; } });

  // ── Migration: remove SRS entries for cards that were never learned ──────
  // A prior bug called srsSchedule on unlearned cards when "Still learning"
  // was tapped, giving them a future nextReview date that hid them from the
  // daily queue forever. Purge any such entries now.
  Object.keys(DB.srs).forEach(id => {
    if (!DB.learned.has(id)) { delete DB.srs[id]; needsSave = true; }
  });

  // ── Migration: deduplicate historyWords (first-recorded date wins) ───────
  // The old backfill bug copied the previous day's learned words into the
  // current day's bucket on every new-day load. Fix by keeping each word ID
  // only in its chronologically earliest date bucket.
  const hwKeys = Object.keys(DB.historyWords).sort((a, b) => {
    const pa = a.split('-').map(Number), pb = b.split('-').map(Number);
    return new Date(pa[0], pa[1] - 1, pa[2]) - new Date(pb[0], pb[1] - 1, pb[2]);
  });
  const seenHWIds = new Set();
  hwKeys.forEach(key => {
    const before = DB.historyWords[key];
    const after = before.filter(id => !seenHWIds.has(id));
    after.forEach(id => seenHWIds.add(id));
    if (after.length !== before.length) { DB.historyWords[key] = after; needsSave = true; }
  });

  // ── Migration: sync DB.learned to historyWords as source of truth ────────
  // Any word in DB.learned that has no historyWords entry in any date is an
  // orphaned ghost entry (learned via a path that never wrote historyWords,
  // or corrupted by the old backfill bug). Remove them so all counts match.
  const allTrackedIds = new Set(Object.values(DB.historyWords).flat());
  DB.learned.forEach(id => {
    if (!allTrackedIds.has(id) && !DB.dailyLearned.has(id)) {
      DB.learned.delete(id);
      delete DB.srs[id];
      needsSave = true;
    }
  });

  // ── Backfill: words learned before historyWords tracking existed ─────────
  // Only backfill if dailyQueueDate is today, otherwise dailyLearned
  // contains stale words from a previous day.
  const tk = todayKey();
  if (DB.dailyLearned.size > 0 && DB.dailyQueueDate === today()) {
    if (!DB.historyWords[tk]) DB.historyWords[tk] = [];
    DB.dailyLearned.forEach(id => {
      if (!DB.historyWords[tk].includes(id)) { DB.historyWords[tk].push(id); needsSave = true; }
    });
  }

  if (needsSave) save();
}

function save() {
  const json = JSON.stringify(dbToObj());
  try { localStorage.setItem(SKEY, json); } catch (e) { }
  try { if (window.storage) window.storage.set(SKEY, json); } catch (e) { }
}
function today() { return new Date().toDateString(); }
function todayKey() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
function updateStreak() {
  const t = today();
  if (DB.lastStudy === t) return;
  const y = new Date(Date.now() - 86400000).toDateString();
  if (DB.lastStudy === y) DB.streak++; else if (DB.lastStudy !== t) DB.streak = 1;
  DB.lastStudy = t; save();
}
function shuffle(a) { return [...a].sort(() => Math.random() - .5); }

// ══════════════════════════════════════════════
// SPACED REPETITION (SRS) — Anki/SM-2 Inspired
// ══════════════════════════════════════════════
// Review intervals by level (in days).
// Level 0 = "new/reset" — first encounter or hard reset
// "Got it" promotes one level; "Still learning" drops one level (min 0).
// Intervals follow an expanding schedule similar to Anki:
//   Level 0 → review in 1 day
//   Level 1 → review in 3 days
//   Level 2 → review in 7 days
//   Level 3 → review in 14 days
//   Level 4 → review in 30 days
//   Level 5 → review in 60 days
//   Level 6 → review in 90 days (mastered)
const SRS_INTERVALS = [1, 3, 7, 14, 30, 60, 90]; // days per level

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDaysISO(days) {
  const d = new Date(Date.now() + days * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Human-readable label for when next review is due
function srsNextLabel(id) {
  const srs = DB.srs[id];
  if (!srs || !srs.nextReview) return '';
  const today = new Date(todayISO());
  const next = new Date(srs.nextReview);
  const diffMs = next - today;
  const diffDays = Math.round(diffMs / 86400000);
  if (diffDays <= 0) return 'due today';
  if (diffDays === 1) return 'due tomorrow';
  if (diffDays < 7) return `in ${diffDays} days`;
  if (diffDays < 30) return `in ${Math.round(diffDays / 7)} week${Math.round(diffDays / 7) > 1 ? 's' : ''}`;
  return `in ${Math.round(diffDays / 30)} month${Math.round(diffDays / 30) > 1 ? 's' : ''}`;
}

// Core scheduling: called on EVERY practice answer (not just SRS mode)
function srsSchedule(id, gotIt) {
  if (!DB.srs[id]) DB.srs[id] = { interval: 0, ease: 2.5, level: 0, nextReview: null, lastReview: null };
  const card = DB.srs[id];
  card.lastReview = todayISO();
  
  // Ensure ease is initialized for older data
  if (!card.ease) card.ease = 2.5;
  
  if (gotIt) {
    // Anki logic for correct answer
    if (card.interval === 0 || card.interval === undefined) {
      card.interval = 1;
    } else if (card.interval === 1) {
      card.interval = 6;
    } else {
      card.interval = Math.round(card.interval * card.ease);
    }
  } else {
    // Anki logic for incorrect answer (lapse)
    card.interval = 1;
    card.ease = Math.max(1.3, card.ease - 0.20);
  }
  
  // Calculate a "level" for the UI dots (approximating intervals: 1, 3, 7, 14, 30, 60, 90)
  if (card.interval <= 1) card.level = 0;
  else if (card.interval < 7) card.level = 1;
  else if (card.interval < 14) card.level = 2;
  else if (card.interval < 30) card.level = 3;
  else if (card.interval < 60) card.level = 4;
  else if (card.interval < 90) card.level = 5;
  else card.level = 6;

  card.nextReview = addDaysISO(card.interval);
  save();
}

// Get IDs of learned cards that are due for review today or overdue
function getSrsReviewIds() {
  const td = todayISO();
  return Object.entries(DB.srs)
    .filter(([id, data]) => DB.learned.has(id) && data.nextReview && data.nextReview <= td)
    .map(([id]) => id);
}

function getSrsLevel(id) { return (DB.srs[id] || {}).level || 0; }

// Check if a card is scheduled for future review (not due yet)
function isSrsScheduledFuture(id) {
  const srs = DB.srs[id];
  if (!srs || !srs.nextReview) return false;
  return srs.nextReview > todayISO();
}

// Track cards answered "Got it" in the current browser session
// so they never reappear until the page is refreshed / next day
let _sessionGotIt = new Set();

// ══════════════════════════════════════════════
// GRAMMAR TAG AUTO-DETECTION
// ══════════════════════════════════════════════
function grammarTag(de) {
  const s = de.toLowerCase();
  if (/\b(muss|müssen|kann|könn|darf|dürfen|soll|sollen|will(?!kommen|kommen)|wollen|mag(?! )|mögen|möchte|möchten|würde|würden)\b/.test(s))
    return { t: 'Modal', c: '#7C3AED', bg: '#F5F3FF' };
  if (/\b(habe|hat|hast|haben|habt|bin|bist|ist|sind|seid|war|waren)\b/.test(s) && /\bge[a-zäöüß]{2,}(t|en)\b/.test(s))
    return { t: 'Perfekt', c: '#2563EB', bg: '#EFF6FF' };
  if (/^(wo |wer |was |wann |wie |woher |wohin |welch|warum )/.test(s))
    return { t: 'W-Frage', c: '#EA580C', bg: '#FFF7ED' };
  if (/\b(nicht|kein|keine|keinen|keiner|keines|keinem)\b/.test(s))
    return { t: 'Negation', c: '#DC2626', bg: '#FEF2F2' };
  if (/\bseit\b/.test(s))
    return { t: 'seit + Dativ', c: '#D97706', bg: '#FFFBEB' };
  return null;
}

// Daily queue: only picks cards that are NOT already scheduled for future SRS
function ensureDailyQueue() {
  const t = today();
  if (DB.dailyQueueDate === t && DB.dailyQueue.length > 0) {
    // Same day and queue exists — never change it. Only a new day or "New batch" should alter it.
    return;
  }
  if (DB.dailyQueueDate !== t) { DB.dailyLearned = new Set(); _sessionGotIt = new Set(); }
  // Prioritize unlearned cards, then add learned cards that are NOT scheduled for future review
  const unlearned = shuffle(SENTENCES.filter(s => !DB.learned.has(s.id) && !isSrsScheduledFuture(s.id)));
  const learnedDue = shuffle(SENTENCES.filter(s => DB.learned.has(s.id) && !isSrsScheduledFuture(s.id)));
  const pool = [...unlearned, ...learnedDue];
  DB.dailyQueue = pool.slice(0, DB.dailyGoal).map(s => s.id);
  DB.dailyQueueDate = t;
  // Restore dailyLearned from historyWords so it's accurate after a goal change or queue refresh
  const todayWordIds = (DB.historyWords[todayKey()] || []).filter(id => DB.learned.has(id));
  if (todayWordIds.length > 0) DB.dailyLearned = new Set(todayWordIds);
  save();
}
