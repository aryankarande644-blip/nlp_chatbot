// Porter stemmer (1980) implementation from scratch
function isVowel(c, i, word) {
  if (c === 'a' || c === 'e' || c === 'i' || c === 'o' || c === 'u') return true;
  if (c === 'y') {
    if (i === 0) return false;
    return !isVowel(word[i - 1], i - 1, word);
  }
  return false;
}

function measure(word) {
  // measure m = number of VC sequences
  let m = 0;
  let i = 0;
  const len = word.length;
  // skip consonants
  while (i < len && !isVowel(word[i], i, word)) i++;
  // count VC
  while (i < len) {
    // vowel sequence
    while (i < len && isVowel(word[i], i, word)) i++;
    if (i >= len) break;
    m++;
    // consonant sequence
    while (i < len && !isVowel(word[i], i, word)) i++;
  }
  return m;
}

function containsVowel(word) {
  for (let i = 0; i < word.length; i++) {
    if (isVowel(word[i], i, word)) return true;
  }
  return false;
}

function endsWithDoubleConsonant(word) {
  if (word.length < 2) return false;
  const last = word[word.length - 1];
  const prev = word[word.length - 2];
  if (last !== prev) return false;
  if (last === 'w' || last === 'x' || last === 'y') return false;
  return true;
}

function endsWithCVC(word) {
  if (word.length < 3) return false;
  const c1 = word[word.length - 1];
  const v = word[word.length - 2];
  const c2 = word[word.length - 3];
  // must be consonant-vowel-consonant
  if (isVowel(c1, word.length - 1, word)) return false;
  if (!isVowel(v, word.length - 2, word)) return false;
  if (isVowel(c2, word.length - 3, word)) return false;
  if (c1 === 'w' || c1 === 'x' || c1 === 'y') return false;
  return true;
}

export function stem(word) {
  if (!word || word.length < 3) return word;
  let w = word.toLowerCase();
  
  // Step 1a
  if (w.endsWith('sses')) w = w.slice(0, -2);
  else if (w.endsWith('ies')) w = w.slice(0, -2);
  else if (w.endsWith('ss')) { /* keep */ }
  else if (w.endsWith('s')) w = w.slice(0, -1);
  
  // Step 1b
  if (w.endsWith('eed')) {
    if (measure(w.slice(0, -3)) > 0) w = w.slice(0, -1);
  } else if (w.endsWith('ed')) {
    if (containsVowel(w.slice(0, -2))) {
      w = w.slice(0, -2);
      if (w.endsWith('at') || w.endsWith('bl') || w.endsWith('iz')) w = w + 'e';
      else if (endsWithDoubleConsonant(w) && !(w.endsWith('l') || w.endsWith('s') || w.endsWith('z'))) {
        w = w.slice(0, -1);
      } else if (measure(w) === 1 && endsWithCVC(w)) {
        w = w + 'e';
      }
    }
  } else if (w.endsWith('ing')) {
    if (containsVowel(w.slice(0, -3))) {
      w = w.slice(0, -3);
      if (w.endsWith('at') || w.endsWith('bl') || w.endsWith('iz')) w = w + 'e';
      else if (endsWithDoubleConsonant(w) && !(w.endsWith('l') || w.endsWith('s') || w.endsWith('z'))) {
        w = w.slice(0, -1);
      } else if (measure(w) === 1 && endsWithCVC(w)) {
        w = w + 'e';
      }
    }
  }
  
  // Step 1c
  if (w.endsWith('y') && containsVowel(w.slice(0, -1))) {
    w = w.slice(0, -1) + 'i';
  }
  
  // Step 2
  const step2 = [
    ['ational','ate',0],['tional','tion',0],['enci','ence',0],['anci','ance',0],['izer','ize',0],
    ['abli','able',0],['alli','al',0],['entli','ent',0],['eli','e',0],['ousli','ous',0],
    ['ization','ize',0],['ation','ate',0],['ator','ate',0],['alism','al',0],['iveness','ive',0],
    ['fulness','ful',0],['ousness','ous',0],['aliti','al',0],['iviti','ive',0],['biliti','ble',0]
  ];
  for (let [suf, rep] of step2) {
    if (w.endsWith(suf)) {
      const stemmed = w.slice(0, -suf.length);
      if (measure(stemmed) > 0) { w = stemmed + rep; break; }
    }
  }
  
  // Step 3
  const step3 = [
    ['icate','ic',0],['ative','',0],['alize','al',0],['iciti','ic',0],['ical','ic',0],['ful','',0],['ness','',0]
  ];
  for (let [suf, rep] of step3) {
    if (w.endsWith(suf)) {
      const stemmed = w.slice(0, -suf.length);
      if (measure(stemmed) > 0) { w = stemmed + rep; break; }
    }
  }
  
  // Step 4
  const step4 = ['al','ance','ence','er','ic','able','ible','ant','ement','ment','ent','ou','ism','ate','iti','ous','ive','ize'];
  for (let suf of step4) {
    if (w.endsWith(suf)) {
      const stemmed = w.slice(0, -suf.length);
      if (measure(stemmed) > 1) { w = stemmed; break; }
    }
  }
  // special case for ion: remove if preceded by s or t and m(stem) > 1
  if ((w.endsWith('sion') || w.endsWith('tion')) && measure(w.slice(0, -3)) > 1) {
    w = w.slice(0, -3);
  }
  
  // Step 5a
  if (w.endsWith('e')) {
    const stemmed = w.slice(0, -1);
    if (measure(w) > 1) w = stemmed;
    else if (measure(w) === 1 && !endsWithCVC(stemmed)) w = stemmed;
  }
  // Step 5b
  if (measure(w) > 1 && endsWithDoubleConsonant(w) && w.endsWith('l')) {
    w = w.slice(0, -1);
  }
  
  return w;
}
