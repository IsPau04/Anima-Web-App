import { Router } from 'express';
import { z } from 'zod';
import 'dotenv/config';
import { register, login } from '../services/auth.service.js';
import { query } from '../db/pool.js';
import { authRequired } from '../middlewares/auth.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(255).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = registerSchema.parse(req.body);
    const out = await register({ email, password, displayName });
    res.status(201).json(out);
  } catch (err) {
    if (err?.code === '23505') return res.status(409).json({ message: 'El email ya existe' });
    if (err?.issues) return res.status(400).json({ message: 'Datos inválidos', detail: err.issues });
    console.error(err);
    res.status(500).json({ message: 'Error en registro' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const out = await login({ email, password });
    if (!out) return res.status(401).json({ message: 'Credenciales inválidas' });
    res.json(out);
  } catch (err) {
    if (err?.issues) return res.status(400).json({ message: 'Datos inválidos', detail: err.issues });
    console.error(err);
    res.status(500).json({ message: 'Error en login' });
  }
});

/* ────────────────────────────────────────────────────────────
   CAMBIAR CONTRASEÑA (usuario autenticado)
   POST /auth/change-password
   Body: { currentPassword, newPassword }
   Header: Authorization: Bearer <token>
   ──────────────────────────────────────────────────────────── */
const changePwdSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128)
});

router.post('/change-password', authRequired, async (req, res) => {
  try {
    const { currentPassword, newPassword } = changePwdSchema.parse(req.body);
    const userId = req.user?.id;
    const AES = process.env.AES_KEY;

    if (!userId) return res.status(401).json({ message: 'No autenticado' });
    if (!AES)   return res.status(500).json({ message: 'AES_KEY no configurada' });

    // Reglas básicas (mismas del front)
    const strong =
      newPassword.length >= 8 &&
      /[A-ZÁÉÍÓÚÑ]/.test(newPassword) &&
      /[a-záéíóúñ]/.test(newPassword) &&
      /\d/.test(newPassword) &&
      /[^\w\s]/.test(newPassword);
    if (!strong) return res.status(400).json({ message: 'La nueva contraseña no cumple las reglas' });

    // 1) Traer email y estado del usuario
    const u = await query(
      `SELECT email, estado FROM anima.usuarios WHERE id = $1`,
      [userId]
    );
    if (!u.rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (u.rows[0].estado !== 'activo') {
      return res.status(403).json({ message: 'Cuenta no activa' });
    }
    const email = u.rows[0].email;

    // 2) Validar contraseña actual con la función de login
    const v = await query(
      `SELECT anima.verificar_login($1,$2,$3) AS id`,
      [email, currentPassword, AES]
    );
    if (!v.rows[0]?.id) {
      return res.status(400).json({ message: 'La contraseña actual es incorrecta' });
    }

    // 3) Evitar reutilizar la misma contraseña
    const same = await query(
      `SELECT pgp_sym_decrypt(password_enc, $2) = $1 AS same
         FROM anima.usuarios
        WHERE id = $3`,
      [newPassword, AES, userId]
    );
    if (same.rows[0]?.same) {
      return res.status(400).json({ message: 'La nueva contraseña no puede ser igual a la actual' });
    }

    // 4) Actualizar usando AES-256 (pgcrypto)
    const up = await query(
      `UPDATE anima.usuarios
          SET password_enc = pgp_sym_encrypt($1,$2,'cipher-algo=aes256, compress-algo=1'),
              actualizado_en = NOW()
        WHERE id = $3
        RETURNING id`,
      [newPassword, AES, userId]
    );

    if (up.rowCount === 0) {
      return res.status(400).json({ message: 'No se pudo cambiar la contraseña' });
    }

    // (opcional) invalidar otras sesiones/tokens aquí

    return res.json({ success: true });
  } catch (err) {
    if (err?.issues) return res.status(400).json({ message: 'Datos inválidos', detail: err.issues });
    console.error('change-password:', err);
    return res.status(500).json({ message: 'No se pudo cambiar la contraseña' });
  }
});

export default router;
