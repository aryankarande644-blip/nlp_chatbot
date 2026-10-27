import { tryAnalytics as _tryAnalytics } from './query.js';
import { loadAnalyticsData } from './loader.js';

// Preload data on module load
try {
  loadAnalyticsData();
} catch (e) {
  console.error('[Analytics] Failed to preload:', e.message);
}

export function tryAnalytics(message) {
  try {
    return _tryAnalytics(message);
  } catch (e) {
    console.error('[Analytics] Error:', e.message);
    return null;
  }
}

export { loadAnalyticsData, getAnalyticsStats } from './loader.js';
