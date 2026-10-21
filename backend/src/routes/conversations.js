import express from 'express';
import { query } from '../db.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) return res.status(400).json({ error: 'X-Session-Id header required' });
    const result = await query('SELECT id, title, updated_at as "updatedAt" FROM conversations WHERE session_id = $1 ORDER BY updated_at DESC', [sessionId]);
    res.json(result.rows);
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) return res.status(400).json({ error: 'X-Session-Id header required' });
    const convRes = await query('SELECT id, title FROM conversations WHERE id = $1 AND session_id = $2', [req.params.id, sessionId]);
    if (convRes.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });
    const msgRes = await query('SELECT id, role, content, intent, confidence, entities, sentiment, source, created_at as "createdAt" FROM messages WHERE conversation_id = $1 ORDER BY id ASC', [req.params.id]);
    res.json({ id: convRes.rows[0].id, title: convRes.rows[0].title, messages: msgRes.rows });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) return res.status(400).json({ error: 'X-Session-Id header required' });
    const { title } = req.body || {};
    const result = await query('UPDATE conversations SET title = $1, updated_at = now() WHERE id = $2 AND session_id = $3 RETURNING id, title, updated_at as "updatedAt"', [title || 'New chat', req.params.id, sessionId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });
    res.json(result.rows[0]);
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) return res.status(400).json({ error: 'X-Session-Id header required' });
    const result = await query('DELETE FROM conversations WHERE id = $1 AND session_id = $2 RETURNING id', [req.params.id, sessionId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

export default router;
