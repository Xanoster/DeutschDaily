const SCENARIO_BY_TOPIC = {
  understand: {
    speaker: 'You',
    listener: 'office staff, doctor, support agent, or another adult',
    place: 'counter, phone call, appointment, or document situation',
    purpose: 'slow the conversation down and recover meaning'
  },
  appointments: {
    speaker: 'You',
    listener: 'reception, office staff, practice, or service desk',
    place: 'phone, email, reception, or online appointment flow',
    purpose: 'book, move, confirm, or clarify an appointment'
  },
  admin: {
    speaker: 'You',
    listener: 'authority, bank, insurance, employer, or official office',
    place: 'form, letter, counter, email, or phone call',
    purpose: 'understand requirements, documents, deadlines, and next steps'
  },
  housing: {
    speaker: 'You',
    listener: 'landlord, Hausverwaltung, caretaker, neighbor, or locksmith',
    place: 'apartment, building, email, phone, or doorstep',
    purpose: 'report problems, arrange repairs, or handle housing paperwork'
  },
  health: {
    speaker: 'You',
    listener: 'doctor, receptionist, pharmacist, or emergency staff',
    place: 'practice, pharmacy, phone, or emergency setting',
    purpose: 'describe symptoms, insurance, medicine, and urgency clearly'
  },
  phone: {
    speaker: 'You',
    listener: 'customer support, IT support, bank, or provider',
    place: 'phone call, app, support chat, or email',
    purpose: 'identify the issue and get a callback, reset, or written answer'
  },
  work: {
    speaker: 'You',
    listener: 'manager, HR, colleague, client, or teacher',
    place: 'work chat, email, meeting, or phone call',
    purpose: 'coordinate tasks, deadlines, absences, and expectations'
  },
  transport: {
    speaker: 'You',
    listener: 'transport staff, another passenger, or service desk',
    place: 'station, bus stop, train, counter, or app',
    purpose: 'confirm route, ticket, delay, platform, or replacement transport'
  },
  services: {
    speaker: 'You',
    listener: 'shop staff, post office, DHL shop, delivery service, or customer service',
    place: 'shop, parcel shop, counter, support chat, or phone',
    purpose: 'pick up, return, pay, find, or solve a service issue'
  },
  money: {
    speaker: 'You',
    listener: 'bank, company, insurance, landlord, or customer support',
    place: 'bank branch, app, phone, email, or contract conversation',
    purpose: 'handle payments, cards, accounts, bills, and direct debit'
  },
  social: {
    speaker: 'You',
    listener: 'neighbor, acquaintance, colleague, friend, or local group',
    place: 'building, street, chat, invitation, or casual meeting',
    purpose: 'introduce yourself, plan politely, decline, or coordinate'
  },
  emergency: {
    speaker: 'You',
    listener: 'bystander, emergency operator, police, medical staff, or service staff',
    place: 'street, home, station, hospital, or emergency call',
    purpose: 'state the urgent problem with as few words as possible'
  }
};

const EXPECTED_REPLY_BY_TOPIC = {
  understand: 'You may hear a slower repeat, a written word, a spelling, or a simpler explanation.',
  appointments: 'You may hear a date, time, waiting-list option, confirmation method, or “leider kein Termin frei”.',
  admin: 'You may hear a document list, deadline, reference number, portal instruction, or “Das müssen Sie nachreichen”.',
  housing: 'You may hear a repair date, Hausmeister contact, request for photos, or a note about the Hausordnung.',
  health: 'You may hear questions like Seit wann?, Welche Beschwerden?, Haben Sie Fieber?, or Haben Sie Ihre Karte dabei?',
  phone: 'You may hear a request for Kundennummer, email, birth date, reset code, or a promise to call back.',
  work: 'You may hear a deadline, priority decision, “passt”, “kein Problem”, or a request for a short update.',
  transport: 'You may hear a platform, line number, replacement bus, delay, ticket rule, or alternative connection.',
  services: 'You may hear a request for ID, receipt, order number, return label, payment method, or pickup code.',
  money: 'You may hear an IBAN, due date, card-blocking confirmation, fee, or direct-debit instruction.',
  social: 'You may hear “gerne”, “leider nicht”, a suggested time, or a casual follow-up question.',
  emergency: 'You may hear short questions: Wo sind Sie?, Was ist passiert?, Ist jemand verletzt?, Bleiben Sie am Telefon.'
};

const PRACTICE_BY_TOPIC = {
  understand: 'Say the sentence aloud, then repeat the key word you need clarified.',
  appointments: 'Say the sentence aloud with a real day and time, then answer one likely follow-up.',
  admin: 'Say it with one real document or deadline from your life, then ask for the next step.',
  housing: 'Say the problem, add since when it started, then ask for a concrete next action.',
  health: 'Say the symptom, add duration, then ask one medicine or appointment question.',
  phone: 'Say the opener, then add your Kundennummer, email, or callback request.',
  work: 'Say it once formally and once in a shorter chat style if the situation allows it.',
  transport: 'Say it with a real place, line, platform, or ticket type near you.',
  services: 'Say it as a counter request, then add the document, code, receipt, or item.',
  money: 'Say it with the exact payment/card/bill situation, then ask for confirmation in writing.',
  social: 'Say it in a natural voice, then make a warmer informal version for a neighbor or friend.',
  emergency: 'Say it clearly and slowly, then add your location.'
};

