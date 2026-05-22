const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const html = read('DEDaily.html');
const expectedScripts = [
  'src/content.js',
  'src/learning.js',
  'src/storage.js',
  'src/app.js'
];

const errors = [];

for (const script of expectedScripts) {
  if (!html.includes(`src="${script}"`)) errors.push(`DEDaily.html missing ${script}`);
}
if (!html.includes('href="src/styles.css"')) errors.push('DEDaily.html missing src/styles.css');

const source = [
  read('src/content.js'),
  read('src/learning.js'),
  'globalThis.__dd = { TOPICS, PAT_CATS, PATTERNS, PATTERN_BY_ID, SENTENCE_SEEDS, SENTENCES };'
].join('\n');

const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'validate-content.vm.js' });

const { TOPICS, PAT_CATS, PATTERNS, SENTENCE_SEEDS, SENTENCES } = sandbox.__dd;
const topicIds = new Set(TOPICS.map(t => t.id));
const catIds = new Set(PAT_CATS.map(c => c.id));
const patternIds = new Set(PATTERNS.map(p => p.id));
const sentenceIds = new Set();

function getSentence(id) {
  return SENTENCES.find(s => s.id === id);
}

function requireSentence(id, predicate, message) {
  const sentence = getSentence(id);
  if (!sentence) {
    errors.push(`${id} missing`);
    return;
  }
  if (!predicate(sentence)) errors.push(`${id}: ${message}`);
}

for (const sentence of SENTENCES) {
  if (sentenceIds.has(sentence.id)) errors.push(`duplicate sentence id ${sentence.id}`);
  sentenceIds.add(sentence.id);

  for (const key of ['id', 't', 'de', 'en', 'ph', 'use', 'lv', 'register']) {
    if (!sentence[key]) errors.push(`${sentence.id} missing ${key}`);
  }

  if (!topicIds.has(sentence.t)) errors.push(`${sentence.id} invalid topic ${sentence.t}`);
  if (!['A1', 'A2', 'B1'].includes(sentence.lv)) errors.push(`${sentence.id} invalid level ${sentence.lv}`);
  if (!sentence.fixed && (!Array.isArray(sentence.patternIds) || sentence.patternIds.length === 0)) {
    errors.push(`${sentence.id} must have patternIds or fixed:true`);
  }
  for (const patternId of sentence.patternIds || []) {
    if (!patternIds.has(patternId)) errors.push(`${sentence.id} invalid patternId ${patternId}`);
  }

  const learn = sentence.learn;
  if (!learn) {
    errors.push(`${sentence.id} missing learn object`);
    continue;
  }
  if (!learn.meaning) errors.push(`${sentence.id} missing learn.meaning`);
  if (!learn.scenario) errors.push(`${sentence.id} missing learn.scenario`);
  if (!learn.grammar || !learn.grammar.title || !learn.grammar.simple || !Array.isArray(learn.grammar.chunks)) {
    errors.push(`${sentence.id} incomplete learn.grammar`);
  }
  if (!learn.expectedReply || /Listen for the key detail/.test(learn.expectedReply)) {
    errors.push(`${sentence.id} has generic expectedReply`);
  }
  if (!learn.practice || /Replace one slot in the pattern/.test(learn.practice)) {
    errors.push(`${sentence.id} has generic practice`);
  }
}

for (const topic of TOPICS) {
  if (!SENTENCES.some(s => s.t === topic.id)) errors.push(`empty topic ${topic.id}`);
}

for (const pattern of PATTERNS) {
  if (!catIds.has(pattern.cat)) errors.push(`${pattern.id} invalid category ${pattern.cat}`);
  if (!pattern.template || !pattern.meaning || !pattern.grammar || !pattern.watchOut) {
    errors.push(`${pattern.id} missing required pattern text`);
  }
  if (!Array.isArray(pattern.examples) || pattern.examples.length < 2) {
    errors.push(`${pattern.id} needs at least two examples`);
  }
}

const patternChecks = [
  ['ask_write_down', p => p.examples.every(e => /aufschreib/i.test(e.de)), 'examples must use aufschreiben'],
  ['since_problem', p => p.examples.every(e => /funktioniert/i.test(e.de) && /nicht/i.test(e.de)), 'examples must match funktioniert nicht'],
  ['take_medicine', p => p.examples.every(e => /^Wie oft soll ich/.test(e.de)), 'examples must ask frequency'],
  ['direct_debit', p => p.examples.every(e => /^Ich zahle per/.test(e.de)), 'examples must match Ich zahle per'],
  ['urgent_help', p => p.examples.every(e => /^Ich brauche dringend/.test(e.de)), 'examples must match urgent help template']
];

for (const [id, predicate, message] of patternChecks) {
  const pattern = PATTERNS.find(p => p.id === id);
  if (!pattern) errors.push(`missing pattern ${id}`);
  else if (!predicate(pattern)) errors.push(`${id}: ${message}`);
}

requireSentence('un14', s => /^Koenn|^Konn/.test(s.de.normalize('NFD').replace(/[\u0300-\u036f]/g, '')), 'should use polite could/could you wording');
requireSentence('hl2', s => /freien Termin/.test(s.de), 'should ask for a free appointment');
requireSentence('hl6', s => /severe/.test(s.en), 'English should use severe pain wording');
requireSentence('ho19', s => /Mietvertrag/.test(s.de), 'should use Mietvertrag for formal lease termination');
requireSentence('mn5', s => /SEPA/.test(s.de) && s.fixed, 'should distinguish mandate revocation from reversing a booked debit');
requireSentence('sv13', s => s.register === 'neutral' && s.fixed, 'card payment question should be neutral fixed phrase');
requireSentence('so10', s => /if that works/.test(s.en), 'translation should reflect wenn es passt');

const formalInformal = SENTENCES.filter(s => {
  const variants = s.learn && Array.isArray(s.learn.variants) ? s.learn.variants : [];
  return variants.some(v => /formal/i.test(v.label)) && variants.some(v => /informal/i.test(v.label));
});

if (formalInformal.length < 20) errors.push(`expected at least 20 formal/informal cards, found ${formalInformal.length}`);

if (/pid: 'p\d+'/.test(read('src/app.js'))) {
  errors.push('src/app.js still contains old regex pattern fallback ids');
}

const topicCounts = Object.fromEntries(TOPICS.map(t => [t.id, SENTENCES.filter(s => s.t === t.id).length]));
const levelCounts = SENTENCES.reduce((acc, s) => {
  acc[s.lv] = (acc[s.lv] || 0) + 1;
  return acc;
}, {});

const report = {
  sentences: SENTENCES.length,
  seeds: SENTENCE_SEEDS.length,
  topics: TOPICS.length,
  patterns: PATTERNS.length,
  formalInformal: formalInformal.length,
  topicCounts,
  levelCounts,
  errors
};

console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exit(1);
