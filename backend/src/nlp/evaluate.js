import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadModel, analyze } from './index.js';
import { computeAccuracy, computePerClassMetrics, computeMacroF1, computeConfusionMatrix, printTable } from './metrics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function main() {
  // load model first
  try {
    loadModel();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  
  const testPath = path.join(__dirname, '..', '..', 'data', 'test_set.json');
  if (!fs.existsSync(testPath)) {
    console.error('test_set.json missing');
    process.exit(1);
  }
  const testData = JSON.parse(fs.readFileSync(testPath, 'utf8'));
  const yTrue = [], yPred = [];
  const misclassified = [];
  let belowThreshold = 0;
  
  for (let i = 0; i < testData.length; i++) {
    const item = testData[i];
    const res = analyze(item.text, [], {});
    yTrue.push(item.intent);
    yPred.push(res.intent);
    if (res.confidence < 0.5) belowThreshold++;
    if (res.intent !== item.intent) {
      misclassified.push({ text: item.text, predicted: res.intent, actual: item.intent, confidence: res.confidence });
    }
  }
  
  const labels = Array.from(new Set([...yTrue, ...yPred]));
  const acc = computeAccuracy(yTrue, yPred);
  const report = computePerClassMetrics(yTrue, yPred, labels);
  const macroF1 = computeMacroF1(report, labels);
  const matrix = computeConfusionMatrix(yTrue, yPred, labels);
  
  console.log('Accuracy:', acc);
  console.log('Macro-F1:', macroF1);
  console.log('Below threshold:', belowThreshold);
  console.log('\nPer-class:');
  for (let l of labels) {
    console.log(l + ':', report[l]);
  }
  console.log('\nConfusion matrix:');
  console.log(matrix.map(r => r.join('\t')).join('\n'));
  
  // save metrics
  const metrics = {
    accuracy: acc,
    macroF1,
    labels,
    perClass: report,
    confusionMatrix: matrix,
    misclassified,
    belowThreshold,
    testSize: testData.length
  };
  const modelsDir = path.join(__dirname, '..', '..', 'models');
  fs.writeFileSync(path.join(modelsDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
  
  // report.md
  let md = '# Evaluation Report\n\n';
  md += '## Overall\n';
  md += '- Accuracy: ' + acc + '\n';
  md += '- Macro-F1: ' + macroF1 + '\n';
  md += '- Test size: ' + testData.length + '\n';
  md += '- Below threshold: ' + belowThreshold + '\n\n';
  md += '## Per-class\n';
  md += printTable(['Class', 'Precision', 'Recall', 'F1', 'Support'], labels.map(l => [l, report[l].precision.toFixed(3), report[l].recall.toFixed(3), report[l].f1.toFixed(3), report[l].support])) + '\n\n';
  md += '## Confusion Matrix\n\n';
  md += '| | ' + labels.map(l => l).join(' | ') + ' |\n';
  md += '|' + labels.map(() => '---').join('|') + '|\n';
  for (let i = 0; i < labels.length; i++) {
    md += '| ' + labels[i] + ' | ' + matrix[i].join(' | ') + ' |\n';
  }
  md += '\n## Misclassified\n\n';
  for (let m of misclassified) {
    md += '- "' + m.text + '" -> predicted ' + m.predicted + ', actual ' + m.actual + ' (conf ' + m.confidence + ')\n';
  }
  fs.writeFileSync(path.join(modelsDir, 'report.md'), md);
  console.log('\nSaved metrics.json and report.md');
}

main();
