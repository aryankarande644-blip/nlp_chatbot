import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  const sqlPath = path.join(__dirname, '..', 'migrations', '001_init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  try {
    await pool.query(sql);
    console.log('Migration complete');
    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error('Migration failed', e);
    await pool.end();
    process.exit(1);
  }
}

migrate();
