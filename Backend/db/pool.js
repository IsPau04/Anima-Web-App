import 'dotenv/config';   // asegura que .env esté cargado antes de leer DATABASE_URL
import pg from 'pg';
const { Pool } = pg;

const isLocal = (process.env.DATABASE_URL || '').includes('localhost');

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

export async function query(text, params) {
  return pool.query(text, params);
}
