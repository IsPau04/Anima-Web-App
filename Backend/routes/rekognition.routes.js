// Backend/routes/rekognition.routes.js
import { Router } from 'express';
import multer from 'multer';
import {
  RekognitionClient,
  DetectFacesCommand
} from '@aws-sdk/client-rekognition';

const router = Router();

// 1) Subida en MEMORIA (no escribe a disco)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máx. (Rekognition con Bytes)
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype === 'image/jpeg' || file.mimetype === 'image/png';
    if (!ok) return cb(new Error('unsupported_format')); // ← devolvemos clave
    cb(null, true);
  }
});

// 2) Cliente de Rekognition (usa variables de entorno)
const rekClient = new RekognitionClient({
  region: process.env.AWS_REGION // (El SDK tomará AWS_ACCESS_KEY_ID/SECRET del .env)
});

// 3) Endpoint: DetectFaces
router.post('/detect-faces', upload.single('image'), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'Falta el archivo de imagen (campo "image").' });
    }

    const cmd = new DetectFacesCommand({
      Image: { Bytes: req.file.buffer },
      Attributes: ['ALL'] // devuelve AgeRange, Emotions, Landmarks, etc.
    });

    const result = await rekClient.send(cmd);

    // Limpieza/transformación rápida para frontend
    const faces = (result.FaceDetails || []).map((f, i) => ({
      index: i,
      confidence: f.Confidence,
      boundingBox: f.BoundingBox,
      ageRange: f.AgeRange,
      gender: f.Gender,
      emotionsTop3: (f.Emotions || [])
        .sort((a, b) => b.Confidence - a.Confidence)
        .slice(0, 3),
      smile: f.Smile,
      eyeglasses: f.Eyeglasses,
      sunglasses: f.Sunglasses,
      beard: f.Beard,
      mustache: f.Mustache,
      eyesOpen: f.EyesOpen,
      mouthOpen: f.MouthOpen,
      landmarksCount: (f.Landmarks || []).length
    }));

    res.json({
      faceCount: faces.length,
      faces,
      raw: {
        orientationCorrection: result.OrientationCorrection || null
      }
    });
  }  catch (err) {
  console.error('DetectFaces error:', err);

  // Multer (tamaño / formato)
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'file_too_large',
      message: 'La imagen excede 5MB. Comprime o usa otra.'
    });
  }
  if (err?.message === 'unsupported_format') {
    return res.status(415).json({
      error: 'unsupported_format',
      message: 'Formato no soportado. Usa JPG o PNG (no HEIC/WEBP/CMYK).'
    });
  }

  // AWS (credenciales/región/permiso)
  return res.status(500).json({
    error: 'rekognition_error',
    name: err?.name,
    code: err?.$metadata?.httpStatusCode,
    message: err?.message
  });
}

});

export default router;
