export function computeAccuracy(yTrue, yPred) {
  let correct = 0;
  for (let i = 0; i < yTrue.length; i++) {
    if (yTrue[i] === yPred[i]) correct++;
  }
  return correct / (yTrue.length || 1);
}

export function computeConfusionMatrix(yTrue, yPred, labels) {
  const matrix = Array(labels.length).fill().map(() => Array(labels.length).fill(0));
  const labelToIdx = new Map(labels.map((l, i) => [l, i]));
  for (let i = 0; i < yTrue.length; i++) {
    const ti = labelToIdx.get(yTrue[i]);
    const pi = labelToIdx.get(yPred[i]);
    if (ti !== undefined && pi !== undefined) {
      matrix[ti][pi]++;
    }
  }
  return matrix;
}

export function computePerClassMetrics(yTrue, yPred, labels) {
  const matrix = computeConfusionMatrix(yTrue, yPred, labels);
  const report = {};
  for (let i = 0; i < labels.length; i++) {
    const tp = matrix[i][i];
    let fp = 0, fn = 0;
    for (let j = 0; j < labels.length; j++) {
      if (j !== i) fp += matrix[j][i];
      if (j !== i) fn += matrix[i][j];
    }
    const precision = tp / (tp + fp + 1e-10);
    const recall = tp / (tp + fn + 1e-10);
    const f1 = 2 * precision * recall / (precision + recall + 1e-10);
    report[labels[i]] = { precision, recall, f1, support: tp + fn };
  }
  return report;
}

export function computeMacroF1(report, labels) {
  let sum = 0;
  for (let i = 0; i < labels.length; i++) {
    sum += report[labels[i]]?.f1 || 0;
  }
  return sum / (labels.length || 1);
}

export function printTable(headers, rows) {
  const widths = headers.map((h, i) => {
    let w = h.length;
    for (let r of rows) {
      if (String(r[i]).length > w) w = String(r[i]).length;
    }
    return w;
  });
  let out = '| ' + headers.map((h, i) => h.padEnd(widths[i])).join(' | ') + ' |';
  out += '\n|' + widths.map(w => '-'.repeat(w + 2)).join('|') + '|';
  for (let r of rows) {
    out += '\n| ' + r.map((c, i) => String(c).padEnd(widths[i])).join(' | ') + ' |';
  }
  return out;
}
