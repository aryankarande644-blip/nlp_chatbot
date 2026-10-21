import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getSessionId() {
  let sid = localStorage.getItem('nlp_session_id');
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem('nlp_session_id', sid);
  }
  return sid;
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'X-Session-Id': getSessionId()
  }
});

export default api;
export { getSessionId };
