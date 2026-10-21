import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalize } from './tokenizer.js';
import { Vectorizer } from './vectorizer.js';
import { NaiveBayes } from './classifiers/naiveBayes.js';
import { SoftmaxRegression } from './classifiers/softmaxRegression.js';
import { KNN } from './classifiers/knn.js';
import { mulberry32, shuffleArray } from './random.js';
import { computeAccuracy, computePerClassMetrics, computeMacroF1 } from './metrics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEED = 42;

export function loadPatterns() {
  const intentsPath = path.join(__dirname, '..', '..', 'data', 'intents.json');
  const intentsData = JSON.parse(fs.readFileSync(intentsPath, 'utf8'));
  const patterns = [];
  const labels = [];
  const byTag = {};
  for (const intent of intentsData.intents) {
    byTag[intent.tag] = intent.patterns.slice();
    for (const p of intent.patterns) {
      patterns.push(normalize(p));
      labels.push(intent.tag);
    }
  }
  return { patterns, labels, byTag };
}

function kFoldStratified(y, k, rng) {
  const labels = Array.from(new Set(y));
  const folds = Array(k).fill().map(() => []);
  for (const l of labels) {
    const idxs = [];
    for (let i = 0; i < y.length; i++) if (y[i] === l) idxs.push(i);
    const shuffled = shuffleArray(idxs, rng);
    for (let j = 0; j < shuffled.length; j++) folds[j % k].push(shuffled[j]);
  }
  return folds;
}

function augmentPattern(pattern, rng) {
  const variants = [];
  const words = pattern.split(/\s+/);
  if (words.length > 0) {
    const w = words[0];
    if (w.length > 3) {
      const arr = w.split('');
      const i = Math.floor(rng() * (arr.length - 1));
      [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
      variants.push([arr.join(''), ...words.slice(1)].join(' '));
    }
    const w2 = words[0];
    if (w2.length > 3) {
      const arr = w2.split('');
      const i = Math.floor(rng() * arr.length);
      arr.splice(i, 1);
      variants.push([arr.join(''), ...words.slice(1)].join(' '));
    }
  }
  if (pattern.includes('you')) variants.push(pattern.replace('you', 'u'));
  return variants;
}

// augmentCount = max variants per pattern to add (0 disables)
function buildAugmented(patterns, labels, byTag, rng, augmentCount) {
  const P = [];
  const L = [];
  for (let i = 0; i < patterns.length; i++) {
    P.push(patterns[i]);
    L.push(labels[i]);
    if (augmentCount <= 0) continue;
    const orig = byTag[labels[i]];
    for (const p of orig) {
      if (normalize(p) === patterns[i]) {
        const vars = augmentPattern(p, rng).slice(0, augmentCount);
        for (const v of vars) { P.push(normalize(v)); L.push(labels[i]); }
        break;
      }
    }
  }
  return { P, L };
}

function classifyAll(Classifier, config, XTrain, yTrain, XTest, vectorizer) {
  const c = config.type === 'knn' ? new Classifier(config.k)
    : config.type === 'nb' ? new Classifier(config.alpha)
    : new Classifier(config);
  c.fit(XTrain, yTrain);
  const pred = XTest.map(x => {
    const probs = config.type === 'knn' ? c.predictProba(x, vectorizer) : c.predictProba(x);
    return Object.entries(probs).sort((a, b) => b[1] - a[1])[0][0];
  });
  return pred;
}

export function crossValidate(opts = {}) {
  const {
    folds = 5,
    augmentCount = 2,
    vectorizerOpts = {},
    softmaxConfig = {},
    classifiers = ['nb', 'softmax', 'knn']
  } = opts;
  const rng = mulberry32(SEED);
  const { patterns, labels, byTag } = loadPatterns();
  const foldIdx = kFoldStratified(labels, folds, rng);
  const results = {};
  for (const name of classifiers) results[name] = { f1: [], acc: [] };

  for (let f = 0; f < folds; f++) {
    const testFold = foldIdx[f];
    const trainFold = [];
    for (let ff = 0; ff < folds; ff++) if (ff !== f) trainFold.push(...foldIdx[ff]);

    const foldRng = mulberry32(SEED + f + 1);
    const trPatterns = trainFold.map(i => patterns[i]);
    const trLabels = trainFold.map(i => labels[i]);
    const { P, L } = buildAugmented(trPatterns, trLabels, byTag, foldRng, augmentCount);
    const tePatterns = testFold.map(i => patterns[i]);
    const teLabels = testFold.map(i => labels[i]);

    const vec = new Vectorizer(vectorizerOpts);
    vec.fit(P);
    const XTrain = P.map(p => vec.transform(p));
    const XTest = tePatterns.map(p => vec.transform(p));

    for (const name of classifiers) {
      let pred;
      if (name === 'nb') pred = classifyAll(NaiveBayes, { type: 'nb', alpha: 1 }, XTrain, L, XTest, vec);
      else if (name === 'softmax') pred = classifyAll(SoftmaxRegression, { type: 'sm', seed: SEED, ...softmaxConfig }, XTrain, L, XTest, vec);
      else pred = classifyAll(KNN, { type: 'knn', k: 5 }, XTrain, L, XTest, vec);
      const labelsSet = Array.from(new Set([...L, ...teLabels]));
      const report = computePerClassMetrics(teLabels, pred, labelsSet);
      const macroF1 = computeMacroF1(report, labelsSet);
      const acc = computeAccuracy(teLabels, pred);
      results[name].f1.push(macroF1);
      results[name].acc.push(acc);
    }
  }

  const summary = {};
  for (const name of classifiers) {
    const f1s = results[name].f1;
    const accs = results[name].acc;
    const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
    const std = arr => { const m = mean(arr); return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length); };
    summary[name] = {
      macroF1Mean: mean(f1s), macroF1Std: std(f1s),
      accMean: mean(accs), accStd: std(accs),
      f1: f1s, acc: accs
    };
  }
  return summary;
}

// CLI: node tune.js
if (process.argv[1] && process.argv[1].endsWith('tune.js')) {
  const summary = crossValidate();
  for (const [name, s] of Object.entries(summary)) {
    console.log(`${name}: macroF1=${s.macroF1Mean.toFixed(4)} (+/-${s.macroF1Std.toFixed(4)}) acc=${s.accMean.toFixed(4)}`);
  }
}
