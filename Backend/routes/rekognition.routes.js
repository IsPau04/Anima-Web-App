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
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB máx.
  fileFilter: (_req, file, cb) => {
    // Acepta solo imágenes
    if (!/^image\//i.test(file.mimetype)) {
      return cb(new Error('Solo se permiten archivos de imagen'));
    }
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
  } catch (err) {
    console.error('DetectFaces error:', err);
    // Mensaje controlado hacia el cliente
    res.status(500).json({
      error: 'Fallo en Rekognition',
      details: (err && err.name) || 'UNKNOWN_ERROR'
    });
  }
});

export default router;
