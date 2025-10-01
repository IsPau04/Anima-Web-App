import { Router } from 'express';
import { z } from 'zod';
import { register, login } from '../services/auth.service.js';

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

export default router;
