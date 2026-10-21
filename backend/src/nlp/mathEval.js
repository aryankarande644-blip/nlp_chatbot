const NUMBER_WORDS = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
  'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15, 'sixteen': 16,
  'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
  'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90, 'hundred': 100
};

function preprocessMath(text) {
  if (!text) return '';
  let t = text.toLowerCase();
  t = t.replace(/multiplied by/g, '*');
  t = t.replace(/divided by/g, '/');
  t = t.replace(/plus/g, '+');
  t = t.replace(/minus/g, '-');
  t = t.replace(/times/g, '*');
  t = t.replace(/x(?![a-z])/g, '*');
  t = t.replace(/over/g, '/');
  t = t.replace(/to the power of/g, '^');
  t = t.replace(/squared/g, '^ 2');
  t = t.replace(/mod/g, '%');
  for (let k in NUMBER_WORDS) {
    const re = new RegExp('\\b' + k + '\\b', 'g');
    t = t.replace(re, NUMBER_WORDS[k].toString());
  }
  return t;
}

function tokenizeMath(expr) {
  const tokens = [];
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (/\s/.test(ch)) continue;
    if (/[0-9.]/.test(ch)) {
      let num = ch;
      i++;
      while (i < expr.length && /[0-9.]/.test(expr[i])) { num += expr[i]; i++; }
      i--;
      tokens.push({ type: 'num', value: parseFloat(num) });
      continue;
    }
    if (ch === '+') tokens.push({ type: '+' });
    else if (ch === '-') tokens.push({ type: '-' });
    else if (ch === '*') tokens.push({ type: '*' });
    else if (ch === '/') tokens.push({ type: '/' });
    else if (ch === '%') tokens.push({ type: '%' });
    else if (ch === '^') tokens.push({ type: '^', right: true });
    else if (ch === '(') tokens.push({ type: '(' });
    else if (ch === ')') tokens.push({ type: ')' });
    else if (ch === '=') continue;
  }
  return tokens;
}

function evaluateTokens(tokens) {
  let pos = 0;
  function parseExpression() {
    let node = parseTerm();
    while (pos < tokens.length && (tokens[pos].type === '+' || tokens[pos].type === '-')) {
      const op = tokens[pos++].type;
      const right = parseTerm();
      node = { type: 'binop', op, left: node, right };
    }
    return node;
  }
  function parseTerm() {
    let node = parsePower();
    while (pos < tokens.length && (tokens[pos].type === '*' || tokens[pos].type === '/' || tokens[pos].type === '%')) {
      const op = tokens[pos++].type;
      const right = parsePower();
      node = { type: 'binop', op, left: node, right };
    }
    return node;
  }
  function parsePower() {
    let node = parseFactor();
    if (pos < tokens.length && tokens[pos].type === '^') {
      const op = tokens[pos++].type;
      const right = parsePower();
      node = { type: 'binop', op, left: node, right };
    }
    return node;
  }
  function parseFactor() {
    if (pos >= tokens.length) throw new Error('bad');
    if (tokens[pos].type === '(') {
      pos++;
      const node = parseExpression();
      if (pos < tokens.length && tokens[pos].type === ')') pos++;
      return node;
    }
    if (tokens[pos].type === '-') {
      pos++;
      const node = parseFactor();
      return { type: 'unary', op: '-', node };
    }
    if (tokens[pos].type === '+') {
      pos++;
      return parseFactor();
    }
    if (tokens[pos].type === 'num') {
      const val = tokens[pos++].value;
      return { type: 'num', value: val };
    }
    throw new Error('bad');
  }
  function evalNode(node) {
    if (node.type === 'num') return node.value;
    if (node.type === 'unary') return -evalNode(node.node);
    if (node.type === 'binop') {
      const l = evalNode(node.left);
      const r = evalNode(node.right);
      if (node.op === '+') return l + r;
      if (node.op === '-') return l - r;
      if (node.op === '*') return l * r;
      if (node.op === '/') {
        if (Math.abs(r) < 1e-18) throw new Error('divzero');
        return l / r;
      }
      if (node.op === '%') {
        if (Math.abs(r) < 1e-18) throw new Error('divzero');
        return l % r;
      }
      if (node.op === '^') {
        return Math.pow(l, r);
      }
    }
    throw new Error('bad');
  }
  try {
    const ast = parseExpression();
    const result = evalNode(ast);
    return result;
  } catch (e) {
    throw e;
  }
}

export function tryMathEvaluate(text) {
  if (!text || text.length > 100) return null;
  const preprocessed = preprocessMath(text);
  if (!/[0-9]/.test(preprocessed)) {
    const hasOp = /plus|minus|times|divided|multiply|\^|%/.test(text.toLowerCase());
    if (!hasOp) return null;
  }
  const tokens = tokenizeMath(preprocessed);
  if (tokens.length === 0) return null;
  const hasNum = tokens.some(t => t.type === 'num');
  const hasOp = tokens.some(t => t.type === '+' || t.type === '-' || t.type === '*' || t.type === '/' || t.type === '^' || t.type === '%');
  if (!hasNum) return null;
  try {
    const result = evaluateTokens(tokens);
    if (typeof result !== 'number' || isNaN(result)) return { ok: false, error: 'Malformed input' };
    let formatted = result;
    if (Math.abs(result - Math.round(result)) < 1e-9) {
      formatted = Math.round(result);
    }
    return { ok: true, result: formatted };
  } catch (e) {
    if (e.message === 'divzero') {
      return { ok: false, error: 'Cannot divide by zero' };
    }
    return { ok: false, error: 'Could not evaluate expression' };
  }
}
