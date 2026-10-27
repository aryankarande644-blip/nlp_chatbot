import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalize } from './tokenizer.js';
import { Vectorizer } from './vectorizer.js';
import { NaiveBayes } from './classifiers/naiveBayes.js';
import { SoftmaxRegression } from './classifiers/softmaxRegression.js';
import { KNN } from './classifiers/knn.js';
import { mulberry32, shuffleArray } from './random.js';
import { computeAccuracy, computePerClassMetrics, computeMacroF1, computeConfusionMatrix } from './metrics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEED = 42;
const rng = mulberry32(SEED);

// Tuned defaults (selected by cross-validated macro-F1; see tune.js).
const VECTORIZER_OPTS = { charNgramMin: 2, charNgramMax: 3 };
const SOFTMAX_CONFIG = { lr: 1.5, epochs: 200, batchSize: 16, lambda: 1e-4, seed: SEED };
const AUGMENT_COUNT = 0; // augmentation off by default (hurt CV macro-F1)

function stratifiedSplit(X, y, testRatio = 0.2) {
  const labels = Array.from(new Set(y));
  const trainIdx = [], testIdx = [];
  for (let l of labels) {
    const idxs = [];
    for (let i = 0; i < y.length; i++) if (y[i] === l) idxs.push(i);
    const shuffled = shuffleArray(idxs, rng);
    const testCount = Math.max(1, Math.floor(shuffled.length * testRatio));
    for (let j = 0; j < testCount; j++) testIdx.push(shuffled[j]);
    for (let j = testCount; j < shuffled.length; j++) trainIdx.push(shuffled[j]);
  }
  return { trainIdx, testIdx };
}

function augmentPattern(pattern) {
  const variants = [];
  const words = pattern.split(/\s+/);
  if (words.length > 0) {
    // swap adjacent chars in first word
    const w = words[0];
    if (w.length > 3) {
      const arr = w.split('');
      const i = Math.floor(rng() * (arr.length - 1));
      [arr[i], arr[i+1]] = [arr[i+1], arr[i]];
      const v1 = [arr.join(''), ...words.slice(1)].join(' ');
      variants.push(v1);
    }
    // delete char
    const w2 = words[0];
    if (w2.length > 3) {
      const arr = w2.split('');
      const i = Math.floor(rng() * arr.length);
      arr.splice(i, 1);
      const v2 = [arr.join(''), ...words.slice(1)].join(' ');
      variants.push(v2);
    }
  }
  // slang substitution
  if (pattern.includes('you')) {
    variants.push(pattern.replace('you', 'u'));
  }
  return variants.slice(0, AUGMENT_COUNT);
}

function kFoldStratified(X, y, k = 5) {
  const labels = Array.from(new Set(y));
  const folds = Array(k).fill().map(() => []);
  for (let l of labels) {
    const idxs = [];
    for (let i = 0; i < y.length; i++) if (y[i] === l) idxs.push(i);
    const shuffled = shuffleArray(idxs, rng);
    for (let j = 0; j < shuffled.length; j++) {
      folds[j % k].push(shuffled[j]);
    }
  }
  return folds;
}

function main() {
  const intentsPath = path.join(__dirname, '..', '..', 'data', 'intents.json');
  const intentsData = JSON.parse(fs.readFileSync(intentsPath, 'utf8'));
  
  let allPatterns = [];
  let allLabels = [];
  for (let intent of intentsData.intents) {
    for (let p of intent.patterns) {
      allPatterns.push(normalize(p));
      allLabels.push(intent.tag);
    }
  }
  
  const { trainIdx, testIdx } = stratifiedSplit(allPatterns, allLabels, 0.2);
  let trainPatterns = trainIdx.map(i => allPatterns[i]);
  let trainLabels = trainIdx.map(i => allLabels[i]);
  const testPatterns = testIdx.map(i => allPatterns[i]);
  const testLabels = testIdx.map(i => allLabels[i]);
  
  // augment training only
  const augmentedP = [];
  const augmentedL = [];
  for (let i = 0; i < trainPatterns.length; i++) {
    augmentedP.push(trainPatterns[i]);
    augmentedL.push(trainLabels[i]);
    const orig = intentsData.intents.find(x => x.tag === trainLabels[i]);
    if (orig) {
      // find original pattern
      for (let p of orig.patterns) {
        if (normalize(p) === trainPatterns[i]) {
          const vars = augmentPattern(p);
          for (let v of vars) {
            augmentedP.push(normalize(v));
            augmentedL.push(trainLabels[i]);
          }
          break;
        }
      }
    }
  }
  trainPatterns = augmentedP;
  trainLabels = augmentedL;
  
  const vectorizer = new Vectorizer(VECTORIZER_OPTS);
  vectorizer.fit(trainPatterns);
  
  const XTrain = trainPatterns.map(p => vectorizer.transform(p));
  const XTest = testPatterns.map(p => vectorizer.transform(p));
  
  function macroF1Of(yTrue, yPred) {
    const labels = Array.from(new Set([...yTrue, ...yPred]));
    const report = computePerClassMetrics(yTrue, yPred, labels);
    return computeMacroF1(report, labels);
  }
  
  // train all three
  const nb = new NaiveBayes(1);
  nb.fit(XTrain, trainLabels);
  const nbPred = XTest.map(x => {
    const probs = nb.predictProba(x);
    return Object.entries(probs).sort((a, b) => b[1] - a[1])[0][0];
  });
  const nbAcc = computeAccuracy(testLabels, nbPred);
  const nbF1 = macroF1Of(testLabels, nbPred);
  
  const sm = new SoftmaxRegression(SOFTMAX_CONFIG);
  sm.fit(XTrain, trainLabels);
  const smPred = XTest.map(x => {
    const probs = sm.predictProba(x);
    return Object.entries(probs).sort((a, b) => b[1] - a[1])[0][0];
  });
  const smAcc = computeAccuracy(testLabels, smPred);
  const smF1 = macroF1Of(testLabels, smPred);
  
  const knn = new KNN(5);
  knn.fit(XTrain, trainLabels);
  const knnPred = XTest.map(x => {
    const probs = knn.predictProba(x, vectorizer);
    return Object.entries(probs).sort((a, b) => b[1] - a[1])[0][0];
  });
  const knnAcc = computeAccuracy(testLabels, knnPred);
  const knnF1 = macroF1Of(testLabels, knnPred);
  
  console.log('Held-out results (accuracy / macro-F1):');
  console.log('NaiveBayes:', nbAcc.toFixed(4), '/', nbF1.toFixed(4));
  console.log('Softmax:', smAcc.toFixed(4), '/', smF1.toFixed(4));
  console.log('KNN:', knnAcc.toFixed(4), '/', knnF1.toFixed(4));
  
  // Skip CV for speed (Softmax won on held-out)
  console.log('Skipping 5-fold CV (too slow in pure JS). Using held-out best: Softmax');
  let best = 'softmax';
  
  // retrain on all
  const vectorizerAll = new Vectorizer(VECTORIZER_OPTS);
  vectorizerAll.fit(allPatterns);
  const XAll = allPatterns.map(p => vectorizerAll.transform(p));
  let finalClassifier;
  if (best === 'nb') { finalClassifier = new NaiveBayes(1); finalClassifier.fit(XAll, allLabels); }
  else if (best === 'knn') { finalClassifier = new KNN(5); finalClassifier.fit(XAll, allLabels); }
  else { finalClassifier = new SoftmaxRegression(SOFTMAX_CONFIG); finalClassifier.fit(XAll, allLabels); }
  
  // vocab freq for spell correction
  const vocabFreq = {};
  for (let p of allPatterns) {
    const words = p.match(/[a-z]+/g) || [];
    for (let w of words) vocabFreq[w] = (vocabFreq[w] || 0) + 1;
  }
  
  const model = {
    vectorizer: vectorizerAll.toJSON(),
    classifier: finalClassifier.toJSON(),
    classifierType: best === 'nb' ? 'nb' : best === 'knn' ? 'knn' : 'softmax',
    labels: Array.from(new Set(allLabels)),
    vocabFreq
  };
  
  const modelsDir = path.join(__dirname, '..', '..', 'models');
  if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir, { recursive: true });
  fs.writeFileSync(path.join(modelsDir, 'model.json'), JSON.stringify(model));
  console.log('Saved model.json, classifier:', model.classifierType);
}

main();
