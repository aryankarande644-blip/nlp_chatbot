export class NaiveBayes {
  constructor(alpha = 1) {
    this.alpha = alpha;
    this.classProbs = new Map();
    this.featureProbs = new Map();
    this.labels = [];
    this.vocabSize = 0;
  }
  
  fit(X, y) {
    this.labels = Array.from(new Set(y));
    const nClasses = this.labels.length;
    const classToIdx = new Map(this.labels.map((l, i) => [l, i]));
    const total = y.length;
    this.vocabSize = 0;
    for (let i = 0; i < X.length; i++) {
      for (let k of X[i].keys()) {
        if (k + 1 > this.vocabSize) this.vocabSize = k + 1;
      }
    }
    const classCounts = Array(nClasses).fill(0);
    for (let i = 0; i < y.length; i++) {
      classCounts[classToIdx.get(y[i])]++;
    }
    const featureCounts = Array(nClasses).fill().map(() => new Map());
    for (let i = 0; i < X.length; i++) {
      const cIdx = classToIdx.get(y[i]);
      const vec = X[i];
      for (let [fIdx, val] of vec) {
        featureCounts[cIdx].set(fIdx, (featureCounts[cIdx].get(fIdx) || 0) + val);
      }
    }
    this.classProbs = new Map();
    for (let i = 0; i < nClasses; i++) {
      this.classProbs.set(this.labels[i], Math.log((classCounts[i] + 1e-10) / (total + 1e-10)));
    }
    this.featureProbs = new Map();
    for (let i = 0; i < nClasses; i++) {
      const label = this.labels[i];
      const map = new Map();
      let totalCount = 0;
      for (let v of featureCounts[i].values()) totalCount += v;
      for (let f = 0; f < this.vocabSize; f++) {
        const count = featureCounts[i].get(f) || 0;
        const prob = (count + this.alpha) / (totalCount + this.alpha * this.vocabSize);
        map.set(f, Math.log(prob));
      }
      this.featureProbs.set(label, map);
    }
  }
  
  predictProba(x) {
    const res = {};
    let maxLog = -Infinity;
    for (let label of this.labels) {
      let logProb = this.classProbs.get(label) || -Infinity;
      const fMap = this.featureProbs.get(label);
      for (let [fIdx, val] of x) {
        if (fMap && fMap.has(fIdx)) {
          logProb += fMap.get(fIdx) * val;
        }
      }
      if (logProb > maxLog) maxLog = logProb;
      res[label] = logProb;
    }
    let sumExp = 0;
    for (let label of this.labels) {
      res[label] = Math.exp(res[label] - maxLog);
      sumExp += res[label];
    }
    for (let label of this.labels) {
      res[label] = res[label] / (sumExp + 1e-10);
    }
    return res;
  }
  
  toJSON() {
    return {
      labels: this.labels,
      classProbs: Array.from(this.classProbs.entries()),
      featureProbs: Array.from(this.featureProbs.entries()).map(([k, v]) => [k, Array.from(v.entries())]),
      vocabSize: this.vocabSize,
      alpha: this.alpha
    };
  }
  
  fromJSON(data) {
    this.labels = data.labels;
    this.classProbs = new Map(data.classProbs);
    this.featureProbs = new Map(data.featureProbs.map(([k, v]) => [k, new Map(v)]));
    this.vocabSize = data.vocabSize;
    this.alpha = data.alpha;
  }
}
