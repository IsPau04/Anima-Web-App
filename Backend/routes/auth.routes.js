import { Router } from 'express';
import { registrar, login } from '../services/auth.service.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ ok:false, error:'EMAIL_PASSWORD_REQUIRED' });

    const id = await registrar(email, password, displayName);
    return res.status(201).json({ ok:true, userId:id });
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ ok:false, error:'EMAIL_ALREADY_EXISTS' });
    console.error(err);
    return res.status(500).json({ ok:false, error:'SERVER_ERROR' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ ok:false, error:'EMAIL_PASSWORD_REQUIRED' });

    const id = await login(email, password);
    if (!id) return res.status(401).json({ ok:false, error:'INVALID_CREDENTIALS' });

    return res.json({ ok:true, userId:id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok:false, error:'SERVER_ERROR' });
  }
});

export default router;
