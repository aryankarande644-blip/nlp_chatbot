import { stem } from './stemmer.js';
import { lemmatize } from './tokenizer.js';
import { STOPWORDS } from './stopwords.js';

export class Vectorizer {
  constructor(options = {}) {
    this.vocab = new Map(); // feature -> index
    this.idf = new Map();
    this.featureList = [];
    this.N = 0;
    // feature toggles / ranges
    this.useUnigram = options.useUnigram !== false;
    this.useBigram = options.useBigram !== false;
    // char n-gram range [min, max]; null-ish disables (default 3,3 keeps current behavior)
    this.charNgramMin = options.charNgramMin === undefined ? 3 : options.charNgramMin;
    this.charNgramMax = options.charNgramMax === undefined ? 3 : options.charNgramMax;
  }
  
  getFeatures(text) {
    // text is normalized
    const tokens = text.toLowerCase().match(/[a-z0-9]+/g) || [];
    const features = [];
    // unigrams + bigrams over stemmed tokens
    const processed = tokens.map(t => {
      const lem = lemmatize(t);
      return stem(lem);
    });
    // unigrams
    if (this.useUnigram) {
      for (let i = 0; i < processed.length; i++) {
        features.push('unigram:' + processed[i]);
      }
    }
    // bigrams
    if (this.useBigram) {
      for (let i = 0; i < processed.length - 1; i++) {
        features.push('bigram:' + processed[i] + '_' + processed[i + 1]);
      }
    }
    // character n-grams (configurable range)
    if (this.charNgramMin && this.charNgramMax) {
      const clean = text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
      for (let n = this.charNgramMin; n <= this.charNgramMax; n++) {
        for (let i = 0; i + n <= clean.length; i++) {
          const cng = clean.substr(i, n);
          if (cng.trim() !== '' || cng === ' '.repeat(n)) {
            features.push('char' + n + ':' + cng);
          }
        }
      }
    }
    return features;
  }
  
  fit(docs) {
    this.N = docs.length;
    // document frequency
    const df = new Map();
    for (let doc of docs) {
      const feats = this.getFeatures(doc);
      const unique = new Set(feats);
      for (let f of unique) {
        df.set(f, (df.get(f) || 0) + 1);
      }
    }
    // build vocab
    let idx = 0;
    this.vocab.clear();
    this.featureList = [];
    for (let [f, d] of df) {
      this.vocab.set(f, idx);
      this.featureList.push(f);
      // idf: ln((1+N)/(1+df)) + 1
      const idfVal = Math.log((1 + this.N) / (1 + d)) + 1;
      this.idf.set(f, idfVal);
      idx++;
    }
  }
  
  transform(doc) {
    const feats = this.getFeatures(doc);
    // term frequency with sublinear tf: 1 + ln(count) if count > 0
    const tf = new Map();
    for (let f of feats) {
      tf.set(f, (tf.get(f) || 0) + 1);
    }
    // build sparse vector
    const vec = new Map();
    for (let [f, count] of tf) {
      if (this.vocab.has(f)) {
        const t = 1 + Math.log(count);
        const w = t * (this.idf.get(f) || 0);
        const vIdx = this.vocab.get(f);
        vec.set(vIdx, w);
      }
    }
    // L2 normalize
    let norm = 0;
    for (let v of vec.values()) {
      norm += v * v;
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let [k, v] of vec) {
        vec.set(k, v / norm);
      }
    }
    return vec;
  }
  
  cosine(a, b) {
    // sparse vectors
    let dot = 0;
    // iterate smaller
    const [smaller, larger] = a.size < b.size ? [a, b] : [b, a];
    for (let [k, v] of smaller) {
      if (larger.has(k)) {
        dot += v * larger.get(k);
      }
    }
    return dot; // already normalized
  }
  
  toJSON() {
    return {
      vocab: Array.from(this.vocab.entries()),
      idf: Array.from(this.idf.entries()),
      featureList: this.featureList,
      N: this.N,
      useUnigram: this.useUnigram,
      useBigram: this.useBigram,
      charNgramMin: this.charNgramMin,
      charNgramMax: this.charNgramMax
    };
  }
  
  fromJSON(data) {
    this.vocab = new Map(data.vocab);
    this.idf = new Map(data.idf);
    this.featureList = data.featureList;
    this.N = data.N;
    if (data.useUnigram !== undefined) this.useUnigram = data.useUnigram;
    if (data.useBigram !== undefined) this.useBigram = data.useBigram;
    if (data.charNgramMin !== undefined) this.charNgramMin = data.charNgramMin;
    if (data.charNgramMax !== undefined) this.charNgramMax = data.charNgramMax;
  }
}
