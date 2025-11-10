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

-- ==============================
-- TABLA: USUARIOS (existente)
-- ==============================
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

-- ==============================
-- TABLA: ANALISIS (核心)
-- ==============================
-- Cada registro = 1 análisis emocional del usuario
CREATE TABLE IF NOT EXISTS anima.analisis (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id       UUID NOT NULL REFERENCES anima.usuarios(id) ON DELETE CASCADE,
  
  -- Metadata del análisis
  realizado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metodo_captura   TEXT CHECK (metodo_captura IN ('camara', 'subida_imagen')), -- opcional
  
  -- Emoción dominante (desnormalizado para búsquedas rápidas)
  emocion_principal TEXT,           -- ej: "Alegre", "Triste"
  confianza_principal NUMERIC(5,2), -- score 0.00-100.00
  
  -- Estados
  estado           TEXT NOT NULL DEFAULT 'completado' 
                   CHECK (estado IN ('procesando','completado','error')),
  error_mensaje    TEXT,            -- si estado = 'error'
  
  -- Timestamps
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analisis_usuario ON anima.analisis (usuario_id, realizado_en DESC);
CREATE INDEX IF NOT EXISTS idx_analisis_estado ON anima.analisis (estado);

DROP TRIGGER IF EXISTS analisis_set_updated_at ON anima.analisis;
CREATE TRIGGER analisis_set_updated_at
BEFORE UPDATE ON anima.analisis
FOR EACH ROW EXECUTE FUNCTION anima_set_updated_at();

-- ==============================
-- TABLA: EMOCIONES_DETECTADAS
-- ==============================
-- Relación 1:N con analisis (un análisis puede tener múltiples emociones)
CREATE TABLE IF NOT EXISTS anima.emociones_detectadas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analisis_id    UUID NOT NULL REFERENCES anima.analisis(id) ON DELETE CASCADE,
  
  nombre         TEXT NOT NULL,       -- "Alegre", "Triste", "Enojado", etc.
  confianza      NUMERIC(5,2) NOT NULL CHECK (confianza >= 0 AND confianza <= 100),
  
  -- Opcional: coordenadas de región facial si usas bounding boxes
  bbox_x         INTEGER,
  bbox_y         INTEGER,
  bbox_width     INTEGER,
  bbox_height    INTEGER,
  
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emociones_analisis ON anima.emociones_detectadas (analisis_id);

-- ==============================
-- TABLA: PLAYLISTS_GENERADAS
-- ==============================
-- Relación 1:1 o 1:N con analisis (un análisis puede generar múltiples playlists)
CREATE TABLE IF NOT EXISTS anima.playlists_generadas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analisis_id       UUID NOT NULL REFERENCES anima.analisis(id) ON DELETE CASCADE,
  
  -- Datos de Spotify
  spotify_playlist_id   TEXT,              -- ID de Spotify (ej: "37i9dQZF1DXcBWIGoYBM5M")
  spotify_playlist_url  TEXT,              -- URL completa
  nombre_playlist       TEXT,              -- Nombre generado (ej: "Ánima: Alegre")
  
  -- Metadata
  total_canciones      INTEGER DEFAULT 0,
  duracion_ms          BIGINT,             -- duración total en milisegundos
  generos_incluidos    TEXT[],             -- array de géneros
  
  -- Estados
  estado               TEXT NOT NULL DEFAULT 'generada'
                       CHECK (estado IN ('generando','generada','error')),
  error_mensaje        TEXT,
  
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_playlists_analisis ON anima.playlists_generadas (analisis_id);

-- ==============================
-- TABLA: IMAGENES_ANALISIS (OPCIONAL)
-- ==============================
-- Si quieres almacenar las imágenes capturadas/subidas
-- Alternativa: usar cloud storage (S3, Cloudinary) y guardar solo la URL
CREATE TABLE IF NOT EXISTS anima.imagenes_analisis (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analisis_id    UUID NOT NULL REFERENCES anima.analisis(id) ON DELETE CASCADE,
  
  -- Opción 1: Guardar en DB (no recomendado para producción)
  imagen_data    BYTEA,                    -- datos binarios de la imagen
  
  -- Opción 2: Guardar URL de cloud storage (RECOMENDADO)
  imagen_url     TEXT,                     -- URL de S3/Cloudinary/etc
  
  -- Metadata
  mime_type      TEXT,                     -- "image/jpeg", "image/png"
  tamanio_bytes  INTEGER,
  ancho_px       INTEGER,
  alto_px        INTEGER,
  
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_imagenes_analisis ON anima.imagenes_analisis (analisis_id);

-- ==============================
-- FUNCIONES DE REGISTRO / LOGIN (existentes)
-- ==============================

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

-- ==============================
-- FUNCIONES AUXILIARES
-- ==============================

-- Crear nuevo análisis y retornar su ID
CREATE OR REPLACE FUNCTION anima.crear_analisis(
  p_usuario_id UUID,
  p_metodo_captura TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_analisis_id UUID;
BEGIN
  INSERT INTO anima.analisis (usuario_id, metodo_captura, estado)
  VALUES (p_usuario_id, p_metodo_captura, 'procesando')
  RETURNING id INTO v_analisis_id;
  
  RETURN v_analisis_id;
END;
$$ LANGUAGE plpgsql;

-- Registrar emociones detectadas
CREATE OR REPLACE FUNCTION anima.registrar_emociones(
  p_analisis_id UUID,
  p_emociones JSONB  -- formato: [{"nombre":"Alegre","confianza":85.5}, ...]
) RETURNS INTEGER AS $$
DECLARE
  v_emocion JSONB;
  v_count INTEGER := 0;
  v_max_confianza NUMERIC := 0;
  v_emocion_principal TEXT;
BEGIN
  -- Insertar todas las emociones
  FOR v_emocion IN SELECT * FROM jsonb_array_elements(p_emociones)
  LOOP
    INSERT INTO anima.emociones_detectadas (analisis_id, nombre, confianza)
    VALUES (
      p_analisis_id,
      v_emocion->>'nombre',
      (v_emocion->>'confianza')::NUMERIC
    );
    
    v_count := v_count + 1;
    
    -- Encontrar emoción principal
    IF (v_emocion->>'confianza')::NUMERIC > v_max_confianza THEN
      v_max_confianza := (v_emocion->>'confianza')::NUMERIC;
      v_emocion_principal := v_emocion->>'nombre';
    END IF;
  END LOOP;
  
  -- Actualizar análisis con emoción principal
  UPDATE anima.analisis
  SET emocion_principal = v_emocion_principal,
      confianza_principal = v_max_confianza,
      estado = 'completado'
  WHERE id = p_analisis_id;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Registrar playlist generada
CREATE OR REPLACE FUNCTION anima.registrar_playlist(
  p_analisis_id UUID,
  p_spotify_id TEXT,
  p_spotify_url TEXT,
  p_nombre TEXT,
  p_total_canciones INTEGER DEFAULT 0
) RETURNS UUID AS $$
DECLARE
  v_playlist_id UUID;
BEGIN
  INSERT INTO anima.playlists_generadas (
    analisis_id,
    spotify_playlist_id,
    spotify_playlist_url,
    nombre_playlist,
    total_canciones,
    estado
  )
  VALUES (
    p_analisis_id,
    p_spotify_id,
    p_spotify_url,
    p_nombre,
    p_total_canciones,
    'generada'
  )
  RETURNING id INTO v_playlist_id;
  
  RETURN v_playlist_id;
END;
$$ LANGUAGE plpgsql;

-- Obtener historial de análisis de un usuario
CREATE OR REPLACE FUNCTION anima.obtener_historial(
  p_usuario_id UUID,
  p_limite INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID,
  realizado_en TIMESTAMPTZ,
  emocion_principal TEXT,
  confianza_principal NUMERIC,
  playlist_url TEXT,
  total_emociones BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.realizado_en,
    a.emocion_principal,
    a.confianza_principal,
    p.spotify_playlist_url,
    COUNT(e.id) as total_emociones
  FROM anima.analisis a
  LEFT JOIN anima.playlists_generadas p ON p.analisis_id = a.id
  LEFT JOIN anima.emociones_detectadas e ON e.analisis_id = a.id
  WHERE a.usuario_id = p_usuario_id
    AND a.estado = 'completado'
  GROUP BY a.id, a.realizado_en, a.emocion_principal, a.confianza_principal, p.spotify_playlist_url
  ORDER BY a.realizado_en DESC
  LIMIT p_limite
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Obtener detalles completos de un análisis
CREATE OR REPLACE FUNCTION anima.obtener_detalle_analisis(
  p_analisis_id UUID
) RETURNS TABLE (
  analisis_id UUID,
  usuario_id UUID,
  realizado_en TIMESTAMPTZ,
  emocion_principal TEXT,
  emociones JSONB,
  playlist_url TEXT,
  imagen_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.usuario_id,
    a.realizado_en,
    a.emocion_principal,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'nombre', e.nombre,
          'confianza', e.confianza
        ) ORDER BY e.confianza DESC
      )
      FROM anima.emociones_detectadas e
      WHERE e.analisis_id = a.id
    ) as emociones,
    p.spotify_playlist_url,
    i.imagen_url
  FROM anima.analisis a
  LEFT JOIN anima.playlists_generadas p ON p.analisis_id = a.id
  LEFT JOIN anima.imagenes_analisis i ON i.analisis_id = a.id
  WHERE a.id = p_analisis_id;
END;
$$ LANGUAGE plpgsql;

-- ==============================
-- VISTAS ÚTILES
-- ==============================

-- Vista: Resumen de análisis con emociones
CREATE OR REPLACE VIEW anima.v_analisis_completo AS
SELECT 
  a.id as analisis_id,
  a.usuario_id,
  u.email,
  u.display_name,
  a.realizado_en,
  a.emocion_principal,
  a.confianza_principal,
  a.estado,
  p.spotify_playlist_url,
  p.nombre_playlist,
  p.total_canciones,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'nombre', e.nombre,
        'confianza', e.confianza
      ) ORDER BY e.confianza DESC
    )
    FROM anima.emociones_detectadas e
    WHERE e.analisis_id = a.id
  ) as todas_emociones,
  i.imagen_url
