import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { query } from './db/pool.js';
import authRoutes from './routes/auth.routes.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Raíz informativa
app.get('/', (_req, res) => {
  res.send('Ánima API ✅ — usa /health, /health/db, /auth/register, /auth/login');
});

// Healthchecks
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/health/db', async (_req, res) => {
  try {
    const { rows } = await query('SELECT NOW() as now');
    res.json({ ok: true, now: rows[0].now });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'DB_ERROR' });
  }
});

// Rutas reales de auth (Postgres + AES-256 en funciones SQL)
app.use('/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
