const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const source = [
  read('src/content.js'),
  read('src/learning.js'),
  read('src/storage.js'),
  read('src/app.js'),
  'renderPractice = () => {}; updateHeader = () => {};',
  `globalThis.__test = {
    SENTENCES,
    normalizeDb,
    objToDB,
    dbToObj,
    today,
    todayISO,
    addDaysISO,
    load,
    ensureDailyQueue,
    markSentenceLearned,
    srsSchedule,
    schedulePattern,
    getSrsReviewIds,
    getPatternReviewIds,
    practiceAnswer,
    practiceNext,
    setPracticeState: value => { P = value; },
    getPracticeState: () => P,
    DB: () => DB,
  };`
].join('\n');

const store = {};
function makeElement() {
  return {
    style: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    dataset: {},
    value: '',
    textContent: '',
    innerHTML: '',
    tagName: 'DIV',
    appendChild: () => {},
    addEventListener: () => {},
    remove: () => {},
    removeAttribute: () => {},
    setAttribute: () => {},
    focus: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}
const rootElement = makeElement();
const sandbox = {
  console,
  window: {
    __DD_SKIP_AUTO_INIT: true,
    storage: { set: () => {} },
    speechSynthesis: {
      getVoices: () => [],
      speak: () => {},
      cancel: () => {},
      onvoiceschanged: null,
    },
    scrollTo: () => {},
  },
  navigator: {
    userAgent: 'logic-tests',
    clipboard: { writeText: () => Promise.resolve() },
  },
  document: {
    activeElement: null,
    body: makeElement(),
    addEventListener: () => {},
    createElement: makeElement,
    execCommand: () => true,
    getElementById: id => id === 'root' ? rootElement : makeElement(),
    querySelector: () => null,
    querySelectorAll: () => [],
  },
  URL: {
    createObjectURL: () => 'blob:logic-test',
    revokeObjectURL: () => {},
  },
  Blob: function Blob() {},
  Audio: function Audio() {
    return { play: () => Promise.resolve(), pause: () => {}, addEventListener: () => {} };
  },
  SpeechSynthesisUtterance: function SpeechSynthesisUtterance() {},
  speechSynthesis: {
    getVoices: () => [],
    speak: () => {},
    cancel: () => {},
    onvoiceschanged: null,
  },
  localStorage: {
    getItem: key => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
    setItem: (key, value) => { store[key] = value; },
  },
};

vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'logic-tests.vm.js' });

const t = sandbox.__test;

function reset(raw = {}) {
  t.objToDB(raw);
}

function clearStore() {
  Object.keys(store).forEach(key => { delete store[key]; });
}

reset({ learned: ['un1'], historyWords: {} });
assert(t.DB().learned.has('un1'), 'learned ID without historyWords must be preserved');
assert.strictEqual(t.DB().historyWords[t.today()], undefined, 'unknown learned history should not be fabricated as today');

reset({ learned: ['un1'], lastStudy: '2026-05-02', historyWords: {} });
assert.strictEqual(JSON.stringify(t.DB().historyWords['2026-05-02']), JSON.stringify(['un1']), 'missing learned history should use known lastStudy when available');

reset({
  learned: ['un1', 'bad-id'],
  favorites: 'not-array',
  dailyGoal: 999,
  historyWords: { 'bad-date': ['un1'], '2026-5-2': ['un1', 'bad-id'] },
  srs: { un1: { interval: 'bad', nextReview: 'bad-date' }, missing: { interval: 1 } },
});
assert.strictEqual(JSON.stringify([...t.DB().learned]), JSON.stringify(['un1']), 'normalizer filters invalid sentence IDs');
assert.strictEqual(t.DB().dailyGoal, 50, 'daily goal is clamped');
assert.strictEqual(JSON.stringify(t.DB().historyWords['2026-05-02']), JSON.stringify(['un1']), 'historyWords keys and IDs are normalized');
assert(t.DB().srs.un1, 'valid SRS entry is retained');
assert(!t.DB().srs.missing, 'invalid SRS entry is removed');

reset({
  learned: ['un1'],
  dailyGoal: 5,
  historyWords: { [t.addDaysISO(-10)]: ['un1'] },
  srs: { un1: { interval: 3, ease: 2.5, level: 1, nextReview: t.addDaysISO(-1), lastReview: t.addDaysISO(-4) } },
});
t.ensureDailyQueue();
assert.strictEqual(t.DB().dailyQueue[0], 'un1', 'due reviews should be first in the daily queue');

