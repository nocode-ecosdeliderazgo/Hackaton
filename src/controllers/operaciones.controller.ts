/**
 * Controlador para endpoints de operaciones FX
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';
import { operacionRequestSchema, operacionesQuerySchema } from '../schemas/operaciones.schema.js';
import { resolverTipoCambio } from '../services/tc-resolver.service.js';
import { calcularOperacion } from '../services/pnl-calculator.service.js';
import { registrarOperacionFx, obtenerOperacionesFx } from '../services/sheets.service.js';
import type { OperacionResponse } from '../types/operaciones.js';

/**
 * POST /operaciones
 * Crea una nueva operación FX, calcula P&L y la registra en Google Sheets
 */
export const crearOperacion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validar request body
    const data = operacionRequestSchema.parse(req.body);

    logger.info({ data }, 'Creando operación FX');

    // 1. Resolver tipos de cambio (DOF o MANUAL)
    const [tc_base, tc_comp] = await Promise.all([
      resolverTipoCambio(data.tc_base),
      resolverTipoCambio(data.tc_comp),
    ]);

    // 2. Calcular P&L
    const operacionCalculada = calcularOperacion(
      data.tipo,
      data.fecha_operacion,
      data.monto_usd,
      tc_base,
      tc_comp,
      data.concepto,
      data.contraparte,
      data.notas
    );

    // 3. Registrar en Google Sheets
    const { id, sheet_row } = await registrarOperacionFx(operacionCalculada);

    // 4. Construir respuesta
    const response: OperacionResponse = {
      id,
      ...operacionCalculada,
      estado: 'pendiente',
      sheet_row,
    };

    logger.info({ id, sheet_row }, 'Operación FX creada exitosamente');

    res.status(200).json(response);
  } catch (error) {
    logger.error({ error }, 'Error al crear operación FX');
    return next(error);
  }
};

/**
 * GET /operaciones
 * Lista operaciones FX con filtros opcionales
 */
export const listarOperaciones = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validar query params
    const filter = operacionesQuerySchema.parse(req.query);

    logger.info({ filter }, 'Listando operaciones FX');

    // Obtener operaciones de Google Sheets
    const items = await obtenerOperacionesFx(filter);

    // Construir respuesta
    const response = {
      total: items.length,
      items,
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error({ error }, 'Error al listar operaciones FX');
    return next(error);
  }
};
