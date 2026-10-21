import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import ModelInsights from './components/ModelInsights';
import api from './api';

function App() {
  const [conversations, setConversations] = useState([]);
  const [currentConv, setCurrentConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [showNlp, setShowNlp] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [view, setView] = useState('chat'); // chat or insights
  const [error, setError] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const res = await api.get('/api/conversations');
      setConversations(res.data);
      setError(null);
    } catch (e) {
      setError('Backend unreachable');
    }
  };

  const newChat = () => {
    setCurrentConv(null);
    setMessages([]);
  };

  const selectConversation = async (id) => {
    try {
      const res = await api.get('/api/conversations/' + id);
      setCurrentConv(res.data.id);
      setMessages(res.data.messages);
      setView('chat');
      setError(null);
    } catch (e) {
      setError('Failed to load conversation');
    }
  };

  const deleteConversation = async (id) => {
    try {
      await api.delete('/api/conversations/' + id);
      if (currentConv === id) {
        newChat();
      }
      loadConversations();
    } catch (e) {
      setError('Failed to delete');
    }
  };

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        currentConv={currentConv}
        onNewChat={newChat}
        onSelect={selectConversation}
        onDelete={deleteConversation}
      />
      <div className="main">
        <div className="topbar">
          <div className="app-name">NLP Chatbot</div>
          <div className="topbar-actions">
            <button onClick={() => setView(view === 'chat' ? 'insights' : 'chat')}>
              {view === 'chat' ? 'Model Insights' : 'Back to Chat'}
            </button>
            <label>
              <input type="checkbox" checked={showNlp} onChange={(e) => setShowNlp(e.target.checked)} />
              Show NLP details
            </label>
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? 'Dark' : 'Light'}
            </button>
          </div>
        </div>
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={loadConversations}>Retry</button>
          </div>
        )}
        {view === 'chat' ? (
          <ChatWindow
            conversationId={currentConv}
            messages={messages}
            setMessages={setMessages}
            showNlp={showNlp}
            onConversationCreated={(id) => {
              setCurrentConv(id);
              loadConversations();
            }}
          />
        ) : (
          <ModelInsights />
        )}
      </div>
    </div>
  );
}

export default App;