reset({});
t.markSentenceLearned('un2', 'manual');
assert.strictEqual(t.DB().srs.un2.interval, 3, 'first learned sentence uses one first-review interval');
assert(t.DB().historyWords[t.today()].includes('un2'), 'manual learned sentence is tracked in history');

const scheduled = t.srsSchedule('un2', true);
assert.strictEqual(scheduled.intervalBefore, 3, 'SRS schedule reports interval before review');
assert.strictEqual(t.DB().srs.un2.interval, 7, 'correct first review promotes to 7 days');

reset({});
const retryCard = t.SENTENCES.find(s => s.id === 'un1');
t.setPracticeState({ active: true, queue: [retryCard], idx: 0, revealed: true, got: 0, again: 0, skipped: 0, isSRS: false, dir: 'de2en', dirChoice: false, answered: {}, missedIds: [], typedFeedback: null });
t.practiceAnswer(false);
let practiceState = t.getPracticeState();
assert.strictEqual(practiceState.queue.length, 2, 'missed card should be requeued for another attempt');
assert.strictEqual(practiceState.idx, 1, 'practice should advance to the requeued miss');
assert.strictEqual(practiceState.again, 1, 'missed attempt should count once');
assert.strictEqual(practiceState.answered['0'], 'again', 'first queue position is tracked as answered');
t.practiceAnswer(true);
practiceState = t.getPracticeState();
assert.strictEqual(practiceState.got, 1, 'requeued miss can be answered and scored');
assert.strictEqual(practiceState.answered['1'], 'got', 'requeued queue position is tracked independently');
assert(t.DB().learned.has('un1'), 'correct retry marks the sentence learned');

reset({});
const firstPattern = t.schedulePattern('would_possible', true);
assert.strictEqual(firstPattern.intervalBefore, 0, 'new pattern SRS starts from interval zero');
assert.strictEqual(t.DB().patternSrs.would_possible.interval, 3, 'first understood pattern uses the first-review interval');

reset({ settings: { externalTts: false } });
assert.strictEqual(t.DB().settings.externalTts, true, 'external TTS stays enabled after normalizing old settings');

reset({
  attempts: [{ id: 'un1', date: t.today(), mode: 'practice', direction: 'type', result: 'got' }],
});
assert.strictEqual(t.DB().attempts[0].direction, 'type', 'typed practice direction survives normalization');

reset({
  patternSrs: { would_possible: { interval: 1, ease: 2.5, level: 0, nextReview: t.today(), lastReview: t.today() } },
  understood: [],
});
assert.strictEqual(JSON.stringify(t.getPatternReviewIds()), JSON.stringify(['would_possible']), 'failed patterns with SRS stay eligible for review');

clearStore();
store.dd_v4 = '{bad json';
t.objToDB({ learned: ['un1'] });
t.load();
assert.strictEqual(store.dd_v4, '{bad json', 'corrupt progress must not be overwritten on load');
assert(store.dd_v4_recovery && store.dd_v4_recovery.includes('{bad json'), 'corrupt progress gets a recovery copy');
assert.strictEqual([...t.DB().learned].length, 0, 'unrecoverable corrupt progress loads an empty in-memory DB only');

clearStore();
store.dd_v4 = 'null';
t.objToDB({ learned: ['un1'] });
t.load();
assert.strictEqual(store.dd_v4, 'null', 'non-object stored progress must not be overwritten on load');
assert(store.dd_v4_recovery && store.dd_v4_recovery.includes('Saved progress payload is not an object'), 'non-object stored progress gets a recovery copy');

clearStore();
store.dd_v4 = '{bad json';
store.dd_clean_v1 = JSON.stringify({ learned: ['un1'], lastStudy: '2026-05-02' });
t.objToDB({});
t.load();
assert(t.DB().learned.has('un1'), 'valid legacy progress is recovered when current progress is corrupt');
assert.strictEqual(store.dd_v4, '{bad json', 'recovering from legacy progress must not overwrite corrupt current progress');
assert(store.dd_v4_recovery && store.dd_v4_recovery.includes('{bad json'), 'recovered corrupt current progress keeps a raw recovery copy');

console.log('logic-tests passed');
