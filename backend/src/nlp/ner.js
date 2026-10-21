import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let gazetteer = { cities: [], countries: [] };
try {
  gazetteer = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'gazetteer.json'), 'utf8'));
} catch (e) {}

const STOPLIST = new Set(['fine', 'good', 'tired', 'happy', 'sad', 'ok', 'okay', 'sure', 'nothing', 'why', 'yes', 'no', 'none']);

function titleCase(s) {
  return s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

// Connector words that terminate a multi-token name.
const NAME_CONNECTORS = new Set(['and', 'or', 'but', 'i', 'my', 'you', 'we', 'he', 'she', 'they', 'live', 'am', 'is', 'are', 'the']);

// Filler words that may precede a bare name answer (e.g. "its aaryan", "call me bob").
const NAME_FILLERS = [
  "you can call me", "they call me", "everyone calls me", "people call me",
  "my name is", "my name's", "name's", "call me", "this is",
  "it is", "it's", "its", "i am", "im", "i'm", "just"
];

// Common words that must never be treated as a name when a bare reply is received.
const NON_NAME_WORDS = new Set([
  'yes', 'no', 'nothing', 'why', 'none', 'maybe', 'sure', 'ok', 'okay',
  'fine', 'good', 'bad', 'tired', 'happy', 'sad', 'thanks', 'thank', 'hello',
  'hi', 'hey', 'what', 'who', 'how', 'when', 'where', 'the', 'a', 'an',
  'pm', 'am', 'time', 'date', 'here', 'there', 'this', 'that', 'stop', 'go',
  'yes', 'nope', 'nah', 'nobody', 'unknown', 'none'
]);

/**
 * Strip leading filler phrases and return the remaining candidate name,
 * or null if the remainder is not a plausible 1-3 token name.
 */
export function parseBareName(text) {
  if (!text) return null;
  let s = text.trim().toLowerCase();
  s = s.replace(/[!.?,]+$/g, '');
  // remove leading fillers (longest first)
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of NAME_FILLERS) {
      if (s === f) return null;
      if (s.startsWith(f + ' ')) {
        s = s.slice(f.length).trim();
        changed = true;
      }
    }
  }
  if (!s) return null;
  const tokens = s.split(/\s+/);
  if (tokens.length < 1 || tokens.length > 3) return null;
  for (const tok of tokens) {
    if (!/^[a-z]+$/.test(tok)) return null;      // letters only
    if (NON_NAME_WORDS.has(tok)) return null;     // not a common word
    if (tok.length < 2) return null;
  }
  return titleCase(tokens.join(' '));
}

export function extractEntities(text, normalized) {
  const entities = [];
  const t = normalized || text.toLowerCase();
  const orig = text;
  
  // NAME PATTERNS
  const namePatterns = [
    /my name is ([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
    /i am ([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
    /call me ([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
    /this is ([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
    /name's ([a-zA-Z]+)/i,
    /i'm ([a-zA-Z]+)/i,
    /it's ([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
    /its ([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
    /im ([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
    /you can call me ([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
    /they call me ([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
    /everyone calls me ([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
    /people call me ([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i
  ];
  for (let pat of namePatterns) {
    const m = orig.match(pat);
    if (m && m[1]) {
      let name = m[1].trim();
      let parts = name.split(/\s+/);
      // Trim trailing connector/common tokens so we don't swallow the next clause
      // e.g. "my name is priya and i live in pune" -> "priya"
      while (parts.length > 1 && (NON_NAME_WORDS.has(parts[parts.length - 1].toLowerCase()) || NAME_CONNECTORS.has(parts[parts.length - 1].toLowerCase()))) {
        parts.pop();
      }
      if (parts.length > 2) parts = parts.slice(0, 2);
      name = parts.join(' ');
      // exclude stoplist
      const first = parts[0].toLowerCase();
      if (parts.length > 0 && !STOPLIST.has(first)) {
        const prefixLen = m[0].length - m[1].length; // chars before captured group
        const end = m.index + prefixLen + name.length;
        entities.push({ text: titleCase(name), label: 'PERSON', start: m.index, end });
      }
    }
  }
  
  // LOCATION - longest match first
  const allLoc = [...(gazetteer.cities || []), ...(gazetteer.countries || [])].sort((a, b) => b.length - a.length);
  for (let loc of allLoc) {
    const re = new RegExp('\\b' + loc.replace(/\s+/g, '\\s+') + '\\b', 'i');
    const m = orig.match(re);
    if (m) {
      entities.push({ text: titleCase(loc), label: 'LOCATION', start: m.index, end: m.index + m[0].length });
    }
  }
  
  // DATE
  const datePatterns = [
    /\b(today|tomorrow|yesterday)\b/i,
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)(\s+\d{1,2})?(\s+\d{4})?\b/i,
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/,
    /\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/,
    /\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    /\bin\s+\d+\s+days?\b/i
  ];
  for (let pat of datePatterns) {
    const m = orig.match(pat);
    if (m) {
      entities.push({ text: m[0], label: 'DATE', start: m.index, end: m.index + m[0].length });
    }
  }
  
  // TIME
  const timePatterns = [
    /\b\d{1,2}:\d{2}\s*(am|pm)?\b/i,
    /\b\d{1,2}\s*(am|pm)\b/i,
    /\b(noon|midnight)\b/i,
    /\b17:\d{2}\b/
  ];
  for (let pat of timePatterns) {
    const m = orig.match(pat);
    if (m) {
      entities.push({ text: m[0], label: 'TIME', start: m.index, end: m.index + m[0].length });
    }
  }
  
  // NUMBER
  const numPattern = /\b\d+(\.\d+)?\b/g;
  let nm;
  while ((nm = numPattern.exec(orig)) !== null) {
    entities.push({ text: nm[0], label: 'NUMBER', start: nm.index, end: nm.index + nm[0].length, value: parseFloat(nm[0]) });
  }
  // number words simple
  const numWords = /\b(twelve|thirteen|fourteen|fifteen|twenty|thirty|forty|fifty|hundred|thousand)\b/gi;
  let nwm;
  while ((nwm = numWords.exec(orig)) !== null) {
    entities.push({ text: nwm[0], label: 'NUMBER', start: nwm.index, end: nwm.index + nwm[0].length });
  }
  
  // EMAIL, URL
  const emailRe = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
  let em;
  while ((em = emailRe.exec(orig)) !== null) {
    entities.push({ text: em[0], label: 'EMAIL', start: em.index, end: em.index + em[0].length });
  }
  const urlRe = /https?:\/\/[^\s]+/g;
  let ur;
  while ((ur = urlRe.exec(orig)) !== null) {
    entities.push({ text: ur[0], label: 'URL', start: ur.index, end: ur.index + ur[0].length });
  }
  
  // Remove overlaps - prefer longest span
  // simple resolution
  const resolved = [];
  entities.sort((a, b) => (b.end - b.start) - (a.end - a.start) || 0);
  for (let ent of entities) {
    let overlaps = false;
    for (let r of resolved) {
      if (!(ent.end <= r.start || ent.start >= r.end)) {
        overlaps = true;
        break;
      }
    }
    if (!overlaps) {
      resolved.push(ent);
    }
  }
  resolved.sort((a, b) => a.start - b.start);
  return resolved;
}
