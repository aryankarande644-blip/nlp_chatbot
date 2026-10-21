import { mulberry32, shuffleArray } from '../random.js';

export class SoftmaxRegression {
  constructor(config = {}) {
    this.lr = config.lr || 0.8;
    this.epochs = config.epochs || 300;
    this.batchSize = config.batchSize || 16;
    this.lambda = config.lambda || 1e-4;
    this.seed = config.seed || 42;
    this.W = null; // array of Maps per class or Map per class
    this.b = null;
    this.labels = [];
    this.nFeatures = 0;
  }
  
  fit(X, y) {
    this.labels = Array.from(new Set(y));
    const nClasses = this.labels.length;
    const classToIdx = new Map(this.labels.map((l, i) => [l, i]));
    this.nFeatures = 0;
    for (let i = 0; i < X.length; i++) {
      for (let k of X[i].keys()) {
        if (k + 1 > this.nFeatures) this.nFeatures = k + 1;
      }
    }
    // init W and b
    this.W = Array(nClasses).fill().map(() => new Map());
    this.b = Array(nClasses).fill(0);
    const rng = mulberry32(this.seed);
    for (let c = 0; c < nClasses; c++) {
      for (let f = 0; f < this.nFeatures; f++) {
        if (rng() < 0.01) { // small init
          this.W[c].set(f, (rng() - 0.5) * 0.01);
        }
      }
    }
    // SGD
    let prevLoss = Infinity;
    let patience = 0;
    for (let epoch = 0; epoch < this.epochs; epoch++) {
      const indices = shuffleArray(Array.from({length: y.length}, (_, i) => i), rng);
      for (let start = 0; start < indices.length; start += this.batchSize) {
        const batch = indices.slice(start, Math.min(start + this.batchSize, indices.length));
        // compute gradients
        const gradW = Array(nClasses).fill().map(() => new Map());
        const gradB = Array(nClasses).fill(0);
        for (let bi = 0; bi < batch.length; bi++) {
          const idx = batch[bi];
          const x = X[idx];
          const yTrue = classToIdx.get(y[idx]);
          // compute scores
          const scores = Array(nClasses).fill(0);
          for (let c = 0; c < nClasses; c++) {
            let s = this.b[c];
            const wMap = this.W[c];
            for (let [fIdx, val] of x) {
              if (wMap.has(fIdx)) s += wMap.get(fIdx) * val;
            }
            scores[c] = s;
          }
          // softmax
          let maxScore = -Infinity;
          for (let c = 0; c < nClasses; c++) if (scores[c] > maxScore) maxScore = scores[c];
          let sumExp = 0;
          const probs = Array(nClasses).fill(0);
          for (let c = 0; c < nClasses; c++) {
            probs[c] = Math.exp(scores[c] - maxScore);
            sumExp += probs[c];
          }
          for (let c = 0; c < nClasses; c++) probs[c] = probs[c] / (sumExp + 1e-10);
          // gradients
          for (let c = 0; c < nClasses; c++) {
            const delta = probs[c] - (c === yTrue ? 1 : 0);
            gradB[c] += delta;
            for (let [fIdx, val] of x) {
              const gw = gradW[c];
              gw.set(fIdx, (gw.get(fIdx) || 0) + delta * val);
            }
          }
        }
        // update
        const batchLen = batch.length;
        for (let c = 0; c < nClasses; c++) {
          this.b[c] -= this.lr * gradB[c] / batchLen;
          const wMap = this.W[c];
          const gwMap = gradW[c];
          for (let [fIdx, gval] of gwMap) {
            const wval = wMap.get(fIdx) || 0;
            wMap.set(fIdx, wval - this.lr * (gval / batchLen + this.lambda * wval));
          }
        }
      }
      if (epoch % 50 === 0) {
        // compute loss
        let loss = 0;
        for (let i = 0; i < Math.min(100, y.length); i++) {
          const x = X[i];
          const yTrue = classToIdx.get(y[i]);
          const scores = Array(nClasses).fill(0);
          for (let c = 0; c < nClasses; c++) {
            let s = this.b[c];
            const wMap = this.W[c];
            for (let [fIdx, val] of x) {
              if (wMap.has(fIdx)) s += wMap.get(fIdx) * val;
            }
            scores[c] = s;
          }
          let maxScore = -Infinity;
          for (let c = 0; c < nClasses; c++) if (scores[c] > maxScore) maxScore = scores[c];
          let sumExp = 0;
          for (let c = 0; c < nClasses; c++) sumExp += Math.exp(scores[c] - maxScore);
          loss += - (scores[yTrue] - maxScore) + Math.log(sumExp);
        }
        loss /= Math.min(100, y.length);
        if (Math.abs(prevLoss - loss) < 1e-5) {
          patience++;
          if (patience > 10) break;
        } else {
          patience = 0;
        }
        prevLoss = loss;
      }
    }
  }
  
  predictProba(x) {
    const nClasses = this.labels.length;
    const scores = Array(nClasses).fill(0);
    for (let c = 0; c < nClasses; c++) {
      let s = this.b[c];
      const wMap = this.W[c];
      for (let [fIdx, val] of x) {
        if (wMap.has(fIdx)) s += wMap.get(fIdx) * val;
      }
      scores[c] = s;
    }
    let maxScore = -Infinity;
    for (let c = 0; c < nClasses; c++) if (scores[c] > maxScore) maxScore = scores[c];
    let sumExp = 0;
    const probsArr = Array(nClasses).fill(0);
    for (let c = 0; c < nClasses; c++) {
      probsArr[c] = Math.exp(scores[c] - maxScore);
      sumExp += probsArr[c];
    }
    const res = {};
    for (let c = 0; c < nClasses; c++) {
      res[this.labels[c]] = probsArr[c] / (sumExp + 1e-10);
    }
    return res;
  }
  
  toJSON() {
    return {
      labels: this.labels,
      nFeatures: this.nFeatures,
      W: this.W.map(w => Array.from(w.entries())),
      b: this.b,
      lr: this.lr,
      epochs: this.epochs,
      batchSize: this.batchSize,
      lambda: this.lambda,
      seed: this.seed
    };
  }
  
  fromJSON(data) {
    this.labels = data.labels;
    this.nFeatures = data.nFeatures;
    this.W = data.W.map(w => new Map(w));
    this.b = data.b;
    this.lr = data.lr;
    this.epochs = data.epochs;
    this.batchSize = data.batchSize;
    this.lambda = data.lambda;
    this.seed = data.seed;
  }
}
