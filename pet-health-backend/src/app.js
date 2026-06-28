import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/healthRoutes.js';
import petRoutes from './routes/petRoutes.js';
import analysisRoutes from './routes/analysisRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import breedRecognitionRoutes from './routes/breedRecognitionRoutes.js';
import aiCreditsRoutes from './routes/aiCreditsRoutes.js';
import iapRoutes from './routes/iapRoutes.js';
import coreCareRoutes from './routes/coreCareRoutes.js';
import petFeedRoutes from './routes/petFeedRoutes.js';
import featureFlagRoutes from './routes/featureFlagRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

function configuredCorsOrigins() {
  return String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

function corsOrigin() {
  const allowed = configuredCorsOrigins();
  if (allowed.length === 0) {
    if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_OPEN_CORS === 'true') {
      return true;
    }
    return (origin, callback) => {
      callback(null, !origin);
    };
  }

  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    callback(null, allowed.includes(origin.replace(/\/+$/, '')));
  };
}

export function createApp() {
  const app = express();
  // Explicit CORS for browser clients. Native mobile requests usually have no Origin header.
  app.use(
    cors({
      origin: corsOrigin(),
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-secret', 'Bypass-Tunnel-Reminder', 'ngrok-skip-browser-warning'],
      maxAge: 86400,
    }),
  );
  app.use(express.json());
  app.use(requestLogger);

  app.use('/health', healthRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/pets', petRoutes);
  app.use('/api/v1/analysis', analysisRoutes);
  app.use('/api/v1/breed-recognition', breedRecognitionRoutes);
  app.use('/api/v1/ai-credits', aiCreditsRoutes);
  app.use('/api/v1/iap', iapRoutes);
  app.use('/api/v1/core-care', coreCareRoutes);
  app.use('/api/v1/pet-feed', petFeedRoutes);
  app.use('/api/v1/feature-flags', featureFlagRoutes);
  app.use('/api/v1/admin', adminRoutes);

  app.use(errorHandler);
  return app;
}
