import { analyze } from '../src/nlp/index.js';
import { loadModel } from '../src/nlp/index.js';

loadModel();
let ctx = {};
const tests = [
  "hello",
  "my name is alice",
  "what is my name",
  "what time is it",
  "12 plus 7",
  "tell me a joke",
  "another one",
  "what is the capital of france",
  "asdkj qwe zxc",
  "helo how r u",
  "i hate everything"
];
for (let t of tests) {
  const r = analyze(t, [], ctx);
  ctx = r.context;
  console.log("Q:", t);
  console.log("A:", r.reply, "|", r.intent, r.source);
  console.log("---");
}
