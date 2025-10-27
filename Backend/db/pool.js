import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('Falta DATABASE_URL en .env');
}

const isLocal = url.includes('localhost') || url.includes('127.0.0.1');

export const pool = new Pool({
  connectionString: url,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  keepAlive: true,
  connectionTimeoutMillis: 5000, // opcional
  idleTimeoutMillis: 30000       // opcional
});

// log de errores en el pool (para no “silenciar” errores)
pool.on('error', (err) => {
  console.error('PG Pool error:', err);
});

export const query = (text, params) => pool.query(text, params);

