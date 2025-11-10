import { Router } from "express";
import { query } from "../db/pool.js";
import { authRequired } from "../middlewares/auth.js";

const router = Router();

/**
 * GET /api/me
 * Devuelve perfil básico y último acceso (último login o último análisis)
 * columnas reales del schema: display_name, email, creado_en, ultimo_login_en
 */
router.get("/me", authRequired, async (req, res) => {
  const userId = req.user.id; // UUID
  try {
    const u = (await query(
      `SELECT email, display_name, creado_en, ultimo_login_en
         FROM anima.usuarios
        WHERE id = $1`,
      [userId]
    )).rows[0];

    if (!u) return res.status(404).json({ message: "USER_NOT_FOUND" });

    // último acceso: prioriza ultimo_login_en, si no, el último análisis completado
    const last = (await query(
      `SELECT COALESCE(
          (SELECT ultimo_login_en FROM anima.usuarios WHERE id = $1),
          (SELECT MAX(realizado_en) FROM anima.analisis WHERE usuario_id = $1 AND estado = 'completado')
        ) AS last_access`,
      [userId]
    )).rows[0];

    // "username" visible: prefijo del email si no hay display_name
    const username =
      (u.display_name && u.display_name.trim()) ||
      (u.email ? u.email.split("@")[0] : "usuario");

    res.json({
      username,                 // lo usa el front como @username
      email: u.email,
      lastAccess: last?.last_access || null,
      createdAt: u.creado_en    // importante para deshabilitar chips 30d/6m
    });
  } catch (e) {
    console.error("PROFILE_ERROR:", e);
    res.status(500).json({ message: "PROFILE_ERROR" });
  }
});

/**
 * GET /api/me/stats?period=7d|30d|6m
 * Cuenta emoción dominante por análisis dentro del rango,
 * recortando por la edad de la cuenta (usuarios.creado_en).
 * Tablas: analisis(realizado_en, usuario_id, estado), emociones_detectadas(nombre, confianza)
 */
router.get("/me/stats", authRequired, async (req, res) => {
  const userId = req.user.id;
  const p = String(req.query.period || "7d").toLowerCase();
  const interval =
    p === "30d" ? "30 days" :
    p === "6m"  ? "6 months" : "7 days";

  try {
    // edad de la cuenta
    const meta = (await query(
      `SELECT creado_en FROM anima.usuarios WHERE id = $1`,
      [userId]
    )).rows[0];

    const { rows } = await query(
      `
      WITH bounds AS (
        SELECT (now() - INTERVAL '${interval}') AS want_start,
               now() AS now,
               $2::timestamptz AS created_at
      ),
      eff AS (
        SELECT GREATEST(created_at, want_start) AS start_at, now FROM bounds
      ),
      anal AS (
        SELECT a.id
          FROM anima.analisis a, eff
         WHERE a.usuario_id = $1
           AND a.estado = 'completado'
           AND a.realizado_en >= eff.start_at
      ),
      top_emo AS (
        SELECT e.analisis_id, e.nombre, e.confianza,
               ROW_NUMBER() OVER (PARTITION BY e.analisis_id ORDER BY e.confianza DESC) rn
          FROM anima.emociones_detectadas e
         WHERE e.analisis_id IN (SELECT id FROM anal)
      )
      SELECT nombre AS emotion, COUNT(*)::int AS count,
             (SELECT start_at FROM eff) AS effective_start,
             (SELECT want_start FROM bounds) AS requested_start
        FROM top_emo
       WHERE rn = 1
       GROUP BY nombre
       ORDER BY count DESC
      `,
      [userId, meta?.creado_en]
    );

    const total = rows.reduce((s, r) => s + r.count, 0);
    const effectiveStart = rows[0]?.effective_start || meta?.creado_en || null;
    const requestedStart = rows[0]?.requested_start || null;
    const clamped = requestedStart && effectiveStart && (effectiveStart > requestedStart);

    // empaqueta
    const stats = rows.map(r => ({ emotion: r.emotion, count: r.count }));

    res.json({ period: p, total, stats, effectiveStart, requestedStart, clamped });
  } catch (e) {
    console.error("STATS_ERROR:", e);
    res.status(500).json({ message: "STATS_ERROR" });
  }
});

export default router;
