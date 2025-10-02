/**
 * Configuración de la aplicación Express
 */

import express, { Request, Response, NextFunction } from 'express';
import { logger } from './config/logger.js';
import healthRouter from './routes/health.route.js';
import fxRouter from './routes/fx.route.js';
import { ZodError } from 'zod';

const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Middleware de logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(
    {
      method: req.method,
      url: req.url,
      ip: req.ip,
    },
    'Incoming request'
  );
  next();
});

// Rutas
app.use('/', healthRouter);
app.use('/', fxRouter);

// Manejo de rutas no encontradas
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'The requested endpoint does not exist',
  });
});

// Middleware de manejo de errores centralizado
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Error handling request');

  // Errores de validación de Zod
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors,
    });
  }

  // Errores genéricos
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

export default app;
