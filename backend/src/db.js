import './config.js';
import pkg from 'pg';
const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/chatbot'
});

export async function query(text, params) {
  return pool.query(text, params);
}
