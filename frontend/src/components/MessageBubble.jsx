import React from 'react';
import NlpDebugPanel from './NlpDebugPanel';

function MessageBubble({ message, showNlp }) {
  const isUser = message.role === 'user';
  return (
    <div className={`message ${isUser ? 'user' : 'bot'}`}>
      <div>{message.content}</div>
      {message.createdAt && (
        <span className="message-time"> {new Date(message.createdAt).toLocaleTimeString()}</span>
      )}
      {!isUser && showNlp && message.nlp && <NlpDebugPanel nlp={message.nlp} />}
    </div>
  );
}

export default MessageBubble;
