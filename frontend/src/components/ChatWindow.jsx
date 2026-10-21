import React, { useState, useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import api from '../api';

function ChatWindow({ conversationId, messages, setMessages, showNlp, onConversationCreated }) {
  const [sending, setSending] = useState(false);
  const [localMessages, setLocalMessages] = useState(messages || []);
  const bottomRef = useRef(null);

  useEffect(() => {
    setLocalMessages(messages || []);
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages, sending]);

  const sendMessage = async (text) => {
    const userMsg = { role: 'user', content: text, createdAt: new Date().toISOString() };
    setLocalMessages((prev) => [...prev, userMsg]);
    setSending(true);
    try {
      const res = await api.post('/api/chat', {
        conversationId,
        message: text
      });
      if (!conversationId && res.data.conversationId) {
        onConversationCreated(res.data.conversationId);
      }
      const botMsg = {
        role: 'bot',
        content: res.data.reply.content,
        createdAt: res.data.reply.createdAt,
        nlp: res.data.nlp
      };
      setLocalMessages((prev) => [...prev, botMsg]);
      setMessages && setMessages((prev) => [...(prev || []), userMsg, botMsg]);
    } catch (e) {
      const errMsg = { role: 'bot', content: 'Error: Could not reach server' };
      setLocalMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  };

  const suggestions = ["What can you do?", "Tell me a joke", "What's the time?", "What is 15 times 4?"];

  return (
    <div className="chat-window">
      <div className="message-list">
        {localMessages.length === 0 && (
          <div className="welcome">
            <h2>Welcome to NLP Chatbot</h2>
            <p>Start a conversation or try a suggestion</p>
            <div className="chips">
              {suggestions.map((s) => (
                <div key={s} className="chip" onClick={() => sendMessage(s)}>{s}</div>
              ))}
            </div>
          </div>
        )}
        {localMessages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} showNlp={showNlp} />
        ))}
        {sending && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
      <MessageInput onSend={sendMessage} disabled={sending} />
    </div>
  );
}

export default ChatWindow;
