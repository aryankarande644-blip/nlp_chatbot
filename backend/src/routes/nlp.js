import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyze } from '../nlp/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

router.post('/analyze', (req, res) => {
  const { message } = req.body || {};
  if (!message) return res.status(400).json({ error: 'message required' });
  const result = analyze(message, [], {});
  res.json(result);
});

router.get('/metrics', (req, res) => {
  const metricsPath = path.join(__dirname, '..', '..', 'models', 'metrics.json');
  if (!fs.existsSync(metricsPath)) {
    return res.status(404).json({ error: 'Metrics not found. Run npm run evaluate' });
  }
  const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
  res.json(metrics);
});

export default router;
