import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/healthRoutes.js';
import petRoutes from './routes/petRoutes.js';
import analysisRoutes from './routes/analysisRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/health', healthRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/pets', petRoutes);
  app.use('/api/v1/analysis', analysisRoutes);

  app.use(errorHandler);
  return app;
}
