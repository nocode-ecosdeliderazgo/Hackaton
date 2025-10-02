/**
 * Controlador para endpoints de tipo de cambio
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';
import { getTipoCambioDOF } from '../services/dof.service.js';
import { getTipoCambioFIX, validarDiferenciaDOFvsFIX } from '../services/banxico.service.js';
import { registrarTipoCambio } from '../services/sheets.service.js';
import { calcularPromedios } from '../services/stats.service.js';
import { formatDate, getMexicoDate } from '../utils/dates.js';
import { z } from 'zod';

/**
 * GET /tipo-cambio?fecha=YYYY-MM-DD
 * Obtiene el tipo de cambio del DOF con validación opcional de Banxico
 */
export const getTipoCambio = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const querySchema = z.object({
      fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    });

    const { fecha } = querySchema.parse(req.query);

    logger.info({ fecha }, 'Obteniendo tipo de cambio');

    // Obtener tipo de cambio del DOF
    const dofResult = await getTipoCambioDOF(fecha);

    if (!dofResult) {
      return res.status(404).json({
        error: 'No se encontró tipo de cambio en DOF para la fecha especificada',
        fecha,
      });
    }

    // Intentar validar con Banxico si está configurado
    const fixResult = await getTipoCambioFIX(fecha);

    let nota_validacion = 'OK';
    let tc_fix: number | undefined;

    if (fixResult) {
      tc_fix = fixResult.tc_fix;
      const validacion = validarDiferenciaDOFvsFIX(dofResult.tc_dof, fixResult.tc_fix);

      if (validacion.excedeLimite) {
        nota_validacion = 'DIF_DOF_BANX';
        logger.warn(
          {
            fecha,
            tc_dof: dofResult.tc_dof,
            tc_fix: fixResult.tc_fix,
            diferenciaPct: validacion.diferenciaPct,
          },
          'Diferencia significativa entre DOF y Banxico'
        );
      }
    }

    const response = {
      fecha: dofResult.fecha,
      tc_dof: dofResult.tc_dof,
      tc_fix,
      fuente: dofResult.fuente,
      publicado_a_las: dofResult.publicado_a_las,
      nota_validacion,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /registrar
 * Registra un tipo de cambio en Google Sheets
 */
export const registrar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bodySchema = z.object({
      fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      tc_dof: z.number().positive(),
      fuente: z.string().default('DOF'),
      publicado_a_las: z.string().default('12:00'),
      nota_validacion: z.string().default('OK'),
    });

    const data = bodySchema.parse(req.body);

    // Si no se proporciona fecha, usar la fecha actual en México
    const fecha = data.fecha || formatDate(getMexicoDate());

    logger.info({ fecha, tc_dof: data.tc_dof }, 'Registrando tipo de cambio');

    const result = await registrarTipoCambio({
      fecha,
      tc_dof: data.tc_dof,
      fuente: data.fuente,
      publicado_a_las: data.publicado_a_las,
      nota_validacion: data.nota_validacion,
    });

    if (!result.success) {
      return res.status(409).json({
        error: result.message,
        fecha,
      });
    }

    res.status(201).json({
      message: result.message,
      fecha,
      tc_dof: data.tc_dof,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /promedios?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Calcula promedios semanal y mensual
 */
export const getPromedios = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const querySchema = z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    });

    const { from, to } = querySchema.parse(req.query);

    logger.info({ from, to }, 'Calculando promedios');

    const promedios = await calcularPromedios(from, to);

    res.json(promedios);
  } catch (error) {
    next(error);
  }
};
