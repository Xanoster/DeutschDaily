// ══════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════
let V = { view: 'today', topicId: null, filter: 'all', query: '', speaking: null, libTab: 'saved', patFilter: 'all', historyDay: null };

// ══════════════════════════════════════════════
// PATTERN DETECTION FOR SENTENCES
// ══════════════════════════════════════════════
function findMatchingPattern(sentence) {
  const explicit = (sentence.patternIds || []).map(id => PATTERN_BY_ID[id]).find(Boolean);
  if (explicit) return explicit;
  return null;
}
function nav(view, extra) { V.view = view; if (extra) V.topicId = extra; V.filter = 'all'; V.query = ''; render(); window.scrollTo(0, 0); }

// ══════════════════════════════════════════════
// ICONS
// ══════════════════════════════════════════════
const ICO = {
  speak: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
};

// ══════════════════════════════════════════════
// RENDER
// ══════════════════════════════════════════════
function render() {
  updateHeader();
  updateNavBtns();
  const root = document.getElementById('root');
  if (V.view === 'today') root.innerHTML = renderToday();
  else if (V.view === 'browse' && V.topicId) root.innerHTML = renderTopic();
  else if (V.view === 'browse') root.innerHTML = renderBrowse();
  else if (V.view === 'patterns') root.innerHTML = renderPatterns();
  else if (V.view === 'saved') root.innerHTML = renderSaved();
  else if (V.view === 'history') root.innerHTML = renderHistory();
  else if (V.view === 'history-day') root.innerHTML = renderHistoryDay();
  else if (V.view === 'stats') { root.innerHTML = renderStats(); }
  root.querySelectorAll('.sc,.pc').forEach((el, i) => el.style.animationDelay = i * 25 + 'ms');
}

function updateHeader() {
  const tot = SENTENCES.length, done = DB.learned.size, pct = tot ? Math.round(done / tot * 100) : 0;
  document.getElementById('hpf').style.width = pct + '%';
  document.getElementById('hpl').textContent = `${done} / ${tot} learned`;
  document.getElementById('stk-n').textContent = DB.streak;
}
function updateNavBtns() {
  ['today', 'browse', 'patterns', 'stats'].forEach(v => {
    const el = document.getElementById('nb-' + v);
    if (el) el.className = 'nb' + (V.view === v ? ' on' : '');
    const mel = document.getElementById('mnb-' + v);
    if (mel) mel.className = 'mnb' + (V.view === v ? ' on' : '');
  });
  const libBtn = document.getElementById('nb-library');
  if (libBtn) libBtn.className = 'nb' + (V.view === 'saved' ? ' on' : '');
  const mLibBtn = document.getElementById('mnb-library');
  if (mLibBtn) mLibBtn.className = 'mnb' + (V.view === 'saved' ? ' on' : '');
  const histBtn = document.getElementById('nb-history');
  if (histBtn) histBtn.className = 'nb' + (V.view === 'history' || V.view === 'history-day' ? ' on' : '');
  const mHistBtn = document.getElementById('mnb-history');
  if (mHistBtn) mHistBtn.className = 'mnb' + (V.view === 'history' || V.view === 'history-day' ? ' on' : '');
  const sc = document.getElementById('sb-learned-count');
  if (sc) sc.textContent = DB.learned.size;
}

// ─── TODAY ───────────────────────────────────
function renderToday() {
  ensureDailyQueue();
  const qs = DB.dailyQueue.map(id => SENTENCES.find(s => s.id === id)).filter(Boolean);
  const lt = DB.dailyLearned.size;
  const tot = qs.length, pct = tot ? Math.round(lt / tot * 100) : 0, done = lt === tot && tot > 0;

  const gc = `<div class="goal-card">
<div class="goal-top">
  <div><div class="goal-title">📅 Today's Practice</div><div class="goal-date">${new Date().toLocaleDateString('en-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</div></div>
  <button class="goal-btn" onclick="openGoalModal()">Goal: ${DB.dailyGoal} ✏️</button>
</div>
<div class="goal-nums">
  <div><div class="gnum-v" style="color:var(--green)">${lt}</div><div class="gnum-l">Learned today</div></div>
  <div><div class="gnum-v" style="color:var(--text-3)">${Math.max(0, tot - lt)}</div><div class="gnum-l">Remaining</div></div>
  <div><div class="gnum-v" style="color:var(--accent)">${DB.dailyGoal}</div><div class="gnum-l">Daily goal</div></div>
  <div><div class="gnum-v" style="color:var(--blue)">${DB.learned.size}</div><div class="gnum-l">Total ever</div></div>
</div>
${done ? `<div class="goal-complete">🎉 Daily goal complete! Come back tomorrow.</div>` : `<div class="goal-bar-bg"><div class="goal-bar-fill" style="width:${pct}%"></div></div>`}
  </div>`;

  return `${gc}

<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
  <div style="font-size:14px;font-weight:600;color:var(--text)">Today's ${tot} Sentences</div>
  <div style="display:flex;gap:7px">
    <button onclick="startPractice({ids:${JSON.stringify(qs.map(s => s.id)).replace(/"/g, "'")}})" style="background:var(--accent);color:white;border:none;border-radius:8px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif">🎯 Practice</button>
    <button onclick="refreshQueue()" style="background:var(--white);border:1px solid var(--border);border-radius:8px;padding:5px 10px;font-size:12px;cursor:pointer;color:var(--text-2);font-family:'Inter',sans-serif;font-weight:500">🔄 New batch</button>
  </div>
</div>

${qs.map((s, i) => renderSentenceCard(s, i, true)).join('')}`;
}

// ─── BROWSE ──────────────────────────────────
function renderBrowse() {
  const topicCards = TOPICS.map(t => {
    const tot = SENTENCES.filter(s => s.t === t.id).length;
    const done = SENTENCES.filter(s => s.t === t.id && DB.learned.has(s.id)).length;
    const pct = tot ? Math.round(done / tot * 100) : 0;
    return `<div class="topic-card" onclick="nav('browse','${t.id}')" style="--tc:${t.color}">
  <span class="tc-emoji">${t.emoji}</span>
  <div class="tc-name">${t.name}</div>
  <div class="tc-de">${t.german}</div>
  <div class="tc-prog"><span class="tc-count">${done}/${tot}</span><div class="tc-bar-bg"><div class="tc-bar-fill" style="width:${pct}%;background:var(--tc)"></div></div></div>
</div>`;
  }).join('');
  return `<div style="padding-top:14px">
<h2 class="page-title">Browse</h2>
<p class="page-sub">${SENTENCES.length} sentences - ${PATTERNS.length} patterns - ${TOPICS.length} topics</p>
<div class="topic-grid">${topicCards}</div>
  </div>`;
}

