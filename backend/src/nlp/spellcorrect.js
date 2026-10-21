import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { distance } from './editDistance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let vocabulary = new Set();
let vocabFreq = new Map();

export function buildVocabulary(intents, knowledge, englishWordsPath) {
  vocabulary.clear();
  vocabFreq.clear();
  
  // from intents
  if (intents && intents.intents) {
    for (let intent of intents.intents) {
      for (let p of intent.patterns || []) {
        const words = p.toLowerCase().match(/[a-z]+/g) || [];
        for (let w of words) {
          vocabulary.add(w);
          vocabFreq.set(w, (vocabFreq.get(w) || 0) + 1);
        }
      }
    }
  }
  // from knowledge
  if (knowledge) {
    for (let k of knowledge) {
      for (let q of k.questions || []) {
        const words = q.toLowerCase().match(/[a-z]+/g) || [];
        for (let w of words) {
          vocabulary.add(w);
          vocabFreq.set(w, (vocabFreq.get(w) || 0) + 1);
        }
      }
    }
  }
  // from english words file
  if (englishWordsPath && fs.existsSync(englishWordsPath)) {
    const content = fs.readFileSync(englishWordsPath, 'utf8');
    const words = content.split(/\n|\r/).filter(w => w.trim().length > 0);
    for (let w of words) {
      const lw = w.trim().toLowerCase();
      if (lw) {
        vocabulary.add(lw);
        if (!vocabFreq.has(lw)) vocabFreq.set(lw, 1);
      }
    }
  }
}

export function correctSpelling(tokens, context = {}) {
  const corrections = [];
  const correctedTokens = [];
  
  // Don't correct if in name pattern context
  const inNamePattern = context.inNamePattern || false;
  
  for (let i = 0; i < tokens.length; i++) {
    let tok = tokens[i];
    const lower = tok.toLowerCase();
    
    // Skip if number, email, url
    if (/^\d+$/.test(tok) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tok) || /^https?:\/\//.test(tok)) {
      correctedTokens.push(tok);
      continue;
    }
    // Skip entity-like capitalized (if original had capital and not start of sentence in some cases)
    if (inNamePattern && i > 0) {
      correctedTokens.push(tok);
      continue;
    }
    if (vocabulary.has(lower)) {
      correctedTokens.push(tok);
      continue;
    }
    if (lower.length < 4) {
      correctedTokens.push(tok);
      continue;
    }
    
    // Find candidates
    let bestCand = null;
    let bestDist = Infinity;
    let bestFreq = -1;
    
    const maxDist = lower.length >= 8 ? 2 : 1;
    for (let cand of vocabulary) {
      if (Math.abs(cand.length - lower.length) > maxDist) continue;
      const d = distance(lower, cand, maxDist);
      if (d <= maxDist) {
        if (d < bestDist || (d === bestDist && (vocabFreq.get(cand) || 0) > bestFreq)) {
          bestDist = d;
          bestCand = cand;
          bestFreq = vocabFreq.get(cand) || 0;
        }
      }
    }
    
    if (bestCand && bestDist <= maxDist) {
      corrections.push({ from: tok, to: bestCand });
      correctedTokens.push(bestCand);
    } else {
      correctedTokens.push(tok);
    }
  }
  
  return { tokens: correctedTokens, corrections };
}
