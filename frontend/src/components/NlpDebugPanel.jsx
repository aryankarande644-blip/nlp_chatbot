import React from 'react';

function NlpDebugPanel({ nlp }) {
  if (!nlp) return null;
  const confPct = Math.round((nlp.confidence || 0) * 100);
  return (
    <div className="nlp-panel">
      <div className="nlp-row"><strong>Intent:</strong> {nlp.intent} ({confPct}%)</div>
      <div className="conf-bar" style={{ width: confPct + '%' }}></div>
      {nlp.topIntents && (
        <div className="nlp-row">
          <strong>Top-3:</strong> {nlp.topIntents.map((t, i) => t.intent + '(' + Math.round(t.p*100) + '%)').join(', ')}
        </div>
      )}
      {nlp.entities && nlp.entities.length > 0 && (
        <div className="nlp-row">
          <strong>Entities:</strong>{' '}
          {nlp.entities.map((e, i) => <span key={i} className="chip-small">{e.label}:{e.text}</span>)}
        </div>
      )}
      {nlp.sentiment && (
        <div className="nlp-row"><strong>Sentiment:</strong> {nlp.sentiment.label} ({nlp.sentiment.score?.toFixed(3)})</div>
      )}
      <div className="nlp-row"><strong>Source:</strong> {nlp.source}</div>
      {nlp.pipeline && (
        <>
          <div className="nlp-row"><strong>Normalized:</strong> {nlp.pipeline.normalized}</div>
          <div className="nlp-row"><strong>Tokens:</strong> {(nlp.pipeline.tokens || []).join(', ')}</div>
          {nlp.pipeline.corrections && nlp.pipeline.corrections.length > 0 && (
            <div className="nlp-row"><strong>Corrections:</strong> {nlp.pipeline.corrections.map(c => c.from + '→' + c.to).join(', ')}</div>
          )}
          <div className="nlp-row"><strong>Stems:</strong> {(nlp.pipeline.stems || []).join(', ')}</div>
        </>
      )}
    </div>
  );
}

export default NlpDebugPanel;