// ─── TOPIC ───────────────────────────────────
function renderTopic() {
  const topic = TOPICS.find(t => t.id === V.topicId);
  if (!topic) return renderBrowse();
  let sents = SENTENCES.filter(s => s.t === V.topicId);
  if (V.filter === 'learned') sents = sents.filter(s => DB.learned.has(s.id));
  else if (V.filter === 'unlearned') sents = sents.filter(s => !DB.learned.has(s.id));
  else if (V.filter === 'favorites') sents = sents.filter(s => DB.favorites.has(s.id));
  if (V.query) { const q = V.query.toLowerCase(); sents = sents.filter(s => s.de.toLowerCase().includes(q) || s.en.toLowerCase().includes(q)); }
  const done = SENTENCES.filter(s => s.t === V.topicId && DB.learned.has(s.id)).length;
  const tot = SENTENCES.filter(s => s.t === V.topicId).length;
  const allTopicIds = JSON.stringify(SENTENCES.filter(s => s.t === V.topicId).map(s => s.id)).replace(/"/g, "'");
  const unlearnedTopicIds = JSON.stringify(SENTENCES.filter(s => s.t === V.topicId && !DB.learned.has(s.id)).map(s => s.id)).replace(/"/g, "'");
  const practiceTopicBtn = `<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
<button onclick="startPractice({ids:${allTopicIds}})" style="flex:1;background:var(--accent);color:white;border:none;border-radius:9px;padding:10px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:opacity 0.15s" onmouseover="this.style.opacity='.88'" onmouseout="this.style.opacity='1'">🎯 Practice All ${tot}</button>
${SENTENCES.filter(s => s.t === V.topicId && !DB.learned.has(s.id)).length > 0 ? `<button onclick="startPractice({ids:${unlearnedTopicIds}})" style="flex:1;background:var(--white);border:1px solid var(--border);border-radius:9px;padding:10px 14px;font-size:13px;font-weight:600;cursor:pointer;color:var(--text-2);font-family:'Inter',sans-serif;transition:all 0.15s" onmouseover="this.style.borderColor='var(--border-strong)'" onmouseout="this.style.borderColor='var(--border)'">📚 Unlearned Only (${tot - done})</button>` : ''}
  </div>`;
  const cards = sents.length ? sents.map((s, i) => renderSentenceCard(s, i, false)).join('') : `<div class="empty-state"><div class="empty-icon">🔍</div>No sentences match.</div>`;
  return `<button class="back-btn" onclick="nav('browse')">← All Topics</button>
<div class="topic-hdr">
  <div class="topic-hdr-em">${topic.emoji}</div>
  <div><div class="topic-hdr-name">${topic.name}</div><div class="topic-hdr-de">${topic.german}</div>
    <div class="topic-hdr-stats"><span class="topic-stat"><strong>${done}</strong> learned</span><span class="topic-stat"><strong>${tot - done}</strong> remaining</span></div>
  </div>
</div>
<div class="filter-row">
  ${['all', 'unlearned', 'learned', 'favorites'].map(f => `<div class="filter-chip${V.filter === f ? ' on' : ''}" onclick="setFilter('${f}')">${f === 'all' ? 'All' : f === 'unlearned' ? 'To Learn' : f === 'learned' ? '✓ Learned' : '⭐ Saved'}</div>`).join('')}
</div>
${practiceTopicBtn}
<div class="search-wrap"><span class="search-icon">🔍</span><input class="search-input" placeholder="Search..." value="${V.query}" oninput="setQuery(this.value)" type="text"></div>

${cards}`;
}

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderSentenceLearnPanel(s, compact = false, idPrefix = 'gm-') {
  const learn = s.learn;
  if (!learn) return '';
  const pattern = findMatchingPattern(s);
  const variants = learn.variants || [];
  const swaps = (learn.reuse && learn.reuse.swaps ? learn.reuse.swaps : []).slice(0, 4);
  const chunks = (learn.grammar && learn.grammar.chunks ? learn.grammar.chunks : []).slice(0, compact ? 2 : 4);
  const scenario = learn.scenario;
  const scenarioHtml = scenario && !compact
    ? `<div class="learn-scenario"><strong>Situation:</strong> ${esc(scenario.speaker)} speaking to ${esc(scenario.listener)} in a ${esc(scenario.place)} to ${esc(scenario.purpose)}.</div>`
    : '';
  const variantHtml = variants.length
    ? variants.map(v => `<span class="variant-pill"><strong>${esc(v.label)}</strong>${esc(v.de)}${v.use ? `<br><span class="learn-muted">${esc(v.use)}</span>` : ''}</span>`).join('')
    : '<span class="learn-muted">This sentence is already the best everyday form for the shown situation.</span>';
  const swapHtml = swaps.length
    ? swaps.map(([slot, ex]) => `<div class="learn-chunk"><strong>${esc(slot)}</strong><span class="learn-muted">${esc(ex)}</span></div>`).join('')
    : '<span class="learn-muted">Use this as a fixed phrase in the situation shown.</span>';
  return `<div class="learn-panel${compact ? ' compact' : ''}" id="${idPrefix}${s.id}">
<div class="learn-title">Learn more: ${esc(learn.grammar.title)}</div>
<div>${esc(learn.meaning)}</div>
${scenarioHtml}
<div class="learn-grid">
  <div class="learn-box">
    <div class="learn-box-title">Why it works</div>
    <div>${esc(learn.grammar.simple)}</div>
    ${learn.grammar.watchOut ? `<div style="margin-top:6px"><strong>Watch out:</strong> ${esc(learn.grammar.watchOut)}</div>` : ''}
  </div>
  <div class="learn-box">
    <div class="learn-box-title">Pattern</div>
    <div>${pattern ? `<strong>${esc(pattern.template)}</strong><br><span class="learn-muted">${esc(pattern.meaning)}</span>` : '<span class="learn-muted">Fixed daily-life phrase.</span>'}</div>
  </div>
  <div class="learn-box">
    <div class="learn-box-title">Breakdown</div>
    ${chunks.map(([de, en]) => `<div class="learn-chunk"><strong>${esc(de)}</strong><span class="learn-muted">${esc(en)}</span></div>`).join('')}
  </div>
  <div class="learn-box">
    <div class="learn-box-title">Variants</div>
    ${variantHtml}
  </div>
  ${compact ? '' : `<div class="learn-box">
    <div class="learn-box-title">Reusable swaps</div>
    ${swapHtml}
  </div>
  <div class="learn-box">
    <div class="learn-box-title">Use it actively</div>
    <div><strong>You may hear:</strong> ${esc(learn.expectedReply)}</div>
    <div style="margin-top:5px"><strong>Practice:</strong> ${esc(learn.practice)}</div>
  </div>`}
</div>
  </div>`;
}

function toggleLearnMore(id) {
  const el = document.getElementById('gm-' + id);
  if (!el) return;
  el.classList.toggle('open');
}

function renderVariantPreview(s) {
  const variants = s.learn && Array.isArray(s.learn.variants) ? s.learn.variants : [];
  if (!variants.length) return '';
  return `<div class="variant-preview" id="vp-${s.id}">
<div class="variant-preview-title">Formal / informal</div>
${variants.map(v => `<div class="variant-preview-row">
  <span class="variant-preview-label">${esc(v.label)}</span>
  <span class="variant-preview-de">${esc(v.de)}</span>
</div>`).join('')}
  </div>`;
}

// ─── SENTENCE CARD ───────────────────────────
function renderSentenceCard(s, i, showTopic) {
  const lrn = DB.learned.has(s.id), fav = DB.favorites.has(s.id);
  const topic = TOPICS.find(t => t.id === s.t);
  const gram = grammarTag(s.de);
  const srsLvl = getSrsLevel(s.id);
  const srsDots = lrn ? `<span class="srs-dots">${SRS_INTERVALS.map((_, i) => `<span class="srs-dot${i < srsLvl ? ' filled' : ''}"></span>`).join('')}</span>` : '';
  const matchedPattern = findMatchingPattern(s);
  const patTag = matchedPattern ? `<span class="pattern-tag" title="This sentence uses a pattern">🧩 ${matchedPattern.template.replace(/\[.*?\]/g, '…').substring(0, 25)}</span>` : '';
  const variantTag = s.learn && s.learn.variants && s.learn.variants.length ? `<span class="pattern-tag" title="Includes formal and informal versions">Sie / du</span>` : '';
  const patExplain = matchedPattern ? `<div class="pattern-explain" id="pe-${s.id}">
<div class="pe-title">🧩 Pattern: ${matchedPattern.template}</div>
<div class="pe-meaning">${matchedPattern.meaning}</div>
<div class="pe-examples">Try more sentences with this pattern:
  ${matchedPattern.examples.filter(e => e.de !== s.de).slice(0, 2).map(e => `<div class="pe-example"><strong>${e.de}</strong> — ${e.en}</div>`).join('')}
</div>
  </div>` : '';
  return `<div class="sc${lrn ? ' lrn' : ''}${fav ? ' fav' : ''}" id="sc-${s.id}">
<div class="sc-top">
  ${showTopic && topic ? `<span class="topic-label">${topic.emoji} ${topic.name}</span>` : ''}
  <span class="lvl-tag l${s.lv}">${s.lv}</span>
  ${gram ? `<span class="gram-tag" style="color:${gram.c};background:${gram.bg}">${gram.t}</span>` : ''}
  ${patTag}
  ${variantTag}
  ${lrn ? `<span class="lrn-badge">✓ Learned</span>${srsDots}` : ''}
</div>
<div class="sentence-de" onclick="toggleReveal('${s.id}')">${s.de}</div>
<div class="sentence-ph"><span class="ph-lbl">🔊</span>${s.ph}</div>
<div class="reveal-hint" id="hn-${s.id}">👆 Tap to reveal translation</div>
<div class="sentence-en hid" id="en-${s.id}" onclick="toggleReveal('${s.id}')">${s.en}</div>

<div class="sentence-use" id="us-${s.id}" style="display:none">💬 ${s.use}</div>
${renderVariantPreview(s)}
${patExplain}
${renderSentenceLearnPanel(s)}
<div class="card-actions">
  <button class="act-btn${V.speaking === s.id ? ' is-playing' : ''} speak-btn" data-id="${s.id}" onclick="speak('${s.de.replace(/'/g, "\\'")}','${s.id}')">
    ${ICO.speak} ${V.speaking === s.id ? `<span class="pulse">Playing…</span>` : 'Listen'}
  </button>
  <button class="act-btn" onclick="toggleLearnMore('${s.id}')">🧠 Learn more</button>
  <button class="act-btn${lrn ? ' is-learned' : ''}" id="lrn-btn-${s.id}" onclick="toggleLearned('${s.id}')">
    ${ICO.check} ${lrn ? 'Learned' : 'Mark done'}
  </button>
  <button class="act-btn${fav ? ' is-fav' : ''}" id="fav-btn-${s.id}" onclick="toggleFav('${s.id}')">
    ${ICO.star} ${fav ? 'Saved' : 'Save'}
  </button>
</div>
  </div>`;
}

// ─── PATTERNS ────────────────────────────────
function renderPatterns() {
  let pats = PATTERNS;
  if (V.patFilter === 'understood') pats = pats.filter(p => DB.understood.has(p.id));
  else if (V.patFilter === 'new') pats = pats.filter(p => !DB.understood.has(p.id));

  const undCount = DB.understood.size;
  const cards = pats.length ? pats.map((p, i) => renderPatternCard(p, i)).join('') : `<div class="empty-state"><div class="empty-icon">🔍</div>No patterns match.</div>`;
  const allPatIds = JSON.stringify(pats.map(p => p.id)).replace(/"/g, "'");
  const newPatIds = JSON.stringify(pats.filter(p => !DB.understood.has(p.id)).map(p => p.id)).replace(/"/g, "'");
  const undPatIds = JSON.stringify(pats.filter(p => DB.understood.has(p.id)).map(p => p.id)).replace(/"/g, "'");
  return `<div style="padding-top:14px">
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
  <h2 class="page-title" style="margin-top:0">Sentence Patterns</h2>
  <span style="font-size:12px;font-weight:500;color:var(--purple)">${undCount}/${PATTERNS.length} understood</span>
</div>
<p class="page-sub">Master these ${PATTERNS.length} patterns → build hundreds of sentences</p>

<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
  ${pats.length > 0 ? `<button onclick="startPatternPractice({ids:${allPatIds}})" style="flex:1;background:var(--purple);color:white;border:none;border-radius:9px;padding:10px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:opacity 0.15s" onmouseover="this.style.opacity='.88'" onmouseout="this.style.opacity='1'">🧩 Practice All (${pats.length})</button>` : ''}
  ${pats.filter(p => !DB.understood.has(p.id)).length > 0 ? `<button onclick="startPatternPractice({ids:${newPatIds}})" style="flex:1;background:var(--white);border:1px solid var(--purple-border);border-radius:9px;padding:10px 14px;font-size:13px;font-weight:600;cursor:pointer;color:var(--purple);font-family:'Inter',sans-serif;transition:all 0.15s">📚 New Only (${pats.filter(p => !DB.understood.has(p.id)).length})</button>` : ''}
  ${pats.filter(p => DB.understood.has(p.id)).length > 0 ? `<button onclick="startPatternPractice({ids:${undPatIds}})" style="flex:1;background:var(--white);border:1px solid var(--green-border);border-radius:9px;padding:10px 14px;font-size:13px;font-weight:600;cursor:pointer;color:var(--green);font-family:'Inter',sans-serif;transition:all 0.15s">✅ Learned (${pats.filter(p => DB.understood.has(p.id)).length})</button>` : ''}
</div>


<div class="filter-row">
  <div class="filter-chip${V.patFilter === 'all' ? ' on' : ''}" onclick="setPatFilter('all')">All</div>
  <div class="filter-chip${V.patFilter === 'new' ? ' on' : ''}" onclick="setPatFilter('new')">📚 To Learn</div>
  <div class="filter-chip${V.patFilter === 'understood' ? ' on' : ''}" onclick="setPatFilter('understood')">✅ Understood</div>
</div>

${cards}
  </div>`;
}

function setPatFilter(f) { V.patFilter = f; render(); }

function renderPatternCard(p, i) {
  const und = DB.understood.has(p.id);
  const cat = PAT_CATS.find(c => c.id === p.cat);
  const tpl = p.template.replace(/\[([^\]]+)\]/g, '<span class="pat-blank">[$1]</span>');
  return `<div class="pc${und ? ' und' : ''}" id="pc-${p.id}">
${cat ? `<span class="pat-cat-tag">${cat.icon} ${cat.label}</span>` : ''}
<div class="pat-template">${tpl}</div>
<div class="pat-meaning">${p.meaning}</div>
<div class="pat-examples">${p.examples.map((e, ei) => `<div class="pat-ex"><div class="pat-de"><span class="pat-ex-speak" onclick="event.stopPropagation();speak('${e.de.replace(/'/g, "\\'").replace(/"/g, '&quot;')}','pex-${p.id}-${ei}')" title="Listen">🔊</span> ${e.de}</div><div class="pat-en">${e.en}</div></div>`).join('')}</div>
<div class="pat-actions">
  <button class="act-btn${und ? ' is-learned' : ''}" onclick="toggleUnderstood('${p.id}')">
    ${ICO.check} ${und ? 'Understood ✓' : 'Mark understood'}
  </button>
  <button class="act-btn speak-btn" data-id="p${p.id}" onclick="speak('${p.examples[0].de.replace(/'/g, "\\'")}','p${p.id}')">
    ${ICO.speak} Listen
  </button>
  <button class="act-btn" onclick="startPatternPractice({ids:['${p.id}']})" style="color:var(--purple)">
    🧩 Practice
  </button>
</div>
  </div>`;
}

// ─── SAVED / LIBRARY ─────────────────────────
function setLibTab(tab) { V.libTab = tab; render(); }

function renderSaved() {
  const favSents = SENTENCES.filter(s => DB.favorites.has(s.id));
  const learnedSents = SENTENCES.filter(s => DB.learned.has(s.id));
  const tabs = `<div class="lib-tabs">
<button class="lib-tab${V.libTab === 'saved' ? ' on' : ''}" onclick="setLibTab('saved')">⭐ Saved (${favSents.length})</button>
<button class="lib-tab${V.libTab === 'learned' ? ' on' : ''}" onclick="setLibTab('learned')">📗 Learned (${learnedSents.length})</button>
  </div>`;

  // SRS due-for-review section
  const reviewIds = getSrsReviewIds();
  const reviewSents = reviewIds.map(id => SENTENCES.find(s => s.id === id)).filter(Boolean);
  const reviewSection = reviewSents.length ? (() => {
    const ids = JSON.stringify(reviewSents.map(s => s.id)).replace(/"/g, "'");
    return `<div class="review-section">
  <div class="review-section-hdr">
    <div class="review-section-title">🔁 Due for Review <span class="review-count-badge">${reviewSents.length}</span></div>
    <button class="review-practice-btn" onclick="startPractice({ids:${ids},isSRS:true})">Practice Now</button>
  </div>
  <div class="review-section-sub">These sentences are scheduled for review today - spaced repetition in action!</div>
</div>`;
  })() : '';

  if (V.libTab === 'learned') return renderLearnedTab(tabs, learnedSents, reviewSection);
  if (!favSents.length) return `<div style="padding-top:14px"><h2 class="page-title">Library</h2>${tabs}${reviewSection}<div class="empty-state" style="padding-top:40px"><div class="empty-icon">⭐</div>No saved sentences yet.<br><span style="font-size:13px">Tap ⭐ Save on any card.</span></div></div>`;
  const favIds = JSON.stringify(favSents.map(s => s.id)).replace(/"/g, "'");
  return `<div style="padding-top:14px"><h2 class="page-title">Library</h2>${tabs}${reviewSection}
<div class="learned-cta">
  <div class="learned-cta-info">
    <div class="learned-cta-title">⭐ ${favSents.length} saved sentence${favSents.length !== 1 ? 's' : ''}</div>
    <div class="learned-cta-sub">Practice your saved words</div>
  </div>
  <button class="learned-practice-btn" onclick="startPractice({ids:${favIds}})">🎯 Practice All</button>
</div>
${favSents.map((s, i) => renderSentenceCard(s, i, true)).join('')}</div>`;
}

function renderLearnedTab(tabs, learnedSents, reviewSection) {
  if (!learnedSents.length) return `<div style="padding-top:14px"><h2 class="page-title">Library</h2>${tabs}<div class="empty-state" style="padding-top:40px"><div class="empty-icon">📗</div>No learned sentences yet.<br><span style="font-size:13px">Mark sentences ✓ Done to track your progress.</span></div></div>`;

  // SRS due words
  const dueIds = getSrsReviewIds();
  const dueSents = dueIds.map(id => SENTENCES.find(s => s.id === id)).filter(Boolean);

  // Words reviewed today (practiced via SRS today, now scheduled for future)
  const td = todayISO();
  const reviewedTodaySents = learnedSents.filter(s => {
    const srs = DB.srs[s.id];
    return srs && srs.lastReview === td && !dueIds.includes(s.id);
  });

  const dueIdsJson = JSON.stringify(dueSents.map(s => s.id)).replace(/"/g, "'");

  // Due for practice section with individual cards
  const dueSection = dueSents.length ? `
    <div class="review-section">
      <div class="review-section-hdr">
        <div class="review-section-title">🔁 Due for Review <span class="review-count-badge">${dueSents.length}</span></div>
        <button class="review-practice-btn" onclick="startPractice({ids:${dueIdsJson},isSRS:true})">🎯 Practice Due</button>
      </div>
      <div class="review-section-sub">These sentences are scheduled for review today — spaced repetition in action!</div>
    </div>
    ${dueSents.map((s, i) => renderSentenceCard(s, i, true)).join('')}
  ` : `<div style="background:var(--green-bg);border:1px solid var(--green-border);border-radius:14px;padding:18px;margin-bottom:16px;text-align:center">
      <div style="font-size:15px;font-weight:700;color:var(--green)">✅ All caught up!</div>
      <div style="font-size:12px;color:var(--text-3);margin-top:4px">No words due for review right now. Check back later!</div>
    </div>`;

  // Reviewed today section
  const reviewedSection = reviewedTodaySents.length ? `
    <div class="sec-lbl">✅ Reviewed Today (${reviewedTodaySents.length})</div>
    ${reviewedTodaySents.map((s, i) => renderSentenceCard(s, i, true)).join('')}
  ` : '';

  // All learned section
  const allSection = `
    <div class="sec-lbl">📗 All Learned (${learnedSents.length})</div>
    ${learnedSents.map((s, i) => renderSentenceCard(s, i, true)).join('')}
  `;

  return `<div style="padding-top:14px">
<h2 class="page-title">Library</h2>
${tabs}
${dueSection}
${reviewedSection}
${allSection}
  </div>`;
}

// ─── STATS ───────────────────────────────────
function renderStats() {
  const tot = SENTENCES.length, done = DB.learned.size, fav = DB.favorites.size, und = DB.understood.size;
  const pct = tot ? Math.round(done / tot * 100) : 0;
  const lvColors = { A1: '#16A34A', A2: '#D97706', B1: '#2563EB' };
  const byLevel = ['A1', 'A2', 'B1'].map(lv => {
    const lvS = SENTENCES.filter(s => s.lv === lv); const lvD = lvS.filter(s => DB.learned.has(s.id)).length;
    return { lv, done: lvD, tot: lvS.length, pct: lvS.length ? Math.round(lvD / lvS.length * 100) : 0 };
  });
  const histRows = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const cnt = (DB.historyWords[key] || []).filter(id => DB.learned.has(id)).length;
    const label = i === 0 ? 'Today' : i === 1 ? 'Yest' : d.toLocaleDateString('en-DE', { weekday: 'short' });
    histRows.push({ label, cnt, isToday: i === 0 });
  }
  const maxH = Math.max(...histRows.map(r => r.cnt), 1);
  const totalStudyDays = Object.entries(DB.historyWords).filter(([, arr]) => arr.some(id => DB.learned.has(id))).length;
  const reviewDue = getSrsReviewIds().length;
  const srsTotal = Object.keys(DB.srs).length;
  const srsLvl5plus = Object.entries(DB.srs).filter(([id, v]) => DB.learned.has(id) && v.level >= 5).length;

  const barChart = `<div class="hist-chart">
${histRows.map(r => {
    const heightPct = maxH > 0 ? Math.max(Math.round(r.cnt / maxH * 100), r.cnt > 0 ? 8 : 0) : 0;
    const isZero = r.cnt === 0;
    return `<div class="hist-col">
    <div class="hist-bar-wrap">
      <div class="hist-bar-inner${r.isToday ? ' today' : ''}${isZero ? ' zero' : ''}" style="height:${heightPct}%">
        ${r.cnt > 0 ? `<span class="hist-bar-num">${r.cnt}</span>` : ''}
      </div>
    </div>
    <div class="hist-day-lbl${r.isToday ? ' today' : ''}">${r.label}</div>
  </div>`;
  }).join('')}
  </div>`;

  return `<div style="padding-top:14px">
<h2 class="page-title">Statistics</h2>
<p class="page-sub">Your learning progress at a glance</p>
<div class="stats-grid">
  <div class="stat-box"><div class="stat-lbl">Total Learned</div><div class="stat-num" style="color:var(--green)">${done}</div><div class="stat-sub">of ${tot} sentences</div></div>
  <div class="stat-box"><div class="stat-lbl">Completion</div><div class="stat-num" style="color:var(--accent)">${pct}%</div><div class="stat-sub">overall progress</div></div>
  <div class="stat-box"><div class="stat-lbl">Streak</div><div class="stat-num">🔥 ${DB.streak}</div><div class="stat-sub">days in a row</div></div>
  <div class="stat-box"><div class="stat-lbl">Days Studied</div><div class="stat-num" style="color:var(--blue)">${totalStudyDays}</div><div class="stat-sub">total sessions</div></div>
</div>
<div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
  <div class="stat-box"><div class="stat-lbl">Saved</div><div class="stat-num" style="color:var(--amber)">${fav}</div><div class="stat-sub">favorites</div></div>
  <div class="stat-box"><div class="stat-lbl">Patterns</div><div class="stat-num" style="color:var(--purple)">${und}</div><div class="stat-sub">understood</div></div>
  <div class="stat-box"><div class="stat-lbl">Daily Goal</div><div class="stat-num" style="color:var(--blue)">${DB.dailyGoal}</div><div class="stat-sub"><span style="cursor:pointer" onclick="openGoalModal()">✏️ edit</span></div></div>
</div>

<div class="stats-sec-hdr">🔁 Spaced Repetition</div>
<div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:4px">
  <div class="stat-box"><div class="stat-lbl">Due Today</div><div class="stat-num" style="color:${reviewDue > 0 ? 'var(--amber)' : 'var(--green)'}">${reviewDue}</div><div class="stat-sub">for review</div></div>
  <div class="stat-box"><div class="stat-lbl">In SRS</div><div class="stat-num" style="color:var(--blue)">${srsTotal}</div><div class="stat-sub">scheduled</div></div>
  <div class="stat-box"><div class="stat-lbl">Mastered</div><div class="stat-num" style="color:var(--green)">${srsLvl5plus}</div><div class="stat-sub">level 5+</div></div>
</div>

<div class="stats-sec-hdr">📅 Last 7 Days</div>
${barChart}

<div class="stats-sec-hdr">📊 By Level</div>
${byLevel.map(l => `<div class="prog-row">
  <div class="prog-lbl" style="color:${lvColors[l.lv]};font-weight:700">${l.lv}</div>
  <div class="prog-bar"><div class="prog-fill" style="width:${l.pct}%;background:${lvColors[l.lv]}"></div></div>
  <div class="prog-pct" style="color:${lvColors[l.lv]};font-weight:600">${l.pct}%</div>
  <div class="prog-cnt">${l.done}/${l.tot}</div>
</div>`).join('')}

<div class="stats-sec-hdr">💾 Data</div>
<div style="display:flex;gap:8px;margin-bottom:20px">
  <button onclick="exportData()" style="flex:1;background:var(--white);border:1px solid var(--border);border-radius:10px;padding:12px;font-size:13px;font-weight:500;cursor:pointer;color:var(--text-2);font-family:'Inter',sans-serif;transition:all 0.15s" onmouseover="this.style.borderColor='var(--border-strong)'" onmouseout="this.style.borderColor='var(--border)'">📤 Export Backup</button>
  <button onclick="importData()" style="flex:1;background:var(--white);border:1px solid var(--border);border-radius:10px;padding:12px;font-size:13px;font-weight:500;cursor:pointer;color:var(--text-2);font-family:'Inter',sans-serif;transition:all 0.15s" onmouseover="this.style.borderColor='var(--border-strong)'" onmouseout="this.style.borderColor='var(--border)'">📥 Import Backup</button>
</div>
  </div>`;
}

// ══════════════════════════════════════════════
// ACTIONS
// ══════════════════════════════════════════════
function toggleReveal(id) {
  const en = document.getElementById('en-' + id), hn = document.getElementById('hn-' + id), us = document.getElementById('us-' + id), pe = document.getElementById('pe-' + id), vp = document.getElementById('vp-' + id);
  if (!en) return;
  if (en.classList.contains('hid')) {
    en.classList.remove('hid'); if (hn) hn.style.display = 'none'; if (us) us.style.display = 'block'; if (pe) pe.style.display = 'block'; if (vp) vp.style.display = 'block';
    updateStreak();
  } else {
    en.classList.add('hid'); if (hn) hn.style.display = 'block'; if (us) us.style.display = 'none'; if (pe) pe.style.display = 'none'; if (vp) vp.style.display = 'none';
  }
}

function toggleLearned(id) {
  const was = DB.learned.has(id);
  if (was) {
    DB.learned.delete(id); DB.dailyLearned.delete(id); delete DB.srs[id];
    const k = todayKey();
    if (DB.historyWords[k]) {
      DB.historyWords[k] = DB.historyWords[k].filter(x => x !== id);
      if (DB.history[k] > 0) DB.history[k]--;
    }
  }
  else {
    DB.learned.add(id); DB.dailyLearned.add(id); updateStreak();
    const k = todayKey();
    if (!DB.historyWords[k]) DB.historyWords[k] = [];
    if (!DB.historyWords[k].includes(id)) { DB.historyWords[k].push(id); DB.history[k] = (DB.history[k] || 0) + 1; }
    // Initialize SRS tracking — schedule first review in 3 days
    if (!DB.srs[id]) {
      DB.srs[id] = { interval: 3, ease: 2.5, level: 1, nextReview: addDaysISO(3), lastReview: todayISO() };
    }
  }
  save();
  const card = document.getElementById('sc-' + id);
  if (card) {
    card.classList.toggle('lrn', DB.learned.has(id));
    const btn = document.getElementById('lrn-btn-' + id);
    if (btn) { btn.className = DB.learned.has(id) ? 'act-btn is-learned' : 'act-btn'; btn.innerHTML = ICO.check + (DB.learned.has(id) ? ' Learned' : ' Mark done'); }
    const badge = card.querySelector('.lrn-badge');
    if (DB.learned.has(id) && !badge) { const top = card.querySelector('.sc-top'); if (top) { const s = document.createElement('span'); s.className = 'lrn-badge'; s.textContent = '✓ Learned'; top.appendChild(s); } }
    else if (!DB.learned.has(id) && badge) badge.remove();
  }
  updateHeader();
}

function toggleFav(id) {
  DB.favorites.has(id) ? DB.favorites.delete(id) : DB.favorites.add(id); save();
  const card = document.getElementById('sc-' + id);
  if (card) {
    card.classList.toggle('fav', DB.favorites.has(id));
    const btn = document.getElementById('fav-btn-' + id);
    if (btn) { btn.className = DB.favorites.has(id) ? 'act-btn is-fav' : 'act-btn'; btn.innerHTML = ICO.star + (DB.favorites.has(id) ? ' Saved' : ' Save'); }
  }
}

function toggleUnderstood(id) {
  DB.understood.has(id) ? DB.understood.delete(id) : DB.understood.add(id); save();
  const card = document.getElementById('pc-' + id);
  if (card) {
    card.classList.toggle('und', DB.understood.has(id));
    const btn = card.querySelector('.act-btn');
    if (btn) { btn.className = DB.understood.has(id) ? 'act-btn is-learned' : 'act-btn'; btn.innerHTML = ICO.check + (DB.understood.has(id) ? ' Understood ✓' : ' Mark understood'); }
  }
}

function setFilter(f) { V.filter = f; render(); }
function setQuery(q) { V.query = q; clearTimeout(window._qt); window._qt = setTimeout(render, 300); }
function refreshQueue() { DB.dailyQueueDate = null; save(); nav('today'); }

// ─── TTS ─────────────────────────────────────
// ── TTS Engine ──────────────────────────────────────────────────────────────
// Strategy:
//   Mobile  → Web Speech API directly (CORS + async error callbacks kill
//              gesture context before external audio ever plays on iOS/Android)
//   Desktop → external TTS APIs first (natural voice), Web Speech fallback
//   Brave   → external APIs are blocked by Shields; Web Speech fallback fires
//              automatically. On macOS Brave that gives "Anna" (decent);
//              Windows gives Microsoft Hedda/Katja. Users can disable Shields
//              on this page to restore the natural Google voice.

const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
// Brave exposes navigator.brave (an object with .isBrave())
const isBrave = !!(navigator.brave);

let _ttsAudio = null;
let _bestVoice = null;
let _voicesLoaded = false;

// Pick the best available German voice
function pickBestGermanVoice() {
  if (!window.speechSynthesis) return null;
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return null;

  const deVoices = voices.filter(v => v.lang.startsWith('de'));
  if (!deVoices.length) return null;

  const priority = [
    v => /google/i.test(v.name) && /deutsch|german|de/i.test(v.name),
    v => /microsoft.*katja|microsoft.*hedda|microsoft.*stefan/i.test(v.name),
    v => /microsoft/i.test(v.name) && deVoices.includes(v),
    v => /neural|natural|premium|enhanced/i.test(v.name) && deVoices.includes(v),
    v => /anna|german|deutsch/i.test(v.name) && deVoices.includes(v),
    v => deVoices.includes(v),
  ];

  for (const test of priority) {
    const match = deVoices.find(test);
    if (match) return match;
  }
  return deVoices[0];
}

// Pre-load voices; also retry on voiceschanged (Chrome fires it async)
function _initVoices() {
  _bestVoice = pickBestGermanVoice();
  _voicesLoaded = true;
}
if (window.speechSynthesis) {
  speechSynthesis.onvoiceschanged = _initVoices;
  _initVoices(); // synchronous browsers (Firefox, some mobile)
}

// External TTS API cascade (desktop only)
const TTS_ENGINES = [
  (text) => `https://api.streamelements.com/kappa/v2/speech?voice=de-DE-Wavenet-C&text=${encodeURIComponent(text)}`,
  (text) => `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=de&client=gtx`,
];

function speak(text, id) {
  // Toggle off if same sentence is already playing
  if (V.speaking === id) {
    if (_ttsAudio) { _ttsAudio.pause(); _ttsAudio = null; }
    else if (window.speechSynthesis) speechSynthesis.cancel();
    V.speaking = null; updateSpeakBtns(); return;
  }

  // Cancel whatever is playing
  if (_ttsAudio) { _ttsAudio.pause(); _ttsAudio = null; }
  if (window.speechSynthesis) speechSynthesis.cancel();
  V.speaking = id; updateSpeakBtns();

  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    V.speaking = null; updateSpeakBtns(); _ttsAudio = null;
  };

  function speakWithWebSpeech() {
    if (!window.speechSynthesis) { done(); return; }
    // Re-pick voice each time in case voices loaded after page init
    if (!_bestVoice) _bestVoice = pickBestGermanVoice();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE';
    u.rate = 0.82;
    u.pitch = 1;
    u.volume = 1;
    if (_bestVoice) u.voice = _bestVoice;
    u.onend = done;
    u.onerror = done;
    speechSynthesis.speak(u);
  }

  // ── Mobile: go straight to Web Speech ───────────────────────────────────
  // On iOS/Android, async error callbacks from failed Audio() attempts expire
  // the user-gesture context, making both Audio AND SpeechSynthesis silently
  // fail. Calling Web Speech synchronously (still inside the tap handler)
  // keeps the gesture context alive and audio plays correctly.
  if (isMobile) {
    speakWithWebSpeech();
    return;
  }

  // ── Desktop: try external APIs, fall back to Web Speech ─────────────────
  function tryEngine(idx) {
    if (idx >= TTS_ENGINES.length) {
      speakWithWebSpeech();
      return;
    }
    const audio = new Audio();
    _ttsAudio = audio;
    let errored = false;
    audio.onended = done;
    audio.onerror = () => {
      if (errored) return;
      errored = true;
      _ttsAudio = null;
      tryEngine(idx + 1);
    };
    audio.src = TTS_ENGINES[idx](text);
    audio.playbackRate = 0.85;
    audio.play().catch(() => {
      if (errored) return;
      errored = true;
      _ttsAudio = null;
      tryEngine(idx + 1);
    });
  }
  tryEngine(0);
}
function practiceFav(id) {
  DB.favorites.has(id) ? DB.favorites.delete(id) : DB.favorites.add(id);
  save();
  const btn = document.getElementById('prac-fav-' + id);
  if (btn) {
    const on = DB.favorites.has(id);
    btn.className = 'prac-fav-btn' + (on ? ' on' : '');
    btn.title = on ? 'Remove from saved' : 'Save sentence';
  }
}

function updateSpeakBtns() {
  document.querySelectorAll('.speak-btn').forEach(btn => {
    const id = btn.dataset.id;
    if (V.speaking === id) { btn.className = 'act-btn is-playing speak-btn'; btn.innerHTML = ICO.speak + '<span class="pulse"> Playing…</span>'; }
    else { btn.className = 'act-btn speak-btn'; btn.innerHTML = ICO.speak + ' Listen'; }
  });
}

function openGoalModal() {
  document.getElementById('goal-opts').innerHTML = [5, 8, 10, 12, 15, 20, 25, 30].map(v => `<div class="goal-opt${DB.dailyGoal === v ? ' sel' : ''}" onclick="setGoal(${v})">${v}</div>`).join('');
  document.getElementById('goal-modal').style.display = 'flex';
}
function closeGoalModal(e) { if (!e || e.target === document.getElementById('goal-modal')) document.getElementById('goal-modal').style.display = 'none'; render(); }
function setGoal(n) { DB.dailyGoal = n; DB.dailyQueueDate = null; _sessionGotIt = new Set(); save(); document.querySelectorAll('.goal-opt').forEach(el => el.classList.toggle('sel', parseInt(el.textContent) === n)); }

// ==============================
// PRACTICE MODE
// ==============================
let P = { active: false, queue: [], idx: 0, revealed: false, got: 0, again: 0, isSRS: false, dir: 'de2en', dirChoice: true };
let PP = { active: false, queue: [], idx: 0, revealed: false, got: 0, again: 0 };

function startPractice(opts) {
  const ids = Array.isArray(opts) ? opts : opts.ids;
  const isSRS = Array.isArray(opts) ? false : (opts.isSRS || false);
  const skipSessionFilter = Array.isArray(opts) ? false : (opts.skipSessionFilter || false);
  let sents = ids.map(id => SENTENCES.find(s => s.id === id)).filter(Boolean);
  // Filter out cards already mastered ("Got it") in this session
  if (!isSRS && !skipSessionFilter) sents = sents.filter(s => !_sessionGotIt.has(s.id));
  if (!sents.length) {
    // All cards already done in this session
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:var(--green);color:white;padding:10px 20px;border-radius:99px;font-size:13px;font-weight:600;z-index:400;box-shadow:0 4px 12px rgba(0,0,0,0.15)';
    toast.textContent = '✅ All cards mastered this session! Come back tomorrow for reviews.';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
    return;
  }
  P = { active: true, queue: shuffle([...sents]), idx: 0, revealed: false, got: 0, again: 0, isSRS, dir: 'de2en', dirChoice: true };
  renderPractice();
}

function setPracticeDir(dir) {
  P.dir = dir;
  P.dirChoice = false;
  renderPractice();
}

function renderPractice() {
  const existing = document.getElementById('practice-overlay');
  if (existing) existing.remove();
  if (!P.active) return;

  const ov = document.createElement('div');
  ov.id = 'practice-overlay';
  ov.className = 'practice-overlay';

  // ── Direction choice screen ──────────────────
  if (P.dirChoice) {
    const total = P.queue.length;
    ov.innerHTML = `
  <div class="practice-hdr">
    <button class="practice-exit" onclick="closePractice()">Exit</button>
    <div style="font-size:15px;font-weight:700;color:var(--text)">${total} card${total !== 1 ? 's' : ''} ready</div>
    <div style="width:44px"></div>
  </div>
  <div class="practice-body">
    <div class="dir-choice-wrap">
      <div class="dir-choice-title">Choose Practice Mode</div>
      <div class="dir-choice-sub">How do you want to drill these cards?</div>
      <button class="dir-btn primary" onclick="setPracticeDir('de2en')">
        <span class="dir-btn-icon">🇩🇪</span>
        <div>
          <div class="dir-btn-title">German → English</div>
          <div class="dir-btn-sub">See German, recall the translation</div>
        </div>
      </button>
      <button class="dir-btn" onclick="setPracticeDir('en2de')">
        <span class="dir-btn-icon">🇬🇧</span>
        <div>
          <div class="dir-btn-title" style="color:var(--text)">English → German</div>
          <div class="dir-btn-sub" style="color:var(--text-3)">See English, recall the German sentence</div>
        </div>
      </button>
    </div>
  </div>`;
    document.body.appendChild(ov);
    return;
  }

  // ── Completed screen ─────────────────────────
  if (P.idx >= P.queue.length) {
    const total = P.queue.length;
    const pct = total ? Math.round(P.got / total * 100) : 0;
    const emoji = pct >= 80 ? '🎉' : pct >= 50 ? '😊' : '💪';
    const title = pct >= 80 ? 'Excellent work!' : pct >= 50 ? 'Good progress!' : 'Keep practicing!';
    const retryIds = JSON.stringify(P.queue.map(s => s.id)).replace(/"/g, "'");
    const srsMsg = P.isSRS ? `<div style="font-size:12px;color:var(--text-3);margin-bottom:16px">📅 SRS intervals updated - next reviews scheduled.</div>` : '';
    const modeTag = P.dir === 'en2de'
      ? `<div style="font-size:11px;color:var(--blue);background:var(--blue-bg);border:1px solid var(--blue-border);border-radius:99px;display:inline-block;padding:3px 10px;margin-bottom:12px">🇬🇧 English → German mode</div>`
      : `<div style="font-size:11px;color:var(--accent);background:var(--blue-bg);border:1px solid var(--blue-border);border-radius:99px;display:inline-block;padding:3px 10px;margin-bottom:12px">🇩🇪 German → English mode</div>`;
    ov.innerHTML = `
  <div class="practice-hdr"><span style="font-size:16px;font-weight:700;color:var(--text)">Practice Complete</span></div>
  <div class="practice-body">
    <div class="prac-summary">
      <div class="prac-sum-icon">${emoji}</div>
      <div class="prac-sum-title">${title}</div>
      <div class="prac-sum-sub">You reviewed ${total} sentence${total !== 1 ? 's' : ''}</div>
      ${modeTag}
      ${srsMsg}
      <div class="prac-sum-stats">
        <div class="prac-sum-stat"><div class="prac-sum-n" style="color:var(--green)">${P.got}</div><div class="prac-sum-l">Got it</div></div>
        <div class="prac-sum-stat"><div class="prac-sum-n" style="color:var(--amber)">${P.again}</div><div class="prac-sum-l">Still learning</div></div>
      </div>
      <div class="prac-sum-actions">
        <button class="prac-sum-retry" onclick="startPractice({ids:${retryIds},isSRS:${P.isSRS}})">Practice Again</button>
        <button class="prac-sum-done" onclick="closePractice()">Done</button>
      </div>
    </div>
  </div>`;
  } else {
    // ── Active card ──────────────────────────────
    const s = P.queue[P.idx];
    const topic = TOPICS.find(t => t.id === s.t);
    const total = P.queue.length;
    const pct = Math.round(P.idx / total * 100);
    const gram = grammarTag(s.de);
    const safeDE = s.de.replace(/'/g, "\\'");

    const dirLabel = P.dir === 'en2de'
      ? `<span style="font-size:11px;color:var(--blue);background:var(--blue-bg);border:1px solid var(--blue-border);border-radius:99px;padding:2px 9px;font-weight:600">🇬🇧→🇩🇪</span>`
      : `<span style="font-size:11px;color:var(--accent);background:var(--blue-bg);border:1px solid var(--blue-border);border-radius:99px;padding:2px 9px;font-weight:600">🇩🇪→🇬🇧</span>`;

    let cardBody;
    if (P.dir === 'de2en') {
      // Front: German + phonetics. Back: English + usage
      const isFav0 = DB.favorites.has(s.id);
      cardBody = `
    <div class="practice-card">
      <button class="prac-fav-btn${isFav0 ? ' on' : ''}" id="prac-fav-${s.id}" onclick="practiceFav('${s.id}')" title="${isFav0 ? 'Remove from saved' : 'Save sentence'}">⭐</button>
      ${topic ? `<div class="practice-topic-lbl">${topic.emoji} ${topic.name} - <span class="lvl-tag l${s.lv}" style="display:inline">${s.lv}</span>${gram ? ` - <span class="gram-tag" style="color:${gram.c};background:${gram.bg}">${gram.t}</span>` : ''}</div>` : ''}
      <div class="practice-de">${s.de}</div>
      <div class="practice-ph">🔊 ${s.ph}</div>
      ${P.revealed
          ? `<div class="practice-en">${s.en}</div><div class="practice-use">💬 ${s.use}</div>${(() => { const mp = findMatchingPattern(s); return mp ? `<div style="margin-top:8px;padding:10px 12px;background:var(--purple-bg);border:1px solid var(--purple-border);border-radius:8px"><div style="font-size:12px;font-weight:700;color:var(--purple);margin-bottom:4px">🧩 Pattern: ${mp.template}</div><div style="font-size:11px;color:var(--text-2);margin-bottom:6px">${mp.meaning}</div><div style="font-size:11px;color:var(--text-2)">${mp.examples.filter(e => e.de !== s.de).slice(0, 2).map(e => `<div style="padding:2px 0"><strong style="color:var(--text)">${e.de}</strong> — ${e.en}</div>`).join('')}</div></div>` : '' })()}${renderSentenceLearnPanel(s, true, 'pgm-')}`
          : `<div class="practice-reveal-hint" onclick="practiceReveal()">Tap to reveal translation</div>`}
    </div>
    <div style="display:flex;justify-content:center;margin:10px 0">
      <button class="act-btn speak-btn" data-id="prac-${s.id}" onclick="speak('${safeDE}','prac-${s.id}')" style="font-size:13px;padding:8px 18px">
        ${ICO.speak} <span id="prac-speak-lbl">Listen</span>
      </button>
    </div>
    ${P.revealed ? `
      <div class="practice-btns">
        <button class="prac-again-btn" onclick="practiceAnswer(false)">Still learning</button>
        <button class="prac-got-btn" onclick="practiceAnswer(true)">Got it!</button>
      </div>` : ''}
    <div class="kbd-hint" style="margin-top:10px">
      <span class="kbd">Space</span> show/hide &nbsp;
      <span class="kbd">←</span> prev &nbsp;
      <span class="kbd">→</span> next
    </div>`;
    } else {
      // en2de — Front: English. Back: German + phonetics + usage
      const isFav1 = DB.favorites.has(s.id);
      cardBody = `
    <div class="practice-card">
      <button class="prac-fav-btn${isFav1 ? ' on' : ''}" id="prac-fav-${s.id}" onclick="practiceFav('${s.id}')" title="${isFav1 ? 'Remove from saved' : 'Save sentence'}">⭐</button>
      ${topic ? `<div class="practice-topic-lbl">${topic.emoji} ${topic.name} - <span class="lvl-tag l${s.lv}" style="display:inline">${s.lv}</span>${gram ? ` - <span class="gram-tag" style="color:${gram.c};background:${gram.bg}">${gram.t}</span>` : ''}</div>` : ''}
      <div class="practice-de" style="font-size:19px;font-weight:700;color:var(--text);letter-spacing:-0.2px">${s.en}</div>
      ${P.revealed
          ? `<div class="practice-ph" style="margin-bottom:4px">🔊 ${s.ph}</div><div class="practice-en" style="font-size:22px;font-weight:800;color:var(--text);margin-bottom:6px">${s.de}</div><div class="practice-use">💬 ${s.use}</div>${(() => { const mp = findMatchingPattern(s); return mp ? `<div style="margin-top:8px;padding:10px 12px;background:var(--purple-bg);border:1px solid var(--purple-border);border-radius:8px"><div style="font-size:12px;font-weight:700;color:var(--purple);margin-bottom:4px">🧩 Pattern: ${mp.template}</div><div style="font-size:11px;color:var(--text-2);margin-bottom:6px">${mp.meaning}</div><div style="font-size:11px;color:var(--text-2)">${mp.examples.filter(e => e.de !== s.de).slice(0, 2).map(e => `<div style="padding:2px 0"><strong style="color:var(--text)">${e.de}</strong> — ${e.en}</div>`).join('')}</div></div>` : '' })()}${renderSentenceLearnPanel(s, true, 'pgm-')}`
          : `<div class="practice-reveal-hint" onclick="practiceReveal()">Tap to reveal German</div>`}
    </div>
    <div style="display:flex;justify-content:center;margin:10px 0">
      <button class="act-btn speak-btn" data-id="prac-${s.id}" onclick="speak('${safeDE}','prac-${s.id}')" style="font-size:13px;padding:8px 18px">
        ${ICO.speak} <span id="prac-speak-lbl">${P.revealed ? 'Listen' : 'Hint (audio)'}</span>
      </button>
    </div>
    ${P.revealed ? `
      <div class="practice-btns">
        <button class="prac-again-btn" onclick="practiceAnswer(false)">Still learning</button>
        <button class="prac-got-btn" onclick="practiceAnswer(true)">Got it!</button>
      </div>` : ''}
    <div class="kbd-hint" style="margin-top:10px">
      <span class="kbd">Space</span> show/hide &nbsp;
      <span class="kbd">←</span> prev &nbsp;
      <span class="kbd">→</span> next
    </div>`;
    }

    ov.innerHTML = `
  <div class="practice-hdr">
    <button class="practice-exit" onclick="closePractice()">Exit</button>
    <div class="practice-prog-wrap">
      <div class="practice-prog-bar"><div class="practice-prog-fill" style="width:${pct}%"></div></div>
      <div class="practice-prog-lbl">${P.idx + 1}/${total} · ${dirLabel} · Got ${P.got} · Learning ${P.again}</div>
    </div>
  </div>
  <div class="practice-body">
    ${cardBody}
  </div>`;
  }
  document.body.appendChild(ov);

  // Auto-play audio for new card
  if (P.active && P.idx < P.queue.length && !P.revealed && !P.dirChoice) {
    const s = P.queue[P.idx];
    // de2en: always auto-play German. en2de: don't auto-play (would give away answer)
    if (P.dir === 'de2en') {
      if (isMobile) {
        speak(s.de, `prac-${s.id}`);
      } else {
        setTimeout(() => speak(s.de, `prac-${s.id}`), 150);
      }
    }
  }
}

function practiceReveal() {
  P.revealed = !P.revealed;
  renderPractice();
  // Auto-play German audio when revealing in en2de mode
  if (P.revealed && P.dir === 'en2de' && P.idx < P.queue.length) {
    const s = P.queue[P.idx];
    setTimeout(() => speak(s.de, `prac-${s.id}`), 200);
  }
}

function practiceAnswer(got) {
  const currentCard = P.queue[P.idx];

  // Only update SRS for already-learned cards, or when marking a new card as learned.
  // Calling srsSchedule on an unlearned card with got=false would schedule it
  // for a future date via isSrsScheduledFuture, hiding it from the daily queue.
  if (DB.learned.has(currentCard.id) || got) {
    srsSchedule(currentCard.id, got);
  }

  if (got) {
    // ─── GOT IT ───
    // Mark learned, track in session so it won't reappear
    P.got++;
    _sessionGotIt.add(currentCard.id);
    if (!DB.learned.has(currentCard.id)) {
      DB.learned.add(currentCard.id);
      DB.dailyLearned.add(currentCard.id);
      updateStreak();
      const k = todayKey();
      DB.history[k] = (DB.history[k] || 0) + 1;
      if (!DB.historyWords[k]) DB.historyWords[k] = [];
      if (!DB.historyWords[k].includes(currentCard.id)) DB.historyWords[k].push(currentCard.id);
    }
    // Remove any future duplicates of this card from the queue
    const remaining = P.queue.slice(P.idx + 1).filter(s => s.id !== currentCard.id);
    P.queue = [...P.queue.slice(0, P.idx + 1), ...remaining];
  } else {
    // ─── STILL LEARNING ───
    // DO NOT re-insert into the current session queue.
    // The card is now scheduled via SRS for the appropriate future date
    // (tomorrow at minimum). This avoids the frustrating loop of seeing
    // the same card repeatedly in one practice session.
    P.again++;
    // Remove any future duplicates of this card from the queue
    const remaining = P.queue.slice(P.idx + 1).filter(s => s.id !== currentCard.id);
    P.queue = [...P.queue.slice(0, P.idx + 1), ...remaining];
  }
  save();
  P.idx++; P.revealed = false; renderPractice();
  updateHeader();
}

function practiceNext() {
  if (P.idx < P.queue.length) { P.idx++; P.revealed = false; renderPractice(); }
}

function practicePrev() {
  if (P.idx > 0) { P.idx--; P.revealed = false; renderPractice(); }
}

function closePractice() { P.active = false; PP.active = false; const ov = document.getElementById('practice-overlay'); if (ov) ov.remove(); render(); }

// ==============================
// PATTERN PRACTICE MODE
// ==============================
function startPatternPractice(opts) {
  const ids = Array.isArray(opts) ? opts : opts.ids;
  const pats = ids.map(id => PATTERNS.find(p => p.id === id)).filter(Boolean);
  if (!pats.length) return;
  PP = { active: true, queue: shuffle([...pats]), idx: 0, revealed: false, got: 0, again: 0 };
  renderPatternPractice();
}

function renderPatternPractice() {
  const existing = document.getElementById('practice-overlay');
  if (existing) existing.remove();
  if (!PP.active) return;

  const ov = document.createElement('div');
  ov.id = 'practice-overlay';
  ov.className = 'practice-overlay';

  // ── Completed screen ─────────────────────────
  if (PP.idx >= PP.queue.length) {
    const total = PP.queue.length;
    const pct = total ? Math.round(PP.got / total * 100) : 0;
    const emoji = pct >= 80 ? '🎉' : pct >= 50 ? '😊' : '💪';
    const title = pct >= 80 ? 'Pattern master!' : pct >= 50 ? 'Good progress!' : 'Keep practicing!';
    const retryIds = JSON.stringify(PP.queue.map(p => p.id)).replace(/"/g, "'");
    ov.innerHTML = `
  <div class="practice-hdr"><span style="font-size:16px;font-weight:700;color:var(--text)">Pattern Practice Complete</span></div>
  <div class="practice-body">
    <div class="prac-summary">
      <div class="prac-sum-icon">${emoji}</div>
      <div class="prac-sum-title">${title}</div>
      <div class="prac-sum-sub">You reviewed ${total} pattern${total !== 1 ? 's' : ''}</div>
      <div style="font-size:11px;color:var(--purple);background:var(--purple-bg);border:1px solid var(--purple-border);border-radius:99px;display:inline-block;padding:3px 10px;margin-bottom:12px">🧩 Pattern Practice</div>
      <div class="prac-sum-stats">
        <div class="prac-sum-stat"><div class="prac-sum-n" style="color:var(--green)">${PP.got}</div><div class="prac-sum-l">Got it</div></div>
        <div class="prac-sum-stat"><div class="prac-sum-n" style="color:var(--amber)">${PP.again}</div><div class="prac-sum-l">Still learning</div></div>
      </div>
      <div class="prac-sum-actions">
        <button class="prac-sum-retry" style="background:var(--purple)" onclick="startPatternPractice({ids:${retryIds}})">Practice Again</button>
        <button class="prac-sum-done" onclick="closePractice()">Done</button>
      </div>
    </div>
  </div>`;
  } else {
    // ── Active pattern card ──────────────────────
    const p = PP.queue[PP.idx];
    const cat = PAT_CATS.find(c => c.id === p.cat);
    const total = PP.queue.length;
    const pct = Math.round(PP.idx / total * 100);
    const tpl = p.template.replace(/\[([^\]]+)\]/g, '<span class="pat-blank">[$1]</span>');
    const safeDE = p.examples[0].de.replace(/'/g, "\\'");

    ov.innerHTML = `
  <div class="practice-hdr">
    <button class="practice-exit" onclick="closePractice()">Exit</button>
    <div class="practice-prog-wrap">
      <div class="practice-prog-bar"><div class="practice-prog-fill" style="width:${pct}%;background:var(--purple)"></div></div>
      <div class="practice-prog-lbl">${PP.idx + 1}/${total} · <span style="color:var(--purple)">🧩 Patterns</span> · Got ${PP.got} · Learning ${PP.again}</div>
    </div>
  </div>
  <div class="practice-body">
    <div class="practice-card">
      ${cat ? `<div class="practice-topic-lbl">${cat.icon} ${cat.label}</div>` : ''}
      <div style="font-size:14px;color:var(--text-3);margin-bottom:12px;font-style:italic">What German pattern would you use for this situation?</div>
      <div style="font-size:17px;font-weight:600;color:var(--text);line-height:1.4;margin-bottom:10px;padding:14px;background:var(--bg);border-radius:10px;border-left:3px solid var(--purple-border)">${p.meaning}</div>
      ${PP.revealed
        ? `<div style="padding-top:12px;border-top:1px solid var(--border)">
            <div style="font-size:22px;font-weight:800;color:var(--purple);margin-bottom:6px;letter-spacing:-0.3px">${tpl}</div>
            <div style="font-size:13px;color:var(--text-2);margin-bottom:14px">${p.meaning}</div>
            <div style="font-size:12px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:8px">Examples</div>
            <div style="display:flex;flex-direction:column;gap:6px">
              ${p.examples.map((e, ei) => `<div class="pat-ex"><div class="pat-de"><span class="pat-ex-speak" onclick="event.stopPropagation();speak('${e.de.replace(/'/g, "\\'").replace(/"/g, '&quot;')}','ppex-${p.id}-${ei}')" title="Listen">🔊</span> ${e.de}</div><div class="pat-en">${e.en}</div></div>`).join('')}
            </div>
          </div>`
        : `<div class="practice-reveal-hint" onclick="patternPracticeReveal()" style="border-color:var(--purple-border);color:var(--purple)">Tap to reveal the pattern</div>`}
    </div>
    ${PP.revealed ? `
      <div style="display:flex;justify-content:center;margin:10px 0">
        <button class="act-btn speak-btn" data-id="pprac-${p.id}" onclick="speak('${safeDE}','pprac-${p.id}')" style="font-size:13px;padding:8px 18px">
          ${ICO.speak} Listen to example
        </button>
      </div>
      <div class="practice-btns">
        <button class="prac-again-btn" onclick="patternPracticeAnswer(false)">Still learning</button>
        <button class="prac-got-btn" onclick="patternPracticeAnswer(true)">Got it!</button>
      </div>` : ''}
    <div class="kbd-hint" style="margin-top:10px">
      <span class="kbd">Space</span> show/hide &nbsp;
      <span class="kbd">←</span> prev &nbsp;
      <span class="kbd">→</span> next
    </div>
  </div>`;
  }
  document.body.appendChild(ov);
}

function patternPracticeReveal() {
  PP.revealed = !PP.revealed;
  renderPatternPractice();
  // Auto-play the first example when revealing
  if (PP.revealed && PP.idx < PP.queue.length) {
    const p = PP.queue[PP.idx];
    setTimeout(() => speak(p.examples[0].de, `pprac-${p.id}`), 200);
  }
}

function patternPracticeAnswer(got) {
  const p = PP.queue[PP.idx];
  if (got) {
    PP.got++;
    DB.understood.add(p.id);
  } else {
    PP.again++;
    DB.understood.delete(p.id);
  }
  save();
  PP.idx++; PP.revealed = false; renderPatternPractice();
}

function patternPracticeNext() {
  if (PP.idx < PP.queue.length) { PP.idx++; PP.revealed = false; renderPatternPractice(); }
}

function patternPracticePrev() {
  if (PP.idx > 0) { PP.idx--; PP.revealed = false; renderPatternPractice(); }
}

// ─── KEYBOARD SHORTCUTS ───────────────────────
document.addEventListener('keydown', e => {
  // Pattern practice keyboard shortcuts
  if (PP.active) {
    if (e.key === 'Escape') { closePractice(); return; }
    if (PP.idx >= PP.queue.length) return;
    if (e.code === 'Space') { e.preventDefault(); patternPracticeReveal(); return; }
    if (e.code === 'ArrowRight') { e.preventDefault(); patternPracticeNext(); return; }
    if (e.code === 'ArrowLeft') { e.preventDefault(); patternPracticePrev(); return; }
    return;
  }
  // Sentence practice keyboard shortcuts
  if (!P.active) return;
  if (e.key === 'Escape') { closePractice(); return; }
  if (P.idx >= P.queue.length) return;
  if (e.code === 'Space') { e.preventDefault(); practiceReveal(); return; }
  if (e.code === 'ArrowRight') { e.preventDefault(); practiceNext(); return; }
  if (e.code === 'ArrowLeft') { e.preventDefault(); practicePrev(); return; }
});

function exportData() {
  const data = { exportedAt: new Date().toISOString(), ...dbToObj() };
  const json = JSON.stringify(data, null, 2);

  const existing = document.getElementById('dd-modal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'dd-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:300;display:flex;align-items:center;justify-content:center;padding:16px';
  modal.innerHTML = `
<div style="background:#fff;border-radius:16px;padding:22px;width:100%;max-width:500px;max-height:85vh;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 32px rgba(0,0,0,0.2)">
  <div style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:16px;font-weight:700">📤 Export Progress</div>
    <button onclick="document.getElementById('dd-modal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#A8A29E;line-height:1">×</button>
  </div>
  <div style="font-size:13px;color:#57534E">Download as a file <strong>or</strong> copy the JSON text to paste anywhere.</div>
  <textarea id="export-ta" readonly style="flex:1;min-height:160px;font-family:monospace;font-size:11px;border:1px solid #E2DFD9;border-radius:8px;padding:10px;resize:none;color:#1C1917;background:#F4F2EE;outline:none">${json}</textarea>
  <div style="display:flex;gap:8px">
    <button onclick="
      const json = document.getElementById('export-ta').value;
      const blob = new Blob([json],{type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'deutschdaily-backup-${new Date().toISOString().slice(0, 10)}.json';
      a.click(); URL.revokeObjectURL(a.href);
    " style="flex:1;background:#2563EB;color:white;border:none;border-radius:8px;padding:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif">💾 Download File</button>
    <button id="copy-export-btn" onclick="
      const btn = document.getElementById('copy-export-btn');
      navigator.clipboard.writeText(document.getElementById('export-ta').value)
        .then(()=>{ if(btn) btn.textContent='✅ Copied!'; setTimeout(()=>{ const b=document.getElementById('copy-export-btn'); if(b) b.textContent='📋 Copy Text'; },2000); })
        .catch(()=>{ document.getElementById('export-ta').select(); document.execCommand('copy'); if(btn) btn.textContent='✅ Copied!'; setTimeout(()=>{ const b=document.getElementById('copy-export-btn'); if(b) b.textContent='📋 Copy Text'; },2000); });
    " style="flex:1;background:#F4F2EE;border:1px solid #E2DFD9;border-radius:8px;padding:10px;font-size:13px;font-weight:500;cursor:pointer;font-family:Inter,sans-serif">📋 Copy Text</button>
  </div>
</div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function importData() {
  const existing = document.getElementById('dd-modal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'dd-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:300;display:flex;align-items:center;justify-content:center;padding:16px';
  modal.innerHTML = `
<div style="background:#fff;border-radius:16px;padding:22px;width:100%;max-width:500px;max-height:85vh;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 32px rgba(0,0,0,0.2)">
  <div style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:16px;font-weight:700">📥 Import Progress</div>
    <button onclick="document.getElementById('dd-modal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#A8A29E;line-height:1">×</button>
  </div>
  <div style="font-size:13px;color:#57534E">Pick a backup file <strong>or</strong> paste JSON text directly below. Your current progress will be <strong>merged</strong> (not overwritten).</div>
  <textarea id="import-ta" placeholder="Paste your backup JSON here..." style="flex:1;min-height:160px;font-family:monospace;font-size:11px;border:1px solid #E2DFD9;border-radius:8px;padding:10px;resize:none;color:#1C1917;background:#F4F2EE;outline:none"></textarea>
  <div id="import-err" style="font-size:12px;color:#DC2626;display:none"></div>
  <div style="display:flex;gap:8px">
    <button onclick="document.getElementById('dd-file-input').click()" style="flex:1;background:#F4F2EE;border:1px solid #E2DFD9;border-radius:8px;padding:10px;font-size:13px;font-weight:500;cursor:pointer;font-family:Inter,sans-serif">📂 Choose File</button>
    <button onclick="applyImport(document.getElementById('import-ta').value)" style="flex:1;background:#2563EB;color:white;border:none;border-radius:8px;padding:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif">✅ Import</button>
  </div>
  <input id="dd-file-input" type="file" accept=".json,application/json" style="display:none" onchange="
    const file = this.files[0]; if(!file) return;
    const r = new FileReader();
    r.onload = ev => { document.getElementById('import-ta').value = ev.target.result; };
    r.readAsText(file);
  ">
</div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function applyImport(text) {
  const errEl = document.getElementById('import-err');
  const show = msg => { if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; } };
  if (!text.trim()) { show('❌ Nothing to import — paste or load a file first.'); return; }
  let parsed;
  try { parsed = JSON.parse(text); } catch (e) { show('❌ Invalid JSON. Make sure you copied the full text without changes.'); return; }
  if (!Array.isArray(parsed.learned) && !parsed.streak && !parsed.srs) { show('❌ This doesn\'t look like a DeutschDaily backup file.'); return; }
  const merged = {
    learned: [...new Set([...DB.learned, ...(parsed.learned || [])])],
    favorites: [...new Set([...DB.favorites, ...(parsed.favorites || [])])],
    understood: [...new Set([...DB.understood, ...(parsed.understood || [])])],
    streak: Math.max(DB.streak, parsed.streak || 0),
    lastStudy: DB.lastStudy || parsed.lastStudy || null,
    dailyGoal: DB.dailyGoal,
    dailyQueue: DB.dailyQueue,
    dailyQueueDate: DB.dailyQueueDate,
    dailyLearned: [...new Set([...DB.dailyLearned, ...(parsed.dailyLearned || [])])],
    history: Object.assign({}, parsed.history || {}, DB.history),
    historyWords: (() => { const hw = Object.assign({}, parsed.historyWords || {}); Object.entries(DB.historyWords || {}).forEach(([k, arr]) => { hw[k] = [...new Set([...(hw[k] || []), ...arr])]; }); return hw; })(),
    srs: Object.assign({}, parsed.srs || {}, DB.srs),
  };
  objToDB(merged);
  save();
  render();
  document.getElementById('dd-modal').remove();
  // Show success toast
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#16A34A;color:white;padding:10px 20px;border-radius:99px;font-size:13px;font-weight:600;z-index:400;box-shadow:0 4px 12px rgba(0,0,0,0.15)';
  toast.textContent = `✅ Imported! ${merged.learned.length} learned · ${merged.favorites.length} saved`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}




// ─── HISTORY ─────────────────────────────────
function navHistoryDay(dateKey) {
  V.historyDay = dateKey;
  V.view = 'history-day';
  render();
  window.scrollTo(0, 0);
}

function renderHistory() {
  const days = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.now() - i * 86400000);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const wordIds = (DB.historyWords[key] || []).filter(id => DB.learned.has(id));
    const count = wordIds.length;
    const label = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : d.toLocaleDateString('en-DE', { weekday: 'long' });
    const dateStr = d.toLocaleDateString('en-DE', { day: 'numeric', month: 'long' });
    days.push({ key, label, dateStr, count, wordIds, isToday: i === 0, dayIndex: i });
  }

  const rows = days.map(d => {
    const preview = d.wordIds.slice(0, 3).map(id => {
      const s = SENTENCES.find(sx => sx.id === id);
      return s ? s.de : '';
    }).filter(Boolean).join(' · ');
    const isEmpty = d.count === 0;
    const borderCol = d.isToday ? 'var(--blue-border)' : 'var(--border)';
    return `<div onclick="navHistoryDay('${d.key}')" style="background:var(--white);border:1px solid ${borderCol};border-radius:var(--radius-md);padding:16px 18px;margin-bottom:10px;cursor:pointer;transition:all 0.2s;box-shadow:var(--shadow-sm);display:flex;align-items:center;gap:14px" onmouseover="this.style.borderColor='var(--border-strong)';this.style.transform='translateY(-1px)';this.style.boxShadow='var(--shadow-md)'" onmouseout="this.style.borderColor='${borderCol}';this.style.transform='';this.style.boxShadow='var(--shadow-sm)'">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span style="font-size:14px;font-weight:700;color:var(--text)">${d.label}</span>
          <span style="font-size:12px;color:var(--text-3)">${d.dateStr}</span>
          ${d.isToday ? '<span style="font-size:10px;font-weight:700;color:var(--blue);background:var(--blue-bg);border:1px solid var(--blue-border);border-radius:99px;padding:1px 7px">TODAY</span>' : ''}
        </div>
        ${isEmpty
          ? '<div style="font-size:13px;color:var(--text-3);font-style:italic">No words learned</div>'
          : `<div style="font-size:12px;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${preview}${d.count > 3 ? ' …' : ''}</div>`}
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
        ${!isEmpty
          ? `<div style="text-align:center"><div style="font-size:20px;font-weight:700;color:var(--green);line-height:1">${d.count}</div><div style="font-size:10px;color:var(--text-3)">words</div></div>`
          : '<div style="font-size:20px;font-weight:700;color:var(--border);line-height:1">—</div>'}
        <span style="font-size:18px;color:var(--text-3)">›</span>
      </div>
    </div>`;
  });

  const total30 = days.reduce((acc, d) => acc + d.count, 0);
  const activeDays30 = days.filter(d => d.count > 0).length;
  const avgPerDay = activeDays30 > 0 ? Math.round(total30 / activeDays30) : 0;
  const twRows = rows.filter((_, i) => days[i].dayIndex < 7);
  const lwRows = rows.filter((_, i) => days[i].dayIndex >= 7 && days[i].dayIndex < 14);
  const erRows = rows.filter((_, i) => days[i].dayIndex >= 14);
  const twTotal = days.filter(d => d.dayIndex < 7).reduce((a, d) => a + d.count, 0);
  const lwTotal = days.filter(d => d.dayIndex >= 7 && d.dayIndex < 14).reduce((a, d) => a + d.count, 0);
  const erTotal = days.filter(d => d.dayIndex >= 14).reduce((a, d) => a + d.count, 0);
  function secHdr(title, total) {
    return `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:var(--text-3);padding:14px 2px 6px;display:flex;align-items:center;justify-content:space-between"><span>${title}</span><span style="font-size:13px;font-weight:700;color:var(--text-2)">${total} word${total !== 1 ? 's' : ''}</span></div>`;
  }
  const allLearnedIds = [...DB.learned];
  const practiceAllBtn = allLearnedIds.length ? `
    <div style="margin-bottom:20px">
      <button onclick="startPractice({ids:${JSON.stringify(allLearnedIds).replace(/"/g, "'")},skipSessionFilter:true})" style="width:100%;background:linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%);color:white;border:none;border-radius:12px;padding:14px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.2s;box-shadow:0 2px 12px rgba(37,99,235,0.25)" onmouseover="this.style.opacity='.88';this.style.transform='translateY(-1px)'" onmouseout="this.style.opacity='1';this.style.transform=''">🎯 Practice All ${allLearnedIds.length} Learned Words</button>
      <div style="font-size:11px;color:var(--text-3);text-align:center;margin-top:6px">Ignores SRS schedule — review everything you've learned</div>
    </div>
  ` : '';

  return `<div style="padding-top:4px">
    <h2 class="page-title">History</h2>
    <p class="page-sub">Last 30 days — tap a day to review</p>
    ${practiceAllBtn}
    <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      <div style="flex:1;min-width:80px;background:var(--green-bg);border:1px solid var(--green-border);border-radius:var(--radius-md);padding:14px;text-align:center">
        <div style="font-size:26px;font-weight:700;color:var(--green);letter-spacing:-0.5px;font-feature-settings:'tnum'">${total30}</div>
        <div style="font-size:11px;color:var(--text-3);margin-top:3px">Last 30 days</div>
      </div>
      <div style="flex:1;min-width:80px;background:var(--blue-bg);border:1px solid var(--blue-border);border-radius:var(--radius-md);padding:14px;text-align:center">
        <div style="font-size:26px;font-weight:700;color:var(--accent);letter-spacing:-0.5px;font-feature-settings:'tnum'">${activeDays30}</div>
        <div style="font-size:11px;color:var(--text-3);margin-top:3px">Active days</div>
      </div>
      <div style="flex:1;min-width:80px;background:var(--blue-bg);border:1px solid var(--blue-border);border-radius:var(--radius-md);padding:14px;text-align:center">
        <div style="font-size:26px;font-weight:700;color:var(--accent);letter-spacing:-0.5px;font-feature-settings:'tnum'">${avgPerDay}</div>
        <div style="font-size:11px;color:var(--text-3);margin-top:3px">Avg / day</div>
      </div>
      <div style="flex:1;min-width:80px;background:var(--amber-bg);border:1px solid var(--amber-border);border-radius:var(--radius-md);padding:14px;text-align:center">
        <div style="font-size:26px;font-weight:700;color:var(--amber);letter-spacing:-0.5px">🔥${DB.streak}</div>
        <div style="font-size:11px;color:var(--text-3);margin-top:3px">Streak</div>
      </div>
    </div>
    ${secHdr('This Week', twTotal)}
    ${twRows.join('')}
    ${lwRows.length ? secHdr('Last Week', lwTotal) + lwRows.join('') : ''}
    ${erRows.length ? secHdr('Earlier This Month', erTotal) + erRows.join('') : ''}
  </div>`;
}

function renderHistoryDay() {
  const key = V.historyDay;
  if (!key) return renderHistory();
  const wordIds = (DB.historyWords[key] || []).filter(id => DB.learned.has(id));
  const sents = wordIds.map(id => SENTENCES.find(s => s.id === id)).filter(Boolean);

  // Parse key (format: YYYY-M-D) into a Date
  const parts = key.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const todayD = new Date();
  const yesterdayD = new Date(Date.now() - 86400000);
  const isToday = d.toDateString() === todayD.toDateString();
  const isYesterday = d.toDateString() === yesterdayD.toDateString();
  const dayLabel = isToday ? 'Today' : isYesterday ? 'Yesterday' : d.toLocaleDateString('en-DE', { weekday: 'long' });
  const dateStr = d.toLocaleDateString('en-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  const header = `<div style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius-lg);padding:18px 20px;margin-bottom:16px;box-shadow:var(--shadow-sm);position:relative;overflow:hidden">
    <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent),#7C3AED)"></div>
    <div style="font-size:11px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:5px">${dayLabel}</div>
    <div style="font-size:20px;font-weight:700;letter-spacing:-0.3px;margin-bottom:4px">${dateStr}</div>
    <div style="font-size:13px;color:var(--text-3)">${sents.length} word${sents.length !== 1 ? 's' : ''} learned this day</div>
  </div>`;

  if (!sents.length) {
    return `<button class="back-btn" onclick="nav('history')">← History</button>
      ${header}
      <div class="empty-state"><div class="empty-icon">📭</div>No words recorded for this day yet.<br><span style="font-size:13px">Words are tracked from when you mark them as learned.</span></div>`;
  }

  const practiceIdsJson = JSON.stringify(wordIds).replace(/"/g, "'");
  const practiceBtn = `<div style="display:flex;gap:8px;margin-bottom:16px">
    <button onclick="startPractice({ids:${practiceIdsJson}})" style="flex:1;background:var(--accent);color:white;border:none;border-radius:9px;padding:11px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:opacity 0.15s" onmouseover="this.style.opacity='.88'" onmouseout="this.style.opacity='1'">🎯 Practice All ${sents.length} words</button>
  </div>`;

  return `<button class="back-btn" onclick="nav('history')">← History</button>
    ${header}
    ${practiceBtn}
    ${sents.map((s, i) => renderSentenceCard(s, i, true)).join('')}`;
}

load().then(() => { render(); });

// ─── Secret in-place editor (Shift+E) ────────────────────────────────────
// Works in Chrome/Edge via File System Access API.
// On first edit the browser asks you to pick the HTML file once per session.
let _editHandle = null;

async function _acquireHandle() {
  if (_editHandle) return _editHandle;
  try {
    const [h] = await window.showOpenFilePicker({
      types: [{ description: 'HTML file', accept: { 'text/html': ['.html'] } }],
      multiple: false
    });
    _editHandle = h;
    return h;
  } catch { return null; }
}

// Overlay markup (injected once)
const _editorEl = document.createElement('div');
_editorEl.id = '_secret_editor';
_editorEl.style.cssText = `
  display:none; position:fixed; inset:0; z-index:99999;
  background:rgba(0,0,0,.55); align-items:center; justify-content:center;
`;
_editorEl.innerHTML = `
  <div style="background:#1e1e2e;border:1px solid #555;border-radius:10px;
              padding:22px 24px;width:min(92vw,560px);box-shadow:0 8px 40px rgba(0,0,0,.7)">
    <div style="color:#aaa;font-size:12px;letter-spacing:.05em;margin-bottom:8px">EDIT CONTENT (Shift+E)</div>
    <textarea id="_editor_ta" spellcheck="false"
      style="width:100%;min-height:120px;resize:vertical;background:#12121c;color:#e0e0e0;
             border:1px solid #444;border-radius:6px;padding:10px;font-size:15px;
             font-family:inherit;line-height:1.5;box-sizing:border-box"></textarea>
    <div style="display:flex;gap:10px;margin-top:12px;justify-content:flex-end">
      <button id="_editor_cancel"
        style="padding:8px 18px;border-radius:6px;border:1px solid #555;
               background:#2a2a3e;color:#ccc;cursor:pointer;font-size:14px">Cancel</button>
      <button id="_editor_save"
        style="padding:8px 18px;border-radius:6px;border:none;
               background:#5c6bc0;color:#fff;cursor:pointer;font-size:14px;font-weight:600">Save to disk</button>
    </div>
    <div id="_editor_msg" style="color:#f88;font-size:12px;margin-top:8px;min-height:16px"></div>
  </div>`;
document.body.appendChild(_editorEl);

let _pendingRange = null;
let _pendingOrig  = null;

function _closeEditor() {
  _editorEl.style.display = 'none';
  _pendingRange = null;
  _pendingOrig  = null;
}

document.getElementById('_editor_cancel').onclick = _closeEditor;

document.getElementById('_editor_save').onclick = async () => {
  const ta   = document.getElementById('_editor_ta');
  const msg  = document.getElementById('_editor_msg');
  const newText = ta.value;
  if (newText === _pendingOrig) { _closeEditor(); return; }

  // ── Fallback for browsers without File System Access API (Safari, Firefox) ──
  if (!window.showOpenFilePicker) {
    let src = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
    if (!src.includes(_pendingOrig)) {
      msg.textContent = '⚠ Could not locate that text in the source. No change made.';
      return;
    }
    src = src.replace(_pendingOrig, newText);
    if (_pendingRange) {
      const node = document.createTextNode(newText);
      _pendingRange.deleteContents();
      _pendingRange.insertNode(node);
    }
    const blob = new Blob([src], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = location.pathname.split('/').pop() || 'DEDaily.html';
    a.click();
    URL.revokeObjectURL(url);
    msg.textContent = '✓ Downloaded — replace your original file with this one.';
    setTimeout(_closeEditor, 2000);
    return;
  }

  msg.textContent = 'Acquiring file handle…';
  const handle = await _acquireHandle();
  if (!handle) { msg.textContent = 'File not selected — cancelled.'; return; }

  msg.textContent = 'Reading file…';
  const file = await handle.getFile();
  let src = await file.text();

  if (!src.includes(_pendingOrig)) {
    msg.textContent = '⚠ Could not locate that exact text in the source. No change made.';
    return;
  }

  // Replace only first occurrence (the one the user selected)
  src = src.replace(_pendingOrig, newText);

  msg.textContent = 'Writing to disk…';
  try {
    const writable = await handle.createWritable();
    await writable.write(src);
    await writable.close();
  } catch (err) {
    msg.textContent = '⚠ Write failed: ' + err.message;
    return;
  }

  // Live DOM update — replace text in the selected range
  if (_pendingRange) {
    const node = document.createTextNode(newText);
    _pendingRange.deleteContents();
    _pendingRange.insertNode(node);
  }

  msg.textContent = '✓ Saved!';
  setTimeout(_closeEditor, 800);
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { _closeEditor(); return; }
  if (!(e.shiftKey && e.key === 'E')) return;

  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.toString().trim()) return;

  e.preventDefault();
  _pendingOrig  = sel.toString();
  _pendingRange = sel.getRangeAt(0).cloneRange();

  const ta  = document.getElementById('_editor_ta');
  const msg = document.getElementById('_editor_msg');
  ta.value          = _pendingOrig;
  msg.textContent   = '';
  _editorEl.style.display = 'flex';
  ta.focus();
  ta.select();
});
// ─────────────────────────────────────────────────────────────────────────
