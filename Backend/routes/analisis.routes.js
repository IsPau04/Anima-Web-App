// routes/analisis.routes.js  (ESM + JWT guard)
import { Router } from 'express';
import { query } from '../db/pool.js';
import { authRequired } from '../middlewares/auth.js';
import "dotenv/config";

const router = Router();

/** Normaliza el método de captura para que cumpla el CHECK de la BD */
function normalizeMetodoCaptura(raw) {
  const allowed = new Set(['camara', 'subida_imagen']);
  const s = String(raw ?? '').toLowerCase().trim();
  if (allowed.has(s)) return s;
  if (['webcam', 'camera'].includes(s)) return 'camara';
  if (['upload', 'file', 'archivo', 'imagen', 'image', 'subida'].includes(s)) return 'subida_imagen';
  return null;
}

/** Verifica que el análisis pertenezca al usuario autenticado */
async function assertOwnAnalysis(analisisId, userId) {
  const { rows } = await query(
    'SELECT 1 FROM anima.analisis WHERE id = $1 AND usuario_id = $2 LIMIT 1',
    [analisisId, userId]
  );
  return rows.length === 1;
}

/* ===================== RUTAS ===================== */

/** Crear análisis (usuario autenticado) */
router.post('/analisis', authRequired, async (req, res) => {
  try {
    const userId = req.user?.id;               // <- del JWT
    const metodo = normalizeMetodoCaptura(req.body?.metodoCaptura);

    if (!userId) return res.status(401).json({ ok: false, error: 'unauthorized' });
    if (!metodo) {
      return res.status(400).json({
        ok: false,
        error: 'metodo_captura_invalido',
        allowed: ['camara', 'subida_imagen']
      });
    }

    const { rows } = await query(
      'SELECT anima.crear_analisis($1, $2) AS analisis_id',
      [userId, metodo]
    );
    res.json({ ok: true, analisisId: rows[0].analisis_id });
  } catch (e) {
    console.error('POST /analisis error:', e);
    res.status(500).json({ ok: false, error: 'crear_analisis_failed' });
  }
});

/** Registrar emociones detectadas en un análisis del usuario */
router.post('/analisis/:id/emociones', authRequired, async (req, res) => {
  try {
    const analisisId = req.params.id;
    const userId = req.user?.id;

    if (!(await assertOwnAnalysis(analisisId, userId))) {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }

    const emociones = req.body?.emociones || [];
    if (!Array.isArray(emociones) || emociones.length === 0) {
      return res.status(400).json({ ok: false, error: 'emociones_required' });
    }

    const { rows } = await query(
      'SELECT anima.registrar_emociones($1, $2::jsonb) AS total',
      [analisisId, JSON.stringify(emociones)]
    );
    res.json({ ok: true, insertadas: rows[0].total });
  } catch (e) {
    console.error('POST /analisis/:id/emociones error:', e);
    res.status(500).json({ ok: false, error: 'registrar_emociones_failed' });
  }
});

/** Registrar playlist generada para ese análisis */
router.post('/analisis/:id/playlist', authRequired, async (req, res) => {
  try {
    const analisisId = req.params.id;
    const userId = req.user?.id;

    if (!(await assertOwnAnalysis(analisisId, userId))) {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }

    const {
      spotifyId = null,
      spotifyUrl = null,
      nombre = null,
      totalCanciones = 0,
      coverImageUrl = null,
      ownerDisplay = null
    } = req.body || {};

    const { rows } = await query(
      'SELECT anima.registrar_playlist($1,$2,$3,$4,$5) AS playlist_id',
      [analisisId, spotifyId, spotifyUrl, nombre, totalCanciones]
    );
    const playlistId = rows[0].playlist_id;

    // Metadatos opcionales (si tienes estas columnas)
    if (coverImageUrl || ownerDisplay) {
      await query(
        `UPDATE anima.playlists_generadas
           SET cover_image_url = COALESCE($2, cover_image_url),
               owner_display    = COALESCE($3, owner_display)
         WHERE id = $1`,
        [playlistId, coverImageUrl, ownerDisplay]
      );
    }

    res.json({ ok: true, playlistId });
  } catch (e) {
    console.error('POST /analisis/:id/playlist error:', e);
    res.status(500).json({ ok: false, error: 'registrar_playlist_failed' });
  }
});

/** Historial del usuario autenticado */
router.get('/historial', authRequired, async (req, res) => {
  try {
    const userId = req.user?.id;
    const limit = Number(req.query.limit ?? 50);
    const offset = Number(req.query.offset ?? 0);

    const { rows } = await query(
      'SELECT * FROM anima.obtener_historial($1,$2,$3)',
      [userId, limit, offset]
    );
    res.json({ ok: true, data: rows });
  } catch (e) {
    console.error('GET /historial error:', e);
    res.status(500).json({ ok: false, error: 'historial_failed' });
  }
});

/** Detalle de un análisis del usuario autenticado */
router.get('/analisis/:id', authRequired, async (req, res) => {
  try {
    const analisisId = req.params.id;
    const userId = req.user?.id;

    if (!(await assertOwnAnalysis(analisisId, userId))) {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }

    const { rows } = await query(
      'SELECT * FROM anima.obtener_detalle_analisis($1)',
      [analisisId]
    );
    res.json({ ok: true, data: rows[0] || null });
  } catch (e) {
    console.error('GET /analisis/:id error:', e);
    res.status(500).json({ ok: false, error: 'detalle_analisis_failed' });
  }
});

export default router;
