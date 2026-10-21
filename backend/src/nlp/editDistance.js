export function damerauLevenshtein(a, b, maxDistance = Infinity) {
  if (a === b) return 0;
  const alen = a.length;
  const blen = b.length;
  if (alen === 0) return blen;
  if (blen === 0) return alen;
  
  // Use DP table
  const dp = Array(alen + 2).fill().map(() => Array(blen + 2).fill(0));
  const maxdist = alen + blen;
  dp[0][0] = maxdist;
  for (let i = 0; i <= alen; i++) {
    dp[i + 1][0] = maxdist;
    dp[i + 1][1] = i;
  }
  for (let j = 0; j <= blen; j++) {
    dp[0][j + 1] = maxdist;
    dp[1][j + 1] = j;
  }
  
  const lastRow = new Map();
  for (let i = 1; i <= alen; i++) {
    let lastMatchCol = 0;
    for (let j = 1; j <= blen; j++) {
      let i1 = lastRow.get(b[j - 1]) || 0;
      let j1 = lastMatchCol;
      let cost = a[i - 1] === b[j - 1] ? 0 : 1;
      if (cost === 0) lastMatchCol = j;
      dp[i + 1][j + 1] = Math.min(
        dp[i][j] + cost,        // substitution
        dp[i + 1][j] + 1,       // insertion
        dp[i][j + 1] + 1,       // deletion
        dp[i1][j1] + (i - i1 - 1) + 1 + (j - j1 - 1) // transposition
      );
    }
    lastRow.set(a[i - 1], i);
    if (maxDistance !== Infinity) {
      // early exit simple check not critical
    }
  }
  const dist = dp[alen + 1][blen + 1];
  if (dist > maxDistance) return dist + 1; // indicate > max
  return dist;
}

export function distance(a, b, maxDistance = Infinity) {
  const d = damerauLevenshtein(a.toLowerCase(), b.toLowerCase(), maxDistance);
  if (d > maxDistance && maxDistance !== Infinity) return maxDistance + 1;
  return d;
}
