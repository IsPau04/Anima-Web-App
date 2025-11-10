// backend/routes/auth.forgot.js
import { Router } from "express";
import { sendResetCodeEmail } from "../services/mailer.js";
import { pool } from "../db/pool.js"; // ajusta a cómo exportas tu pool
import "dotenv/config";


const router = Router();

function gen4() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

router.post("/forgot-password", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ message: "Email inválido" });
    }

    // (Opcional) Comprobar que el usuario exista para “no filtrar” emails
const { rows: userRows } = await pool.query(
  `SELECT 1 FROM anima.usuarios WHERE email=$1`,
  [email]
);
const allowUnknown = process.env.ALLOW_FORGOT_FOR_UNKNOWN === "true";

if (!userRows.length) {
  // No existe → devolvemos 404 y mensaje claro
  return res.status(404).json({ message: "No existe una cuenta con ese correo." });
}

    const ttl = Number(process.env.RESET_CODE_TTL_MIN || 10);
    const code = gen4();

    // invalida códigos anteriores no usados
    await pool.query(
      `UPDATE anima.password_reset_codes
         SET consumed = TRUE
       WHERE email=$1 AND consumed = FALSE`,
      [email]
    );

    // crea el nuevo
    await pool.query(
      `INSERT INTO anima.password_reset_codes (email, code, expires_at)
       VALUES ($1,$2, NOW() + ($3 || ' minutes')::interval)`,
      [email, code, ttl]
    );

    // envía correo
    await sendResetCodeEmail({ to: email, code });

    return res.json({ success: true, sent: true });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "No se pudo enviar el código" });
  }
});

export default router;
