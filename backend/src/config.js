import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env and let it override any pre-existing shell env (e.g. a stray PORT).
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });
