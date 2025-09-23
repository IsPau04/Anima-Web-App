import { query } from '../db/pool.js';

export async function registrar(email, password, displayName) {
  const { rows } = await query(
    `SELECT anima.registrar_usuario($1,$2,$3,$4) AS id`,
    [email, password, displayName || null, process.env.ANIMA_AES_KEY]
  );
  return rows[0]?.id;
}

export async function login(email, password) {
  const { rows } = await query(
    `SELECT anima.verificar_login($1,$2,$3) AS id`,
    [email, password, process.env.ANIMA_AES_KEY]
  );
  return rows[0]?.id || null;
}
