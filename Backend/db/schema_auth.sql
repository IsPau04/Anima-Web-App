-- === PRE-REQS (ejecutar conectada a anima_db) ===
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- para gen_random_uuid() y PGP (cifrado simétrico)
CREATE EXTENSION IF NOT EXISTS citext;    -- para email case-insensitive

-- Esquema y defaults
CREATE SCHEMA IF NOT EXISTS anima AUTHORIZATION anima_app;

-- Hace que el search_path priorice 'anima'
ALTER DATABASE anima_db SET search_path TO anima, public;

-- Permisos para el rol de la app
GRANT USAGE ON SCHEMA anima TO anima_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA anima TO anima_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA anima
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anima_app;

-- === TABLA USUARIOS ===
CREATE TABLE IF NOT EXISTS anima.usuarios (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            CITEXT NOT NULL UNIQUE,
  password_enc     BYTEA  NOT NULL,     -- contraseña cifrada con pgp_sym_encrypt (AES-256)
  display_name     TEXT,
  estado           TEXT   NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','bloqueado','eliminado')),
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultimo_login_en  TIMESTAMPTZ
);

-- Updated_at automático
CREATE OR REPLACE FUNCTION anima_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS usuarios_set_updated_at ON anima.usuarios;
CREATE TRIGGER usuarios_set_updated_at
BEFORE UPDATE ON anima.usuarios
FOR EACH ROW EXECUTE FUNCTION anima_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON anima.usuarios (email);

-- === FUNCIONES DE REGISTRO / LOGIN (AES-256 SIMÉTRICO) ===

-- Registra usuario cifrando password con AES-256 (OpenPGP)
CREATE OR REPLACE FUNCTION anima.registrar_usuario(
  p_email        CITEXT,
  p_password     TEXT,
  p_display_name TEXT,
  p_aes_key      TEXT
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO anima.usuarios (email, password_enc, display_name)
  VALUES (
    p_email,
    pgp_sym_encrypt(p_password, p_aes_key, 'cipher-algo=aes256, compress-algo=1'),
    p_display_name
  )
  RETURNING id INTO v_id;

  RETURN v_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'El email % ya existe', p_email USING ERRCODE = '23505';
END;
$$ LANGUAGE plpgsql;

-- Verifica login descifrando y comparando; si ok, actualiza ultimo_login_en
CREATE OR REPLACE FUNCTION anima.verificar_login(
  p_email    CITEXT,
  p_password TEXT,
  p_aes_key  TEXT
) RETURNS UUID AS $$
DECLARE
  v_id      UUID;
  v_enc     BYTEA;
  v_plain   TEXT;
BEGIN
  SELECT id, password_enc INTO v_id, v_enc
  FROM anima.usuarios
  WHERE email = p_email AND estado = 'activo';

  IF v_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_plain := pgp_sym_decrypt(v_enc, p_aes_key);

  IF v_plain = p_password THEN
    UPDATE anima.usuarios SET ultimo_login_en = NOW() WHERE id = v_id;
    RETURN v_id;
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;
