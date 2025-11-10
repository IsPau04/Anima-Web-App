// Backend/index.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { query } from './db/pool.js';

import authRoutes from './routes/auth.routes.js';
import rekognitionRoutes from './routes/rekognition.routes.js';
import spotifyRoutes from './routes/spotify.routes.js';
import analisisRoutes from './routes/analisis.routes.js';
import { authRequired } from './middlewares/auth.js';
import historyRoutes from './routes/history.routes.js';
import profileRoutes from './routes/profile.routes.js';
import forgotRoutes from "./routes/auth.forgot.js";
import verifyRoutes from "./routes/auth.verify.js";
import resetRoutes from "./routes/auth.reset.js";


dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// === Middlewares base ===
// CORS: Vite en 5173 y (opcional) otra UI en 3000
app.use(cors({
  origin: ['http://localhost:3000','http://127.0.0.1:3000','http://localhost:5173'],
  credentials: true
}));

// 👇 MUY IMPORTANTE: parsear JSON ANTES de montar rutas
app.use(express.json({ limit: '10mb' }));

app.use('/api', historyRoutes);

app.use('/api', profileRoutes);
app.use("/auth", forgotRoutes);
app.use("/auth", verifyRoutes);
app.use("/auth", resetRoutes);

// === Rutas públicas básicas ===
app.get('/', (_req, res) => {
  res.send('Ánima API ✅ — usa /health, /health/db, /auth/register, /auth/login');
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/health/db', async (_req, res) => {
  try {
    const { rows } = await query('SELECT NOW() as now');
    res.json({ ok: true, now: rows[0].now });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'DB_ERROR' });
  }
});

// === Auth ===
app.use('/auth', authRoutes);

// === APIs (requieren body ya parseado) ===
app.use('/api/spotify', spotifyRoutes);
app.use('/api/rekognition', rekognitionRoutes);
app.use('/api', analisisRoutes);

// === Ejemplo de ruta protegida ===
app.get('/perfil', authRequired, async (req, res) => {
  const { rows } = await query(
    `SELECT id, email, display_name, estado, creado_en, actualizado_en, ultimo_login_en
       FROM anima.usuarios
      WHERE id = $1`,
    [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ message: 'No encontrado' });
  res.json(rows[0]);
});

// === Arranque ===
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
