// backend/routes/auth.verify.js
import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

router.post("/verify-reset-code", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const code  = String(req.body?.code || "").trim();

    if (!/\S+@\S+\.\S+/.test(email) || !/^\d{4}$/.test(code)) {
      return res.status(400).json({ message: "Datos inválidos" });
    }

    // toma el más reciente sin consumir y no vencido
    const { rows } = await pool.query(
      `SELECT id, attempts, expires_at
         FROM anima.password_reset_codes
        WHERE email=$1 AND consumed=FALSE AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1`,
      [email]
    );

    if (!rows.length) {
      return res.status(400).json({ message: "Código expirado o no solicitado" });
    }

    const prc = rows[0];

    // compara el código (tomando el real desde BD)
    const match = await pool.query(
      `SELECT code FROM anima.password_reset_codes WHERE id=$1`,
      [prc.id]
    );

    if (match.rows[0].code !== code) {
      // suma intento fallido
      await pool.query(
        `UPDATE anima.password_reset_codes SET attempts = attempts + 1 WHERE id=$1`,
        [prc.id]
      );
      return res.status(400).json({ message: "Código incorrecto" });
    }

    // todo bien → generar token y consumir
    const { rows: up } = await pool.query(
      `UPDATE anima.password_reset_codes
          SET consumed=TRUE,
              reset_token = gen_random_uuid()
        WHERE id=$1
        RETURNING reset_token`,
      [prc.id]
    );

    return res.json({ success: true, resetToken: up[0].reset_token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error al verificar el código" });
  }
});

export default router;
