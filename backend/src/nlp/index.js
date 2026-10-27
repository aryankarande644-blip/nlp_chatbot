import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalize, tokenize, lemmatize, getKeywords } from './tokenizer.js';
import { stem } from './stemmer.js';
import { buildVocabulary, correctSpelling } from './spellcorrect.js';
import { Vectorizer } from './vectorizer.js';
import { NaiveBayes } from './classifiers/naiveBayes.js';
import { SoftmaxRegression } from './classifiers/softmaxRegression.js';
import { KNN } from './classifiers/knn.js';
import { extractEntities } from './ner.js';
import { analyzeSentiment } from './sentiment.js';
import { tryMathEvaluate } from './mathEval.js';
import { tryAnalytics } from '../analytics/index.js';
import { RetrievalQA } from './retrieval.js';
import { DialogueManager } from './dialogue.js';
import { formatReply } from './responder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let model = null;
let vectorizer = null;
let classifier = null;
let classifierType = null;
let intentsData = null;
let knowledgeData = null;
let retrievalQA = null;
let dialogueManager = new DialogueManager();

const INTENT_THRESHOLD = parseFloat(process.env.INTENT_THRESHOLD || '0.5');
const INTENT_MARGIN = parseFloat(process.env.INTENT_MARGIN || '0.15');

export function loadModel() {
  try {
    const modelPath = path.join(__dirname, '..', '..', 'models', 'model.json');
    if (!fs.existsSync(modelPath)) {
      console.error('Run `npm run train` first');
      process.exit(1);
    }
    model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
    vectorizer = new Vectorizer();
    vectorizer.fromJSON(model.vectorizer);
    if (model.classifierType === 'softmax') {
      classifier = new SoftmaxRegression();
      classifier.fromJSON(model.classifier);
    } else if (model.classifierType === 'knn') {
      classifier = new KNN();
      classifier.fromJSON(model.classifier);
    } else {
      classifier = new NaiveBayes();
      classifier.fromJSON(model.classifier);
    }
    classifierType = model.classifierType;
    intentsData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'intents.json'), 'utf8'));
    knowledgeData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'knowledge.json'), 'utf8'));
    buildVocabulary(intentsData, knowledgeData, path.join(__dirname, '..', '..', 'data', 'english_words.txt'));
    retrievalQA = new RetrievalQA(knowledgeData);
    retrievalQA.build();
    return true;
  } catch (e) {
    console.error('Failed to load model:', e.message);
    process.exit(1);
  }
}

