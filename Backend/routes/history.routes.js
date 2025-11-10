import { Router } from "express";
import { query } from "../db/pool.js";
import { authRequired } from "../middlewares/auth.js";

const router = Router();

/**
 * GET /api/history
 * Devuelve historial con estructura para tu Historial.js
 * Tablas reales: anima.analisis, anima.emociones_detectadas, anima.playlists_generadas
 */
router.get("/history", authRequired, async (req, res) => {
  try {
    const userId = req.user.id; // UUID

    const { rows } = await query(`
      WITH emo AS (
        SELECT e.analisis_id,
               jsonb_agg(
                 jsonb_build_object('name', e.nombre, 'score', e.confianza)
                 ORDER BY e.confianza DESC
               ) AS emotions
        FROM anima.emociones_detectadas e
        GROUP BY e.analisis_id
      )
      SELECT
        a.id                                AS id,
        a.realizado_en                      AS "timestamp",
        COALESCE(emo.emotions, '[]'::jsonb) AS emotions,
        COALESCE(
          p.spotify_playlist_url,
          CASE WHEN p.spotify_playlist_id IS NOT NULL
               THEN 'https://open.spotify.com/playlist/' || p.spotify_playlist_id
               ELSE NULL END
        )                                   AS "playlistUrl",
        p.nombre_playlist                   AS "playlistName",
        p.cover_image_url                   AS "coverUrl"
      FROM anima.analisis a
      LEFT JOIN emo ON emo.analisis_id = a.id
      LEFT JOIN anima.playlists_generadas p ON p.analisis_id = a.id
      WHERE a.usuario_id = $1
        AND a.estado = 'completado'
      ORDER BY a.realizado_en DESC
      LIMIT 200
    `, [userId]);

    res.json({ history: rows });
  } catch (e) {
    console.error("HISTORY_ERROR:", e);
    res.status(500).json({
      message: e.message || "HISTORY_ERROR",
      code: e.code || null,
    });
  }
});

/**
 * DELETE /api/history/:id
 * Elimina un análisis y sus dependencias (UUID)
 */
router.delete("/history/:id", authRequired, async (req, res) => {
  const analisisId = req.params.id; // UUID string
  const userId = req.user.id;

  try {
    // Verifica propiedad
    const { rowCount } = await query(
      `SELECT 1 FROM anima.analisis WHERE id = $1 AND usuario_id = $2`,
      [analisisId, userId]
    );
    if (!rowCount) return res.status(404).json({ success: false, message: "NOT_FOUND" });

    // Borra dependencias (ON DELETE CASCADE ya lo haría, pero por si acaso)
    await query(`DELETE FROM anima.playlists_generadas WHERE analisis_id = $1`, [analisisId]);
    await query(`DELETE FROM anima.emociones_detectadas WHERE analisis_id = $1`, [analisisId]);
    const del = await query(`DELETE FROM anima.analisis WHERE id = $1 AND usuario_id = $2`, [analisisId, userId]);

    res.json({ success: del.rowCount > 0 });
  } catch (e) {
    console.error("HISTORY_DELETE_ERROR:", e);
    res.status(500).json({ success: false, message: "HISTORY_DELETE_ERROR" });
  }
});

export default router;
