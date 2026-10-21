import React from 'react';

function Sidebar({ conversations, currentConv, onNewChat, onSelect, onDelete }) {
  const formatTime = (t) => {
    const d = new Date(t);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h';
    return d.toLocaleDateString();
  };

  return (
    <div className="sidebar">
      <button className="new-chat" onClick={onNewChat} aria-label="New chat">+ New chat</button>
      <div className="conv-list">
        {(conversations || []).map((c) => (
          <div
            key={c.id}
            className={`conv-item ${currentConv === c.id ? 'active' : ''}`}
            onClick={() => onSelect(c.id)}
          >
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {c.title}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
              aria-label="Delete conversation"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Sidebar;
