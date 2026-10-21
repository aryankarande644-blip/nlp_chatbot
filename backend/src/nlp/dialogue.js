import { parseBareName } from './ner.js';

const EMPATHETIC = [
  "I'm sorry to hear that. ",
  "That sounds tough. ",
  "I understand that can be difficult. ",
  "I'm here for you. "
];

export class DialogueManager {
  constructor() {}
  
  initContext() {
    return {
      userName: null,
      awaitingSlot: null,
      lastIntent: null,
      lastEntities: [],
      lastBotReply: null,
      turns: 0,
      mood: 'neutral',
      recentJokes: [],
      recentSentiments: []
    };
  }
  
  updateContext(context, userMsg, entities, sentiment, intent, botReply) {
    const ctx = { ...context };
    ctx.turns = (ctx.turns || 0) + 1;
    
    // save name from PERSON entities
    for (let ent of entities || []) {
      if (ent.label === 'PERSON' && !ctx.userName) {
        ctx.userName = ent.text;
      }
    }
    // also check explicit name patterns
    if (!ctx.userName) {
      const m = userMsg.match(/my name is ([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i) ||
                userMsg.match(/i am ([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i) ||
                userMsg.match(/call me ([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i) ||
                userMsg.match(/i'm ([a-zA-Z]+)/i);
      if (m && m[1]) {
        let name = m[1].trim().split(/\s+/)[0];
        if (!['fine', 'good', 'tired', 'ok'].includes(name.toLowerCase())) {
          ctx.userName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        }
      }
    }
    
    ctx.lastIntent = intent;
    ctx.lastEntities = entities || [];
    ctx.lastBotReply = botReply;
    
    // mood
    if (sentiment) {
      ctx.recentSentiments = ctx.recentSentiments || [];
      ctx.recentSentiments.push(sentiment.score);
      if (ctx.recentSentiments.length > 3) ctx.recentSentiments.shift();
      const avg = ctx.recentSentiments.reduce((a, b) => a + b, 0) / ctx.recentSentiments.length;
      if (avg > 0.1) ctx.mood = 'positive';
      else if (avg < -0.1) ctx.mood = 'negative';
      else ctx.mood = 'neutral';
    }
    
    if (intent === 'tell_joke' && botReply) {
      ctx.recentJokes = ctx.recentJokes || [];
      if (!ctx.recentJokes.includes(botReply)) ctx.recentJokes.push(botReply);
      if (ctx.recentJokes.length > 10) ctx.recentJokes.shift();
    }
    
    return ctx;
  }
  
  /**
   * When the bot is awaiting the user's name, try to fill the slot.
   * Returns the parsed (Title-Cased) name, or null.
   */
  fillNameSlot(message) {
    return parseBareName(message);
  }
  
  handleFollowUp(message, context, intentsData) {
    const tokens = message.toLowerCase().trim().split(/\s+/);
    if (tokens.length <= 3 && context.lastIntent) {
      if (context.lastIntent === 'get_time') {
        return { intent: 'get_time', source: 'rule', isFollowUp: true };
      }
      if (context.lastIntent === 'get_date') {
        return { intent: 'get_date', source: 'rule', isFollowUp: true };
      }
      if (context.lastIntent === 'tell_joke') {
        if (tokens.includes('another') || tokens.includes('more') || tokens.includes('again')) {
          return { intent: 'tell_joke', source: 'intent', isFollowUp: true, wantDifferent: true };
        }
      }
      if (context.lastIntent === 'how_are_you') {
        // respond to sentiment
        return null;
      }
    }
    return null;
  }
}
