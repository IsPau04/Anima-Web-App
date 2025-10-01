const BASE = import.meta.env.VITE_API_URL;

export async function registerUser({ email, password, displayName }) {
  const r = await fetch(`${BASE}/auth/register`, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ email, password, displayName })
  });
  const data = await r.json(); if (!r.ok) throw new Error(data.message||'Error registro'); return data;
}

export async function loginUser({ email, password }) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ email, password })
  });
  const data = await r.json(); if (!r.ok) throw new Error(data.message||'Error login'); return data;
}

export async function getPerfil(token) {
  const r = await fetch(`${BASE}/perfil`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error('No autorizado'); return r.json();
}
