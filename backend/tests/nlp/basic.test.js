import { describe, it, expect } from 'vitest';
import { stem } from '../../src/nlp/stemmer.js';
import { distance } from '../../src/nlp/editDistance.js';
import { tryMathEvaluate } from '../../src/nlp/mathEval.js';
import { extractEntities } from '../../src/nlp/ner.js';
import { analyzeSentiment } from '../../src/nlp/sentiment.js';

describe('Stemmer', () => {
  it('caresses->caress', () => { expect(stem('caresses')).toBe('caress'); });
  it('ponies->poni', () => { expect(stem('ponies')).toBe('poni'); });
  it('ties->ti', () => { expect(stem('ties')).toBe('ti'); });
  it('caress->caress', () => { expect(stem('caress')).toBe('caress'); });
  it('cats->cat', () => { expect(stem('cats')).toBe('cat'); });
  it('feed->feed', () => { expect(stem('feed')).toBe('feed'); });
  it('agreed->agre', () => { expect(stem('agreed')).toBe('agre'); });
  it('plastered->plaster', () => { expect(stem('plastered')).toBe('plaster'); });
  it('motoring->motor', () => { expect(stem('motoring')).toBe('motor'); });
  it('sing->sing', () => { expect(stem('sing')).toBe('sing'); });
  it('conflated->conflat', () => { expect(stem('conflated')).toBe('conflat'); });
  it('troubled->troubl', () => { expect(stem('troubled')).toBe('troubl'); });
  it('sized->size', () => { expect(stem('sized')).toBe('size'); });
  it('hopping->hop', () => { expect(stem('hopping')).toBe('hop'); });
  it('falling->fall', () => { expect(stem('falling')).toBe('fall'); });
  it('filing->file', () => { expect(stem('filing')).toBe('file'); });
  it('happy->happi', () => { expect(stem('happy')).toBe('happi'); });
  it('relational->relat', () => { expect(stem('relational')).toBe('relat'); });
  it('conditional->condit', () => { expect(stem('conditional')).toBe('condit'); });
  it('happiness->happi', () => { expect(stem('happiness')).toBe('happi'); });
  it('running->run', () => { expect(stem('running')).toBe('run'); });
});

describe('Edit distance', () => {
  it('kitten sitting', () => { expect(distance('kitten','sitting')).toBe(3); });
  it('ab ba', () => { expect(distance('ab','ba')).toBe(1); });
  it('empty abc', () => { expect(distance('','abc')).toBe(3); });
  it('same', () => { expect(distance('same','same')).toBe(0); });
});

describe('Math', () => {
  it('12 plus 7', () => { const r = tryMathEvaluate('12 plus 7'); expect(r.ok).toBe(true); expect(r.result).toBe(19); });
  it('(2+3)*4', () => { const r = tryMathEvaluate('(2+3)*4'); expect(r.ok).toBe(true); expect(r.result).toBe(20); });
  it('2^3^2', () => { const r = tryMathEvaluate('2^3^2'); expect(r.ok).toBe(true); expect(r.result).toBe(512); });
  it('-5 + 2', () => { const r = tryMathEvaluate('-5 + 2'); expect(r.ok).toBe(true); expect(r.result).toBe(-3); });
  it('10/0', () => { const r = tryMathEvaluate('10 / 0'); expect(r.ok).toBe(false); });
  it('15 times 4', () => { const r = tryMathEvaluate('what is 15 times 4'); expect(r.ok).toBe(true); expect(r.result).toBe(60); });
});

describe('NER', () => {
  it('name and location', () => {
    const ents = extractEntities('my name is priya and i live in pune', 'my name is priya and i live in pune');
    const hasName = ents.some(e => e.label === 'PERSON');
    const hasLoc = ents.some(e => e.label === 'LOCATION');
    expect(hasName).toBe(true);
    expect(hasLoc).toBe(true);
  });
  it('date and time', () => {
    const ents = extractEntities('meet me tomorrow at 5pm', 'meet me tomorrow at 5pm');
    const hasDate = ents.some(e => e.label === 'DATE');
    const hasTime = ents.some(e => e.label === 'TIME');
    expect(hasDate).toBe(true);
    expect(hasTime).toBe(true);
  });
});

describe('Sentiment', () => {
  it('love positive', () => { const s = analyzeSentiment('i love this'); expect(s.label).toBe('positive'); });
  it('not good negative', () => { const s = analyzeSentiment('this is not good'); expect(s.label).toBe('negative'); });
  it('extremely happy', () => { const s = analyzeSentiment('i am extremely happy!!'); expect(s.label).toBe('positive'); });
  it('table neutral', () => { const s = analyzeSentiment('it is a table'); expect(s.label).toBe('neutral'); });
});
