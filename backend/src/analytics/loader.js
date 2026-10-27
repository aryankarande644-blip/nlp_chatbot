import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCSVWithHeader } from './csv.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedData = null;

function normalizeDate(str) {
  if (!str) return null;
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch (e) {
    return null;
  }
}

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export function loadAnalyticsData() {
  if (cachedData) return cachedData;
  
  // Try both possible locations
  let datasetDir = path.join(__dirname, '..', '..', 'Dataset');
  if (!fs.existsSync(datasetDir)) {
    datasetDir = path.join(process.cwd(), 'Dataset');
  }
  if (!fs.existsSync(datasetDir)) {
    datasetDir = path.join(process.cwd(), '..', 'Dataset');
  }
  if (!fs.existsSync(datasetDir)) {
    datasetDir = path.join(__dirname, '..', 'Dataset');
  }
  const reviewedPath = path.join(datasetDir, 'gurudev_final_reviewed_dataset.csv');
  const syntheticPath = path.join(datasetDir, 'gurudev_sentiment_synthetic_1year_dataset.csv');
  
  const data = [];
  
  // Load reviewed dataset
  try {
    if (fs.existsSync(reviewedPath)) {
      const text = fs.readFileSync(reviewedPath, 'utf8');
      const rows = parseCSVWithHeader(text);
      for (const row of rows) {
        let sentiment = (row.sentiment || '').toLowerCase().trim();
        if (sentiment === 'positive' || sentiment === 'negative' || sentiment === 'neutral') {
          // ok
        } else {
          // try to infer from scores if needed
          const pos = parseFloat(row.positive_score) || 0;
          const neg = parseFloat(row.negative_score) || 0;
          const neu = parseFloat(row.neutral_score) || 0;
          if (pos >= neg && pos >= neu) sentiment = 'positive';
          else if (neg >= pos && neg >= neu) sentiment = 'negative';
          else sentiment = 'neutral';
        }
        
        const dateStr = row.date_parsed_utc || row.date || '';
        const date = normalizeDate(dateStr);
        const platform = (row.platform || '').toUpperCase().trim();
        
        data.push({
          platform: platform === 'INSTAGRAM' ? 'INSTAGRAM' : (platform === 'X' || platform === 'TWITTER') ? 'X' : platform || 'UNKNOWN',
          date,
          sentiment,
          text: row.text || row.text_clean || '',
          likes: parseInt(row.likes) || 0,
          reposts: parseInt(row.reposts) || 0,
          replies: parseInt(row.replies) || 0,
          source: 'reviewed'
        });
      }
      console.log(`[Analytics] Loaded ${rows.length} rows from reviewed dataset`);
    }
  } catch (e) {
    console.error('[Analytics] Error loading reviewed dataset:', e.message);
  }
  
  // Load synthetic dataset (no filtering as requested)
  try {
    if (fs.existsSync(syntheticPath)) {
      const text = fs.readFileSync(syntheticPath, 'utf8');
      const rows = parseCSVWithHeader(text);
      for (const row of rows) {
        let sentiment = (row.illustrative_sentiment || '').toLowerCase().trim();
        if (sentiment !== 'positive' && sentiment !== 'negative' && sentiment !== 'neutral') {
          sentiment = 'neutral';
        }
        const dateStr = row.date || '';
        const date = normalizeDate(dateStr);
        const platform = (row.platform || '').toUpperCase().trim();
        
        data.push({
          platform: platform === 'INSTAGRAM' ? 'INSTAGRAM' : (platform === 'X' || platform === 'TWITTER') ? 'X' : platform || 'UNKNOWN',
          date,
          sentiment,
          text: row.text || '',
          likes: parseInt(row.likes) || 0,
          reposts: parseInt(row.reposts) || 0,
          replies: parseInt(row.replies) || 0,
          source: 'synthetic'
        });
      }
      console.log(`[Analytics] Loaded ${rows.length} rows from synthetic dataset`);
    }
  } catch (e) {
    console.error('[Analytics] Error loading synthetic dataset:', e.message);
  }
  
  cachedData = data;
  console.log(`[Analytics] Total loaded: ${data.length} comments`);
  return cachedData;
}

export function getAnalyticsStats() {
  const data = loadAnalyticsData();
  return {
    total: data.length,
    positive: data.filter(d => d.sentiment === 'positive').length,
    negative: data.filter(d => d.sentiment === 'negative').length,
    neutral: data.filter(d => d.sentiment === 'neutral').length,
    x: data.filter(d => d.platform === 'X').length,
    instagram: data.filter(d => d.platform === 'INSTAGRAM').length
  };
}

export { getISOWeek };