FROM anima.analisis a
JOIN anima.usuarios u ON u.id = a.usuario_id
LEFT JOIN anima.playlists_generadas p ON p.analisis_id = a.id
LEFT JOIN anima.imagenes_analisis i ON i.analisis_id = a.id;

-- Vista: Estadísticas por usuario
CREATE OR REPLACE VIEW anima.v_estadisticas_usuario AS
SELECT 
  u.id as usuario_id,
  u.email,
  u.display_name,
  COUNT(a.id) as total_analisis,
  COUNT(CASE WHEN a.estado = 'completado' THEN 1 END) as analisis_completados,
  MAX(a.realizado_en) as ultimo_analisis,
  (
    SELECT jsonb_object_agg(e.nombre, ROUND(AVG(e.confianza), 2))
    FROM anima.emociones_detectadas e
    JOIN anima.analisis a2 ON a2.id = e.analisis_id
    WHERE a2.usuario_id = u.id
    GROUP BY e.nombre
  ) as promedio_emociones
FROM anima.usuarios u
LEFT JOIN anima.analisis a ON a.usuario_id = u.id
GROUP BY u.id, u.email, u.display_name;

-- Si no existe el esquema:
CREATE SCHEMA IF NOT EXISTS anima;

-- Tabla de playlists asociadas a cada análisis
CREATE TABLE IF NOT EXISTS anima.analisis_playlist (
  id              SERIAL PRIMARY KEY,
  id_analisis     INTEGER NOT NULL REFERENCES anima.analisis(id) ON DELETE CASCADE,
  spotify_id      TEXT,
  spotify_url     TEXT,
  nombre          TEXT,
  total_canciones INTEGER,
  cover_url       TEXT,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice útil para lookups por análisis
CREATE INDEX IF NOT EXISTS idx_analisis_playlist__id_analisis
  ON anima.analisis_playlist(id_analisis);


-- ==============================
-- DATOS DE EJEMPLO (OPCIONAL)
-- ==============================

-- Comentar en producción, solo para desarrollo
/*
-- Crear usuario de prueba
SELECT anima.registrar_usuario(
  'test@anima.app',
  'Test1234!',
  'Usuario de Prueba',
  'mi_clave_aes_super_secreta'
);

-- Crear análisis de ejemplo
DO $$
DECLARE
  v_usuario_id UUID;
  v_analisis_id UUID;
BEGIN
  SELECT id INTO v_usuario_id FROM anima.usuarios WHERE email = 'test@anima.app';
  
  v_analisis_id := anima.crear_analisis(v_usuario_id, 'camara');
  
  PERFORM anima.registrar_emociones(
    v_analisis_id,
    '[
      {"nombre": "Alegre", "confianza": 85.5},
      {"nombre": "Sorpresa", "confianza": 10.2},
      {"nombre": "Neutral", "confianza": 4.3}
    ]'::JSONB
  );
  
  PERFORM anima.registrar_playlist(
    v_analisis_id,
    '37i9dQZF1DXcBWIGoYBM5M',
    'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    'Ánima: Alegre Mix',
    20
  );
END $$;
*/

-- ==============================
-- ÍNDICES ADICIONALES (PERFORMANCE)
-- ==============================

CREATE INDEX IF NOT EXISTS idx_analisis_emocion_principal ON anima.analisis (emocion_principal);
CREATE INDEX IF NOT EXISTS idx_emociones_nombre ON anima.emociones_detectadas (nombre);
CREATE INDEX IF NOT EXISTS idx_playlists_spotify_id ON anima.playlists_generadas (spotify_playlist_id);

-- ==============================
-- POLÍTICAS DE ROW LEVEL SECURITY (OPCIONAL)
-- ==============================
-- Descomenta si quieres que los usuarios solo vean sus propios datos

/*
ALTER TABLE anima.analisis ENABLE ROW LEVEL SECURITY;
ALTER TABLE anima.emociones_detectadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE anima.playlists_generadas ENABLE ROW LEVEL SECURITY;

-- Política: usuarios solo ven sus propios análisis
CREATE POLICY analisis_usuario_policy ON anima.analisis
  FOR ALL
  TO anima_app
  USING (usuario_id = current_setting('app.current_user_id')::UUID);

-- Similar para otras tablas...
*/



ALTER TABLE anima.playlists_generadas
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,   -- portada principal (640px)
  ADD COLUMN IF NOT EXISTS owner_display    TEXT;  -- nombre del owner/Spotify



-- (Opcional) 1 playlist por análisis
CREATE UNIQUE INDEX IF NOT EXISTS uq_playlist_por_analisis
  ON anima.playlists_generadas(analisis_id);




  -- password reset: códigos de 4 dígitos (válidos 10 min)
CREATE TABLE IF NOT EXISTS anima.password_reset_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         CITEXT NOT NULL,
  code          CHAR(4) NOT NULL,
  reset_token   UUID,                       -- se llena al validar el código
  expires_at    TIMESTAMPTZ NOT NULL,       -- ahora() + 10 min
  attempts      INTEGER NOT NULL DEFAULT 0, -- intentos de validación
  sent_count    INTEGER NOT NULL DEFAULT 0, -- cuántas veces se reenvió
  last_sent_at  TIMESTAMPTZ,                -- para rate-limit (60s)
  consumed      BOOLEAN NOT NULL DEFAULT FALSE, -- ya usado
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1 registro "activo" por email (el más reciente sin consumir)
CREATE INDEX IF NOT EXISTS idx_prc_email ON anima.password_reset_codes (email);
CREATE INDEX IF NOT EXISTS idx_prc_active ON anima.password_reset_codes (email, consumed, expires_at);

-- (opcional) limpiar expirados cada cierto tiempo con un job
