import { Router } from "express";
import { pool } from "../db/pool.js";
import "dotenv/config";                  // ✅ mantenlo

const router = Router();

router.post("/reset-password", async (req, res) => {
  try {
    const token = String(req.body?.resetToken || "").trim();
    const newPass = String(req.body?.newPassword || "");

    if (!token || newPass.length < 8) {
      return res.status(400).json({ message: "Datos inválidos" });
    }

    const { rows } = await pool.query(
      `SELECT email
         FROM anima.password_reset_codes
        WHERE reset_token=$1
        ORDER BY created_at DESC
        LIMIT 1`,
      [token]
    );
    if (!rows.length) {
      return res.status(400).json({ message: "Token inválido" });
    }

    const email = rows[0].email;

    // 🔐 cifrado AES (pgcrypto) en Postgres
    await pool.query(
      `UPDATE anima.usuarios
          SET password_enc = pgp_sym_encrypt($1, $2, 'cipher-algo=aes256, compress-algo=1')
        WHERE email = $3`,
      [newPass, process.env.AES_KEY, email]
    );

    await pool.query(
      `UPDATE anima.password_reset_codes
          SET consumed=TRUE
        WHERE email=$1 AND consumed=FALSE`,
      [email]
    );

    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "No se pudo actualizar la contraseña" });
  }
});

export default router;
