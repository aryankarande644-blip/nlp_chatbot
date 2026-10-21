import React, { useState, useEffect } from 'react';
import api from '../api';

function ModelInsights() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const res = await api.get('/api/nlp/metrics');
      setMetrics(res.data);
      setError(null);
    } catch (e) {
      setError('Metrics not found. Run npm run evaluate first.');
    }
  };

  if (error) return <div className="insights"><p>{error}</p></div>;
  if (!metrics) return <div className="insights"><p>Loading...</p></div>;

  const labels = metrics.labels || [];
  const matrix = metrics.confusionMatrix || [];

  return (
    <div className="insights">
      <h2>Model Insights</h2>
      <p>Accuracy: {metrics.accuracy?.toFixed(4)} | Macro-F1: {metrics.macroF1?.toFixed(4)} | Test Size: {metrics.testSize} | Below Threshold: {metrics.belowThreshold}</p>
      
      <h3>Per-Class Metrics</h3>
      <table className="table">
        <thead>
          <tr><th>Class</th><th>Precision</th><th>Recall</th><th>F1</th><th>Support</th></tr>
        </thead>
        <tbody>
          {labels.map(l => (
            <tr key={l}>
              <td>{l}</td>
              <td>{metrics.perClass?.[l]?.precision?.toFixed(3)}</td>
              <td>{metrics.perClass?.[l]?.recall?.toFixed(3)}</td>
              <td>{metrics.perClass?.[l]?.f1?.toFixed(3)}</td>
              <td>{metrics.perClass?.[l]?.support}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Confusion Matrix</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr><th></th>{labels.map(l => <th key={l}>{l}</th>)}</tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i}>
                <td><strong>{labels[i]}</strong></td>
                {row.map((val, j) => (
                  <td key={j} style={{ background: i === j ? 'rgba(37,99,235,0.3)' : 'transparent' }}>{val}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Misclassified ({metrics.misclassified?.length || 0})</h3>
      <ul>
        {(metrics.misclassified || []).slice(0, 30).map((m, i) => (
          <li key={i}>"{m.text}" → predicted {m.predicted}, actual {m.actual} (conf {m.confidence?.toFixed(2)})</li>
        ))}
      </ul>
    </div>
  );
}

export default ModelInsights;
