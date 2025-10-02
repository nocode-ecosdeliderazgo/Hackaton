/**
 * Controlador para health check
 */

import { Request, Response } from 'express';

/**
 * GET /health
 * Verifica el estado del servicio
 */
export const getHealth = (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'tc-dof-microservice',
  });
};
