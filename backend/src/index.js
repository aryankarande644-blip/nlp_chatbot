import './config.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { loadModel } from './nlp/index.js';
import chatRoutes from './routes/chat.js';
import conversationsRoutes from './routes/conversations.js';
import nlpRoutes from './routes/nlp.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(morgan('dev'));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', modelLoaded: true });
});

app.use('/api/chat', chatRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/nlp', nlpRoutes);

app.use(errorHandler);

try {
  loadModel();
  app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
  });
} catch (e) {
  console.error(e);
  process.exit(1);
}
