import { Vectorizer } from './vectorizer.js';

export class RetrievalQA {
  constructor(knowledge, threshold = 0.35) {
    this.knowledge = knowledge;
    this.threshold = threshold;
    this.vectorizer = new Vectorizer();
    this.docs = [];
    this.entries = [];
  }
  
  build() {
    this.docs = [];
    this.entries = [];
    for (let i = 0; i < this.knowledge.length; i++) {
      const k = this.knowledge[i];
      for (let q of k.questions) {
        this.docs.push(q);
        this.entries.push({ answer: k.answer, question: q });
      }
    }
    this.vectorizer.fit(this.docs);
  }
  
  query(text) {
    const vec = this.vectorizer.transform(text);
    let bestScore = -1;
    let bestIdx = -1;
    for (let i = 0; i < this.docs.length; i++) {
      const dvec = this.vectorizer.transform(this.docs[i]);
      const sim = this.vectorizer.cosine(vec, dvec);
      if (sim > bestScore) {
        bestScore = sim;
        bestIdx = i;
      }
    }
    if (bestScore >= this.threshold && bestIdx >= 0) {
      return { answer: this.entries[bestIdx].answer, score: bestScore };
    }
    return null;
  }
}