export function analyze(message, history = [], context = {}) {
  const start = Date.now();
  if (!context || Object.keys(context).length === 0) {
    context = dialogueManager.initContext();
  } else {
    // ensure fields exist
    if (!context.recentJokes) context.recentJokes = [];
    if (!context.recentSentiments) context.recentSentiments = [];
  }
  
  const pipeline = {};
  const normalized = normalize(message);
  pipeline.normalized = normalized;
  
  // check name pattern for spell correction context
  const inNamePattern = /my name is|i am|call me|i'm|it's|its|im|this is|name's/i.test(message)
    || context.awaitingSlot === 'userName';
  const { tokens: tokenized, wordsOnly } = tokenize(normalized);
  pipeline.tokens = wordsOnly;
  
  const spellRes = correctSpelling(wordsOnly, { inNamePattern });
  pipeline.corrections = spellRes.corrections;
  const corrected = spellRes.tokens;
  
  const lemmas = corrected.map(w => lemmatize(w));
  const stems = lemmas.map(w => stem(w));
  pipeline.stems = stems;
  pipeline.keywords = getKeywords(corrected);
  
  const entities = extractEntities(message, normalized);
  const sentiment = analyzeSentiment(message);

  // Classify early so slot-filling can defer to a confident intent.
  const vec = vectorizer.transform(normalized);
  let probs = {};
  if (classifierType === 'knn') {
    probs = classifier.predictProba(vec, vectorizer);
  } else {
    probs = classifier.predictProba(vec);
  }
  const sorted = Object.entries(probs).sort((a, b) => b[1] - a[1]);
  const topIntents = sorted.slice(0, 3).map(([intent, p]) => ({ intent, p }));
  const top1 = sorted[0];
  const top2 = sorted[1];
  const topConfidence = top1 ? top1[1] : 0;
  const confidentIntent =
    top1 && topConfidence >= INTENT_THRESHOLD &&
    (!top2 || top1[1] - top2[1] >= INTENT_MARGIN)
      ? top1[0]
      : null;

  // Slot filling: the bot asked "What's your name?" and awaits a bare reply.
  if (context.awaitingSlot === 'userName') {
    const bare = dialogueManager.fillNameSlot(message);
    const isOtherConfidentIntent =
      confidentIntent && confidentIntent !== 'ask_my_name' && confidentIntent !== 'introduce_name';

    if (bare && !isOtherConfidentIntent) {
      const nameEntity = { text: bare, label: 'PERSON', start: 0, end: message.length };
      const reply = `Nice to meet you, ${bare}!`;
      const slotContext = { ...context, userName: bare, awaitingSlot: null };
      const updatedContext = dialogueManager.updateContext(
        slotContext, message, [nameEntity, ...entities], sentiment, 'introduce_name', reply
      );
      updatedContext.awaitingSlot = null;
      console.log(JSON.stringify({ intent: 'introduce_name', confidence: 1.0, source: 'rule', latency: Date.now() - start }));
      return {
        intent: 'introduce_name',
        confidence: 1.0,
        topIntents,
        entities: [nameEntity, ...entities],
        sentiment,
        source: 'rule',
        reply,
        context: updatedContext,
        pipeline
      };
    }
    // Not a name, but a confident different intent -> clear the slot and continue.
    if (isOtherConfidentIntent) {
      context = { ...context, awaitingSlot: null };
    }
    // Otherwise fall through; if nothing else matches, we re-ask below.
  }
  
  // Analytics check (CSV data) - before classification
  try {
    const analyticsRes = tryAnalytics(message);
    if (analyticsRes && analyticsRes.reply) {
      const updatedContext = dialogueManager.updateContext(context, message, entities, sentiment, 'analytics_query', analyticsRes.reply);
      console.log(JSON.stringify({ intent: 'analytics_query', confidence: 1.0, source: 'analytics', latency: Date.now() - start }));
      return {
        intent: 'analytics_query',
        confidence: 1.0,
        topIntents: [{ intent: 'analytics_query', p: 1.0 }],
        entities,
        sentiment,
        source: 'analytics',
        reply: analyticsRes.reply,
        context: updatedContext,
        pipeline
      };
    }
  } catch (e) {
    // ignore analytics errors, fall through
  }
  
  // Math check - more specific
  const lowerMsgCheck = message.toLowerCase();
  const hasMathOp = /\d+\s*[+\-*x\/\^%]\s*\d+|\bplus\b|\bminus\b|\btimes\b|\bdivided by\b|\bmultiplied by\b|\badd\b.*\band\b|\bsubtract\b|\bwhat is .*\d+/.test(lowerMsgCheck);
  if (hasMathOp && !lowerMsgCheck.includes('another')) {
    const mathRes = tryMathEvaluate(message);
    if (mathRes && mathRes.ok) {
      let reply = formatReply('simple_math', getResponses('simple_math'), context, entities, 'rule', { result: mathRes.result, sentiment });
      const updatedContext = dialogueManager.updateContext(context, message, entities, sentiment, 'simple_math', reply);
      console.log(JSON.stringify({ intent: 'simple_math', confidence: 1.0, source: 'rule', latency: Date.now() - start }));
      return {
        intent: 'simple_math',
        confidence: 1.0,
        topIntents: [{ intent: 'simple_math', p: 1.0 }],
        entities,
        sentiment,
        source: 'rule',
        reply,
        context: updatedContext,
        pipeline
      };
    }
  }
  
  // Follow up
  const followUp = dialogueManager.handleFollowUp(message, context);
  if (followUp) {
    if (followUp.intent === 'get_time') {
      let reply = formatReply('get_time', getResponses('get_time'), context, entities, 'rule', { sentiment });
      const updatedContext = dialogueManager.updateContext(context, message, entities, sentiment, 'get_time', reply);
      console.log(JSON.stringify({ intent: 'get_time', confidence: 1.0, source: 'rule', latency: Date.now() - start }));
      return { intent: 'get_time', confidence: 1.0, topIntents: [{ intent: 'get_time', p: 1.0 }], entities, sentiment, source: 'rule', reply, context: updatedContext, pipeline };
    }
    if (followUp.intent === 'get_date') {
      let reply = formatReply('get_date', getResponses('get_date'), context, entities, 'rule', { sentiment });
      const updatedContext = dialogueManager.updateContext(context, message, entities, sentiment, 'get_date', reply);
      console.log(JSON.stringify({ intent: 'get_date', confidence: 1.0, source: 'rule', latency: Date.now() - start }));
      return { intent: 'get_date', confidence: 1.0, topIntents: [{ intent: 'get_date', p: 1.0 }], entities, sentiment, source: 'rule', reply, context: updatedContext, pipeline };
    }
    if (followUp.intent === 'tell_joke' && followUp.wantDifferent) {
      let jokes = getResponses('tell_joke').filter(j => !(context.recentJokes || []).includes(j));
      if (jokes.length === 0) jokes = getResponses('tell_joke');
      let reply = formatReply('tell_joke', jokes, context, entities, 'intent', { sentiment, lastBotReply: context.lastBotReply });
      const updatedContext = dialogueManager.updateContext(context, message, entities, sentiment, 'tell_joke', reply);
      console.log(JSON.stringify({ intent: 'tell_joke', confidence: 1.0, source: 'intent', latency: Date.now() - start }));
      return { intent: 'tell_joke', confidence: 1.0, topIntents: [{ intent: 'tell_joke', p: 1.0 }], entities, sentiment, source: 'intent', reply, context: updatedContext, pipeline };
    }
  }
  
  // Dynamic rules
  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes('what time') || lowerMsg.includes('current time') || lowerMsg === 'time') {
    let reply = formatReply('get_time', getResponses('get_time'), context, entities, 'rule', { sentiment });
    const updatedContext = dialogueManager.updateContext(context, message, entities, sentiment, 'get_time', reply);
    console.log(JSON.stringify({ intent: 'get_time', confidence: 1.0, source: 'rule', latency: Date.now() - start }));
    return { intent: 'get_time', confidence: 1.0, topIntents: [{ intent: 'get_time', p: 1.0 }], entities, sentiment, source: 'rule', reply, context: updatedContext, pipeline };
  }
  if (lowerMsg.includes("what's the date") || lowerMsg.includes('what is the date') || lowerMsg.includes("today's date") || lowerMsg.includes('what day is it')) {
    let reply = formatReply('get_date', getResponses('get_date'), context, entities, 'rule', { sentiment });
    const updatedContext = dialogueManager.updateContext(context, message, entities, sentiment, 'get_date', reply);
    console.log(JSON.stringify({ intent: 'get_date', confidence: 1.0, source: 'rule', latency: Date.now() - start }));
    return { intent: 'get_date', confidence: 1.0, topIntents: [{ intent: 'get_date', p: 1.0 }], entities, sentiment, source: 'rule', reply, context: updatedContext, pipeline };
  }
  
  // Classification (reuse early result)
  let chosenIntent = null;
  let source = 'intent';
  let confidence = topConfidence;
  
  if (top1 && confidence >= INTENT_THRESHOLD && (!top2 || top1[1] - top2[1] >= INTENT_MARGIN)) {
    chosenIntent = top1[0];
    source = 'intent';
  } else if (top1 && confidence >= INTENT_THRESHOLD) {
    // accept if above threshold
    chosenIntent = top1[0];
    source = 'intent';
  } else {
    // try retrieval
    if (retrievalQA) {
      const res = retrievalQA.query(normalized);
      if (res) {
        let reply = res.answer;
        const updatedContext = dialogueManager.updateContext(context, message, entities, sentiment, 'knowledge_qa', reply);
        console.log(JSON.stringify({ intent: 'knowledge_qa', confidence: res.score, source: 'knowledge', latency: Date.now() - start }));
        return { intent: 'knowledge_qa', confidence: res.score, topIntents, entities, sentiment, source: 'knowledge', reply, context: updatedContext, pipeline };
      }
    }
    chosenIntent = 'unknown';
    source = 'fallback';
    confidence = top1 ? top1[1] : 0;
  }
  
  if (chosenIntent === 'unknown' || source === 'fallback') {
    // If we were waiting for the name and got something unparseable, re-ask.
    if (context.awaitingSlot === 'userName') {
      const reply = "Sorry, I didn't catch your name. What should I call you?";
      const updatedContext = dialogueManager.updateContext(context, message, entities, sentiment, 'ask_my_name', reply);
      updatedContext.awaitingSlot = 'userName';
      console.log(JSON.stringify({ intent: 'ask_my_name', confidence, source: 'rule', latency: Date.now() - start }));
      return { intent: 'ask_my_name', confidence, topIntents, entities, sentiment, source: 'rule', reply, context: updatedContext, pipeline };
    }
    const fallbacks = [
      "I'm not sure I understand. I can tell time/date, do math, tell jokes, remember your name, answer questions, or just chat!",
      "Hmm, I don't quite get that. Try asking me about the time, date, a joke, or tell me your name!",
      "I'm still learning. I can help with time, math, jokes, conversations, and more. What would you like?",
      "Could you rephrase that? I can do greetings, tell jokes, tell time/date, simple math, and remember context!"
    ];
    let reply = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    const updatedContext = dialogueManager.updateContext(context, message, entities, sentiment, 'unknown', reply);
    console.log(JSON.stringify({ intent: 'unknown', confidence, source: 'fallback', latency: Date.now() - start }));
    return { intent: 'unknown', confidence, topIntents, entities, sentiment, source: 'fallback', reply, context: updatedContext, pipeline };
  }
  
  // normal intent
  let responses = getResponses(chosenIntent);
  let extras = { sentiment, lastBotReply: context.lastBotReply };
  if (chosenIntent === 'simple_math' && source === 'intent') {
    // Classifier picked simple_math but no expression was parsed by the rule.
    const mathRes = tryMathEvaluate(message);
    const realExpr = /\d+\s*[+\-*x\/\^%]\s*\d+|\bplus\b|\bminus\b|\btimes\b|\bdivided by\b|\bmultiplied by\b|\bsubtract\b|\bmod\b|\bsquared\b|\bpower\b/.test(message.toLowerCase());
    if (mathRes && mathRes.ok && realExpr) {
      extras.result = mathRes.result;
    } else {
      // Not actually math (e.g. "its 5 pm"); fall back to a safe response.
      chosenIntent = 'unknown';
      source = 'fallback';
      responses = ["I'm not sure I understand. I can tell time/date, do math, tell jokes, remember your name, answer questions, or just chat!"];
    }
  }
  if (chosenIntent === 'ask_my_name') {
    if (context.userName) {
      responses = ["Your name is {name}!"];
    } else {
      responses = ["I don't know your name yet. What's your name?"];
    }
  }
  if (chosenIntent === 'tell_joke') {
    responses = responses.filter(r => !(context.recentJokes || []).includes(r));
    if (responses.length === 0) responses = getResponses(chosenIntent);
  }
  
  let reply = formatReply(chosenIntent, responses, context, entities, source, extras);
  const updatedContext = dialogueManager.updateContext(context, message, entities, sentiment, chosenIntent, reply);
  // If the bot just asked for the name and doesn't have it, wait for the answer.
  if (chosenIntent === 'ask_my_name' && !updatedContext.userName) {
    updatedContext.awaitingSlot = 'userName';
  }
  console.log(JSON.stringify({ intent: chosenIntent, confidence, source, latency: Date.now() - start }));
  return { intent: chosenIntent, confidence, topIntents, entities, sentiment, source, reply, context: updatedContext, pipeline };
}

function getResponses(tag) {
  if (!intentsData) return ["Hello!"];
  for (let intent of intentsData.intents) {
    if (intent.tag === tag) return intent.responses || [];
  }
  return ["I see."];
}

export function getModelInfo() {
  if (!model) return null;
  return { labels: model.labels, classifierType: model.classifierType };
}

// ensure model loaded
