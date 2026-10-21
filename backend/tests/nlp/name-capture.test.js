import { describe, it, expect, beforeAll } from 'vitest';
import { analyze, loadModel } from '../../src/nlp/index.js';
import { DialogueManager } from '../../src/nlp/dialogue.js';
import { parseBareName } from '../../src/nlp/ner.js';

const dm = new DialogueManager();

beforeAll(() => {
  loadModel();
});

describe('parseBareName', () => {
  it('strips "its" filler', () => { expect(parseBareName('its aaryan')).toBe('Aaryan'); });
  it('strips "it\'s" filler', () => { expect(parseBareName("it's aaryan")).toBe('Aaryan'); });
  it('accepts bare name', () => { expect(parseBareName('aaryan')).toBe('Aaryan'); });
  it('strips "i am"', () => { expect(parseBareName('i am bob')).toBe('Bob'); });
  it('strips "you can call me"', () => { expect(parseBareName('you can call me maria')).toBe('Maria'); });
  it('handles two-token names', () => { expect(parseBareName('its john smith')).toBe('John Smith'); });
  it('rejects "its 5 pm" (digits)', () => { expect(parseBareName('its 5 pm')).toBe(null); });
  it('rejects common words', () => { expect(parseBareName('nothing')).toBe(null); });
  it('rejects "yes"', () => { expect(parseBareName('yes')).toBe(null); });
  it('rejects filler-only', () => { expect(parseBareName('its')).toBe(null); });
});

describe('name slot filling in conversation', () => {
  it('captures "its aaryan" after bot asks for name', () => {
    let ctx = dm.initContext();
    const r1 = analyze('what is my name', [], ctx);
    expect(r1.intent).toBe('ask_my_name');
    expect(r1.context.awaitingSlot).toBe('userName');

    const r2 = analyze('its aaryan', [], r1.context);
    expect(r2.intent).toBe('introduce_name');
    expect(r2.context.userName).toBe('Aaryan');
    expect(r2.context.awaitingSlot).toBe(null);
    expect(r2.reply).toContain('Aaryan');
  });

  it('then "what is my name" replies with Aaryan', () => {
    let ctx = dm.initContext();
    const r1 = analyze('what is my name', [], ctx);
    const r2 = analyze('its aaryan', [], r1.context);
    const r3 = analyze('what is my name', [], r2.context);
    expect(r3.intent).toBe('ask_my_name');
    expect(r3.context.userName).toBe('Aaryan');
    expect(r3.reply).toContain('Aaryan');
  });

  it('does NOT save a name for "its 5 pm"', () => {
    let ctx = dm.initContext();
    const r1 = analyze('what is my name', [], ctx);
    expect(r1.context.awaitingSlot).toBe('userName');

    const r2 = analyze('its 5 pm', [], r1.context);
    expect(r2.context.userName).toBeFalsy();
    expect(r2.intent).not.toBe('introduce_name');
  });
});
