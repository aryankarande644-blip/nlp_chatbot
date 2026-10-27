import { loadAnalyticsData, getISOWeek } from './loader.js';

function normalize(s) {
  return (s || '').toLowerCase();
}

function extractSentimentFilter(msg) {
  const m = normalize(msg);
  if (m.includes('positive') && !m.includes('negative') && !m.includes('neutral')) {
    // check if it's asking about positive specifically
    if (m.match(/positive/)) return 'positive';
  }
  if (m.includes('negative') && !m.includes('positive')) return 'negative';
  if (m.includes('neutral') && !m.includes('positive') && !m.includes('negative')) return 'neutral';
  // if multiple mentioned, return null (no specific filter)
  const pos = (m.match(/positive/g) || []).length;
  const neg = (m.match(/negative/g) || []).length;
  const neu = (m.match(/neutral/g) || []).length;
  if (pos > 0 && neg === 0 && neu === 0) return 'positive';
  if (neg > 0 && pos === 0 && neu === 0) return 'negative';
  if (neu > 0 && pos === 0 && neg === 0) return 'neutral';
  return null;
}

function extractPlatformFilter(msg) {
  const m = normalize(msg);
  if (m.includes('instagram') || m.includes('insta')) return 'INSTAGRAM';
  if (m.includes(' twitter') || m.match(/\bx\b/) || m.includes('from x')) return 'X';
  return null;
}

function extractTimeGroup(msg) {
  const m = normalize(msg);
  if (m.includes('by week') || m.includes('per week') || m.includes('weekly')) return 'week';
  if (m.includes('by month') || m.includes('per month') || m.includes('monthly')) return 'month';
  if (m.includes('by year') || m.includes('per year') || m.includes('yearly')) return 'year';
  // if asking "when were most..." without specifying, default to month
  if (m.includes('when were') && (m.includes('most') || m.includes('least'))) {
    if (m.includes('week')) return 'week';
    return 'month';
  }
  return null;
}

function extractMonthYear(msg) {
  const m = normalize(msg);
  const months = {
    january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3,
    may: 4, june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7, september: 8, sep: 8, sept: 8,
    october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11
  };
  for (const [name, idx] of Object.entries(months)) {
    if (m.includes(name)) {
      const yearMatch = m.match(/20\d{2}/);
      const year = yearMatch ? parseInt(yearMatch[0]) : null;
      return { month: idx, year };
    }
  }
  const yearMatch = m.match(/20\d{2}/);
  if (yearMatch && (m.includes('year') || m.includes('in 20'))) {
    return { year: parseInt(yearMatch[0]) };
  }
  return null;
}

function isAnalyticsQuestion(msg) {
  const m = normalize(msg);
  const patterns = [
    /how many/i,
    /count of/i,
    /\bcount\b/i,
    /total (comments|posts|likes)/i,
    /when were most/i,
    /when were there most/i,
    /which month.*most/i,
    /which week.*most/i,
    /which (month|week|year).*had/i,
    /most (positive|negative|neutral)/i,
    /least (positive|negative|neutral)/i,
    /comments.*(instagram|insta|twitter|\bx\b)/i,
    /(instagram|insta|twitter|\bx\b).*comments/i,
    /likes.*most/i,
    /most likes/i,
    /engagement/i
  ];
  for (const p of patterns) {
    if (p.test(msg)) return true;
  }
  // also catch if asking about positive/negative/neutral comments with counts
  if ((m.includes('positive') || m.includes('negative') || m.includes('neutral')) && 
      (m.includes('comment') || m.includes('how many'))) {
    return true;
  }
  return false;
}

