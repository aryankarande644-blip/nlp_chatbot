import express from 'express';
import { query } from '../db.js';
import { validateChat } from '../middleware/validate.js';
import { analyze } from '../nlp/index.js';

const router = express.Router();

router.post('/', validateChat, async (req, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) {
      return res.status(400).json({ error: 'X-Session-Id header required' });
    }
    const { conversationId, message } = req.body;
    
    let convId = conversationId;
    let context = {};
    let title = message.substring(0, 40);
    
    if (convId) {
      const convRes = await query('SELECT id, context FROM conversations WHERE id = $1 AND session_id = $2', [convId, sessionId]);
      if (convRes.rows.length === 0) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      context = convRes.rows[0].context || {};
    } else {
      const newConv = await query('INSERT INTO conversations (session_id, title, context) VALUES ($1, $2, $3) RETURNING id', [sessionId, title, context]);
      convId = newConv.rows[0].id;
    }
    
    const histRes = await query('SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY id ASC', [convId]);
    const history = histRes.rows.map(r => ({ role: r.role, content: r.content }));
    
    const nlpResult = analyze(message, history.slice(-6), context);
    
    await query('INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)', [convId, 'user', message]);
    const botRes = await query('INSERT INTO messages (conversation_id, role, content, intent, confidence, entities, sentiment, source) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, created_at', 
      [convId, 'bot', nlpResult.reply, nlpResult.intent, nlpResult.confidence, JSON.stringify(nlpResult.entities), JSON.stringify(nlpResult.sentiment), nlpResult.source]);
    
    await query('UPDATE conversations SET context = $1, updated_at = now() WHERE id = $2', [JSON.stringify(nlpResult.context), convId]);
    
    res.json({
      conversationId: convId,
      reply: {
        id: botRes.rows[0].id,
        role: 'bot',
        content: nlpResult.reply,
        createdAt: botRes.rows[0].created_at
      },
      nlp: {
        intent: nlpResult.intent,
        confidence: nlpResult.confidence,
        topIntents: nlpResult.topIntents,
        entities: nlpResult.entities,
        sentiment: nlpResult.sentiment,
        source: nlpResult.source,
        pipeline: nlpResult.pipeline
      }
    });
  } catch (e) {
    next(e);
  }
});

export default router;
