import { crossValidate } from './tune.js';

const cfg = JSON.parse(process.argv[2] || '{}');
const s = crossValidate(cfg);
const out = {};
for (const [name, v] of Object.entries(s)) {
  out[name] = { macroF1: v.macroF1Mean, acc: v.accMean, f1std: v.macroF1Std };
}
console.log(JSON.stringify({ cfg, result: out }));
