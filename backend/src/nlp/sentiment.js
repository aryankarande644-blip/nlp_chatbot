import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let lexiconData = { positive: {}, negative: {}, intensifiers: [], diminishers: [], negators: [] };
try {
  lexiconData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'sentiment_lexicon.json'), 'utf8'));
} catch (e) {}

const NEGATORS = new Set(lexiconData.negators || ['not', 'never', 'no', "n't"]);
const INTENSIFIERS = new Set(lexiconData.intensifiers || ['very', 'really', 'extremely']);
const DIMINISHERS = new Set(lexiconData.diminishers || ['slightly', 'barely', 'kind of']);

export function analyzeSentiment(text) {
  if (!text) return { label: 'neutral', score: 0, hits: [] };
  const tokens = text.toLowerCase().match(/[a-z']+|:\)|:\(|:-\)|:-\(|:D|D:|<3/g) || [];
  let sum = 0;
  let sumSq = 0;
  const hits = [];
  let exclamationBoost = 0;
  const exclamCount = Math.min((text.match(/!/g) || []).length, 3);
  exclamationBoost = exclamCount * 0.1;
  
  for (let i = 0; i < tokens.length; i++) {
    let tok = tokens[i];
    let score = 0;
    if (lexiconData.positive[tok]) score = lexiconData.positive[tok];
    else if (lexiconData.negative[tok]) score = lexiconData.negative[tok];
    if (score === 0) continue;
    
    // check negation in previous 3
    let negated = false;
    for (let j = Math.max(0, i - 3); j < i; j++) {
      const prev = tokens[j].replace(/n't$/, ' not').split(/\s/)[0];
      if (NEGATORS.has(prev) || tokens[j].endsWith("n't")) { negated = true; break; }
    }
    if (negated) {
      score = score * -0.74;
    }
    
    // intensifier/diminisher
    for (let j = Math.max(0, i - 2); j < i; j++) {
      if (INTENSIFIERS.has(tokens[j])) score = score * 1.4;
      if (DIMINISHERS.has(tokens[j])) score = score * 0.6;
    }
    
    // caps boost
    const origTok = text.match(new RegExp('\\b' + tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'));
    if (origTok && origTok[0] === origTok[0].toUpperCase() && origTok[0].length > 2) {
      if (score > 0) score += 0.2;
      else score -= 0.2;
    }
    
    sum += score;
    sumSq += score * score;
    hits.push({ word: tok, score });
  }
  sum += exclamationBoost * (sum > 0 ? 1 : sum < 0 ? -1 : 0);
  
  let s = sum / Math.sqrt(sumSq + 15);
  if (s > 1) s = 1;
  if (s < -1) s = -1;
  
  let label = 'neutral';
  if (s >= 0.05) label = 'positive';
  else if (s <= -0.05) label = 'negative';
  
  return { label, score: s, hits };
}
