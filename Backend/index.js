import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/', (_req, res) => {
  res.send('¡Ánima backend funcionando!');
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  if (email === 'demo@anima.com' && password === '12345678') {
    return res.json({ token: 'TOKEN_DEMO_123' });
  }
  res.status(401).send('Credenciales inválidas');
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
