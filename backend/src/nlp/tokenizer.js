import { STOPWORDS } from './stopwords.js';
import { LEMMA_DICT } from './lemmaDict.js';
import { stem } from './stemmer.js';

const CONTRACTIONS = {
  "what's": "what is",
  "i'm": "i am",
  "don't": "do not",
  "doesn't": "does not",
  "didn't": "did not",
  "can't": "cannot",
  "won't": "will not",
  "isn't": "is not",
  "aren't": "are not",
  "wasn't": "was not",
  "weren't": "were not",
  "haven't": "have not",
  "hasn't": "has not",
  "hadn't": "had not",
  "shouldn't": "should not",
  "wouldn't": "would not",
  "couldn't": "could not",
  "i've": "i have",
  "you've": "you have",
  "we've": "we have",
  "they've": "they have",
  "i'd": "i would",
  "you'd": "you would",
  "he'd": "he would",
  "she'd": "she would",
  "we'd": "we would",
  "they'd": "they would",
  "i'll": "i will",
  "you'll": "you will",
  "he'll": "he will",
  "she'll": "she will",
  "we'll": "we will",
  "they'll": "they will",
  "'re": " are",
  "'ll": " will",
  "'ve": " have",
  "n't": " not"
};

const SLANG = {
  'u': 'you',
  'r': 'are',
  'ur': 'your',
  'pls': 'please',
  'thx': 'thanks',
  'ty': 'thank you',
  'idk': 'i do not know',
  'wanna': 'want to',
  'gonna': 'going to',
  'gotta': 'got to',
  'lol': 'lol',
  'omg': 'omg'
};

export function normalize(text) {
  if (!text) return '';
  let t = text.normalize('NFKC');
  t = t.toLowerCase();
  t = t.trim();
  t = t.replace(/\s+/g, ' ');
  
  // expand contractions
  for (let k in CONTRACTIONS) {
    const re = new RegExp(k.replace(/'/g, "\\'"), 'g');
    t = t.replace(re, CONTRACTIONS[k]);
  }
  
  // collapse repeated chars 3+ to 2
  t = t.replace(/(.)\1{2,}/g, '$1$1');
  
  // slang
  const tokens = t.split(/\s+/);
  const expanded = tokens.map(tok => {
    // strip punctuation for lookup
    const clean = tok.replace(/[^\w']/g, '');
    if (SLANG[clean]) return SLANG[clean];
    return tok;
  });
  t = expanded.join(' ');
  
  return t;
}

export function tokenize(text) {
  if (!text) return { tokens: [], wordsOnly: [] };
  // Keep numbers, emails, urls, emoji basic as tokens
  const tokenRegex = /[A-Za-z0-9]+(?:['][A-Za-z0-9]+)?|[^\s]+/g;
  const raw = text.match(tokenRegex) || [];
  const tokens = raw.filter(t => t.trim() !== '');
  const wordsOnly = tokens.filter(t => /^[A-Za-z0-9][A-Za-z0-9']*$/.test(t));
  return { tokens, wordsOnly, raw: tokens };
}

export function lemmatize(word) {
  const w = word.toLowerCase();
  if (LEMMA_DICT.has(w)) return LEMMA_DICT.get(w);
  return w;
}

export function getKeywords(tokens) {
  return tokens.filter(t => {
    const w = t.toLowerCase().replace(/[^\w]/g, '');
    return w.length > 0 && !STOPWORDS.has(w);
  }).map(t => t.toLowerCase().replace(/[^\w]/g, ''));
}

export function processText(text) {
  const normalized = normalize(text);
  const { tokens, wordsOnly } = tokenize(normalized);
  const corrected = { tokens: wordsOnly, corrections: [] }; // filled by spellcorrect
  const lemmas = wordsOnly.map(w => lemmatize(w));
  const stems = lemmas.map(w => stem(w));
  const keywords = getKeywords(wordsOnly);
  return { normalized, tokens: wordsOnly, lemmas, stems, keywords, corrections: [] };
}