export function tryAnalytics(message) {
  if (!isAnalyticsQuestion(message)) return null;
  
  const data = loadAnalyticsData();
  if (!data || data.length === 0) {
    return { reply: "I don't have any comment data loaded right now." };
  }
  
  const m = normalize(message);
  const sentimentFilter = extractSentimentFilter(message);
  const platformFilter = extractPlatformFilter(message);
  const timeGroup = extractTimeGroup(message);
  const monthYearFilter = extractMonthYear(message);
  
  let filtered = [...data];
  if (sentimentFilter) {
    filtered = filtered.filter(d => d.sentiment === sentimentFilter);
  }
  if (platformFilter) {
    filtered = filtered.filter(d => d.platform === platformFilter);
  }
  if (monthYearFilter) {
    if (monthYearFilter.month !== undefined) {
      filtered = filtered.filter(d => d.date && d.date.getMonth() === monthYearFilter.month && 
        (monthYearFilter.year ? d.date.getFullYear() === monthYearFilter.year : true));
    }
    if (monthYearFilter.year !== undefined && monthYearFilter.month === undefined) {
      filtered = filtered.filter(d => d.date && d.date.getFullYear() === monthYearFilter.year);
    }
  }
  
  // "when were most X comments" - group by time
  if (m.includes('when were') || m.includes('which month') || m.includes('which week') || 
      (m.includes('most') && timeGroup)) {
    if (timeGroup === 'week') {
      const groups = {};
      for (const d of filtered) {
        if (!d.date) continue;
        const key = `${d.date.getFullYear()}-W${String(getISOWeek(d.date)).padStart(2, '0')}`;
        groups[key] = (groups[key] || 0) + 1;
      }
      const entries = Object.entries(groups).sort((a, b) => b[1] - a[1]);
      if (entries.length === 0) return { reply: "I don't have enough dated data to determine that." };
      const [topKey, topCount] = entries[0];
      const sentLabel = sentimentFilter || 'comments';
      const platLabel = platformFilter ? ` from ${platformFilter === 'INSTAGRAM' ? 'Instagram' : 'X'}` : '';
      return { reply: `The most ${sentLabel} comments${platLabel} occurred in week ${topKey.split('-W')[1]} of ${topKey.split('-')[0]} with ${topCount} ${sentLabel} comments.` };
    } else if (timeGroup === 'year') {
      const groups = {};
      for (const d of filtered) {
        if (!d.date) continue;
        const key = String(d.date.getFullYear());
        groups[key] = (groups[key] || 0) + 1;
      }
      const entries = Object.entries(groups).sort((a, b) => b[1] - a[1]);
      if (entries.length === 0) return { reply: "I don't have enough dated data to determine that." };
      const [topKey, topCount] = entries[0];
      const sentLabel = sentimentFilter || 'comments';
      return { reply: `The most ${sentLabel} comments occurred in ${topKey} with ${topCount} ${sentLabel} comments.` };
    } else {
      // default to month
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const groups = {};
      for (const d of filtered) {
        if (!d.date) continue;
        const key = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}`;
        groups[key] = (groups[key] || 0) + 1;
      }
      const entries = Object.entries(groups).sort((a, b) => b[1] - a[1]);
      if (entries.length === 0) return { reply: "I don't have enough dated data to determine that." };
      const [topKey, topCount] = entries[0];
      const [year, month] = topKey.split('-');
      const sentLabel = sentimentFilter || 'comments';
      const platLabel = platformFilter ? ` from ${platformFilter === 'INSTAGRAM' ? 'Instagram' : 'X'}` : '';
      return { reply: `The most ${sentLabel} comments${platLabel} occurred in ${monthNames[parseInt(month) - 1]} ${year} with ${topCount} ${sentLabel} comments.` };
    }
  }
  
  // "which month had the most comments" (general)
  if (m.includes('which month') && m.includes('most')) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const groups = {};
    for (const d of filtered) {
      if (!d.date) continue;
      const key = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}`;
      groups[key] = (groups[key] || 0) + 1;
    }
    const entries = Object.entries(groups).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return { reply: "I don't have enough dated data to determine that." };
    const [topKey, topCount] = entries[0];
    const [year, month] = topKey.split('-');
    const sentLabel = sentimentFilter ? sentimentFilter + ' ' : '';
    return { reply: `The month with the most ${sentLabel}comments was ${monthNames[parseInt(month) - 1]} ${year} with ${topCount} comments.` };
  }
  
  // "most likes" / engagement
  if (m.includes('most likes') || (m.includes('likes') && (m.includes('most') || m.includes('highest')))) {
    let best = null;
    for (const d of filtered) {
      if (!best || d.likes > best.likes) best = d;
    }
    if (!best) return { reply: "I couldn't find like data for that." };
    const plat = best.platform === 'INSTAGRAM' ? 'Instagram' : best.platform;
    return { reply: `The post/comment with the most likes${sentimentFilter ? ` (${sentimentFilter})` : ''} had ${best.likes} likes on ${plat}.` };
  }
  
  // Simple counts
  if (m.includes('how many') || m.includes('count') || m.includes('total')) {
    const count = filtered.length;
    const sentLabel = sentimentFilter ? sentimentFilter + ' ' : '';
    const platLabel = platformFilter ? ` from ${platformFilter === 'INSTAGRAM' ? 'Instagram' : 'X'}` : '';
    const timeLabel = monthYearFilter ? (monthYearFilter.month !== undefined ? 
      ` in ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][monthYearFilter.month]}${monthYearFilter.year ? ' ' + monthYearFilter.year : ''}` :
      ` in ${monthYearFilter.year}`) : '';
    
    if (m.includes('total')) {
      return { reply: `There are ${count} total comments${platLabel}${timeLabel} in the dataset.` };
    }
    return { reply: `There are ${count} ${sentLabel}comments${platLabel}${timeLabel}.` };
  }
  
  // Fallback for general analytics queries
  const count = filtered.length;
  const sentLabel = sentimentFilter ? sentimentFilter + ' ' : '';
  const platLabel = platformFilter ? ` from ${platformFilter === 'INSTAGRAM' ? 'Instagram' : 'X'}` : '';
  return { reply: `There are ${count} ${sentLabel}comments${platLabel} matching your query.` };
}