function informalize(text) {
  return text
    .replace(/Könnten Sie/g, 'Kannst du')
    .replace(/Können Sie/g, 'Kannst du')
    .replace(/Haben Sie/g, 'Hast du')
    .replace(/Sagen Sie/g, 'Sag')
    .replace(/brauchen Sie/g, 'brauchst du')
    .replace(/Brauchen Sie/g, 'Brauchst du')
    .replace(/Ihnen/g, 'dir')
    .replace(/Ihre/g, 'deine')
    .replace(/Ihren/g, 'deinen')
    .replace(/Ihrem/g, 'deinem')
    .replace(/Sie/g, 'du');
}

function defaultVariantsFor(seed) {
  if (Array.isArray(seed.variants)) return seed.variants;
  if (!seed.variant) return [];

  const variants = [{ label: 'Formal', de: seed.de, use: 'Use with offices, doctors, service staff, landlords, or unknown adults.' }];
  const informal = informalize(seed.de);
  const hasFormalLeftovers = /\b(Sie|Ihnen|Ihr|Ihre|Ihren|Ihrem)\b/.test(informal);
  if (informal !== seed.de && !hasFormalLeftovers) {
    variants.push({ label: 'Informal', de: informal, use: 'Use with friends, close colleagues, or people who already use du with you.' });
  }
  return variants;
}

function fixedGrammarFor(seed) {
  if (/^Mir ist\b/.test(seed.de)) return 'Mir is dative and is used for body-state feelings: Mir ist schwindelig, kalt, schlecht.';
  if (/^Wo\b|^Wann\b|^Wie\b|^Wer\b|^Was\b/.test(seed.de)) return 'This is a W-question. The question word comes first and the verb comes in position two.';
  if (/^Kann ich\b|^Muss ich\b|^Darf ich\b|^Soll ich\b/.test(seed.de)) return 'This is a yes/no modal question. The modal verb comes first; the action verb usually goes to the end.';
  if (/\bhabe\b.*\bge[a-zäöüß]+(t|en)\b/i.test(seed.de)) return 'This is Perfekt for a completed action: habe + past participle. It is common in spoken German.';
  if (/\bist\b|\bsind\b|\bbin\b/.test(seed.de)) return 'This sentence uses sein for state, identity, condition, or location. Keep the verb in position two.';
  return 'Learn this as a fixed daily-life sentence first, then reuse the replaceable words shown below.';
}

function chunksFor(seed, pattern) {
  if (Array.isArray(seed.chunks)) return seed.chunks;
  if (pattern) return [[pattern.template, pattern.meaning], [seed.de, seed.en]];
  return [[seed.de, seed.en], [seed.use, 'situation and purpose']];
}

function swapsFor(seed, pattern) {
  if (Array.isArray(seed.swaps)) return seed.swaps;
  if (pattern && Array.isArray(pattern.slots)) {
    return pattern.slots.flatMap(slot => slot.examples.map(ex => [slot.name, ex]));
  }
  const topic = SCENARIO_BY_TOPIC[seed.t];
  return [
    ['situation', topic ? topic.place : 'the real situation'],
    ['detail', 'time, place, document, person, amount, or problem']
  ];
}

function practiceFor(seed, pattern) {
  if (seed.practice) return seed.practice;
  if (seed.mode === 'recognition') {
    return `Recognize this phrase when you hear or read it, then answer with: ${seed.expectedReply || 'the key detail they asked for'}.`;
  }
  const swaps = swapsFor(seed, pattern);
  if (swaps.length && pattern) {
    return `Replace "${swaps[0][1]}" with one real detail from your life and say the full sentence aloud.`;
  }
  return PRACTICE_BY_TOPIC[seed.t] || 'Say the sentence aloud, then change one detail and say it again.';
}

function buildLearn(seed) {
  const pattern = (seed.patternIds || []).map(id => PATTERN_BY_ID[id]).find(Boolean);
  const baseScenario = SCENARIO_BY_TOPIC[seed.t] || null;
  const scenario = seed.scenario || (seed.mode === 'recognition' && baseScenario
    ? { ...baseScenario, speaker: baseScenario.listener, listener: 'you' }
    : baseScenario);
  const variants = defaultVariantsFor(seed);
  const grammar = seed.learnGrammar || (pattern ? pattern.grammar : fixedGrammarFor(seed));
  return {
    mode: seed.mode || 'production',
    scenario,
    meaning: seed.learnMeaning || seed.use,
    grammar: {
      title: seed.learnTitle || (pattern ? pattern.template : 'Fixed daily-life phrase'),
      simple: grammar,
      chunks: chunksFor(seed, pattern),
      watchOut: seed.watchOut || (pattern ? pattern.watchOut : 'Use this in the situation shown; fixed phrases are useful, but do not overgeneralize them.')
    },
    variants,
    reuse: {
      slots: seed.slots || (pattern && pattern.slots ? pattern.slots.map(slot => slot.name) : ['detail']),
      swaps: swapsFor(seed, pattern)
    },
    expectedReply: seed.expectedReply || EXPECTED_REPLY_BY_TOPIC[seed.t] || 'Listen for the key detail: time, place, document, price, or next step.',
    practice: practiceFor(seed, pattern)
  };
}

const SENTENCES = SENTENCE_SEEDS.map(seed => ({ ...seed, learn: buildLearn(seed) }));
