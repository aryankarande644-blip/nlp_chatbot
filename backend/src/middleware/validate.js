export function validateChat(req, res, next) {
  const { message } = req.body || {};
  if (typeof message !== 'string') {
    return res.status(400).json({ error: 'message must be a string' });
  }
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return res.status(400).json({ error: 'message cannot be empty' });
  }
  if (trimmed.length > 1000) {
    return res.status(400).json({ error: 'message too long' });
  }
  req.body.message = trimmed;
  next();
}
