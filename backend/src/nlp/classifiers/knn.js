export class KNN {
  constructor(k = 5) {
    this.k = k;
    this.X = [];
    this.y = [];
  }
  
  fit(X, y) {
    this.X = X;
    this.y = y;
  }
  
  predictProba(x, vectorizer) {
    const sims = [];
    for (let i = 0; i < this.X.length; i++) {
      const sim = vectorizer.cosine(x, this.X[i]);
      sims.push({ sim, label: this.y[i] });
    }
    sims.sort((a, b) => b.sim - a.sim);
    const topK = sims.slice(0, this.k);
    const scores = new Map();
    for (let i = 0; i < topK.length; i++) {
      const w = topK[i].sim > 0 ? topK[i].sim : 1e-6;
      scores.set(topK[i].label, (scores.get(topK[i].label) || 0) + w);
    }
    const res = {};
    let sum = 0;
    for (let v of scores.values()) sum += v;
    for (let [label, s] of scores) {
      res[label] = s / (sum + 1e-10);
    }
    return res;
  }
  
  toJSON() {
    // Store vectors as arrays
    return {
      k: this.k,
      X: this.X.map(v => Array.from(v.entries())),
      y: this.y
    };
  }
  
  fromJSON(data) {
    this.k = data.k;
    this.X = data.X.map(v => new Map(v));
    this.y = data.y;
  }
}
