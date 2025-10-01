import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';

async function getUserById(id) {
  const { rows } = await pool.query(
    `SELECT id, email, display_name, estado, creado_en, actualizado_en, ultimo_login_en
     FROM anima.usuarios WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function register({ email, password, displayName }) {
  const { rows } = await pool.query(
    'SELECT anima.registrar_usuario($1,$2,$3,$4) AS id',
    [email.toLowerCase(), password, displayName || null, process.env.AES_KEY]
  );
  const id = rows?.[0]?.id;
  const user = await getUserById(id);
  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return { token, user };
}

export async function login({ email, password }) {
  const { rows } = await pool.query(
    'SELECT anima.verificar_login($1,$2,$3) AS id',
    [email.toLowerCase(), password, process.env.AES_KEY]
  );
  const id = rows?.[0]?.id;
  if (!id) return null;
  const user = await getUserById(id);
  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return { token, user };
}
