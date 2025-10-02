/**
 * Servicio para obtener el tipo de cambio FIX de Banxico
 * Serie SF43718 (tipo de cambio FIX)
 */

import axios from 'axios';
import { logger } from '../config/logger.js';
import { config_app } from '../config/env.js';

export interface BanxicoResult {
  fecha: string;
  tc_fix: number;
}

interface BanxicoAPIResponse {
  bmx: {
    series: Array<{
      datos: Array<{
        fecha: string;
        dato: string;
      }>;
    }>;
  };
}

const BANXICO_SERIE_FIX = 'SF43718';
const BANXICO_API_URL = 'https://www.banxico.org.mx/SieAPIRest/service/v1/series';

/**
 * Obtiene el tipo de cambio FIX de Banxico para una fecha específica
 */
export const getTipoCambioFIX = async (fecha: string): Promise<BanxicoResult | null> => {
  if (!config_app.banxico.token) {
    logger.info('Token de Banxico no configurado, omitiendo validación FIX');
    return null;
  }

  try {
    const url = `${BANXICO_API_URL}/${BANXICO_SERIE_FIX}/datos/${fecha}/${fecha}`;

    logger.info({ url, fecha }, 'Consultando Banxico para tipo de cambio FIX');

    const response = await axios.get<BanxicoAPIResponse>(url, {
      timeout: 10000,
      headers: {
        'Bmx-Token': config_app.banxico.token,
        Accept: 'application/json',
      },
    });

    const datos = response.data.bmx.series[0]?.datos;

    if (!datos || datos.length === 0) {
      logger.warn({ fecha }, 'No se encontró tipo de cambio FIX en Banxico para la fecha');
      return null;
    }

    const dato = datos[0];
    const tcFix = parseFloat(normalizeDecimal(dato.dato));

    if (isNaN(tcFix)) {
      logger.warn({ fecha, dato: dato.dato }, 'Dato de Banxico no es un número válido');
      return null;
    }

    return {
      fecha: dato.fecha,
      tc_fix: tcFix,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      logger.info({ fecha }, 'No hay datos de Banxico para esta fecha (404)');
      return null;
    }

    logger.error({ error, fecha }, 'Error al consultar Banxico');
    throw new Error(`Error al obtener tipo de cambio FIX de Banxico: ${(error as Error).message}`);
  }
};

/**
 * Normaliza el formato decimal (convierte coma a punto si es necesario)
 */
const normalizeDecimal = (value: string): string => {
  return value.replace(',', '.');
};

/**
 * Compara DOF vs FIX y determina si hay diferencia significativa
 */
export const validarDiferenciaDOFvsFIX = (
  tcDof: number,
  tcFix: number,
  umbralPct: number = config_app.alertas.variacionPct
): { diferenciaPct: number; excedeLimite: boolean } => {
  const diferenciaPct = Math.abs(((tcDof - tcFix) / tcFix) * 100);
  const excedeLimite = diferenciaPct > umbralPct;

  if (excedeLimite) {
    logger.warn(
      { tcDof, tcFix, diferenciaPct, umbralPct },
      'Diferencia significativa entre DOF y FIX'
    );
  }

  return { diferenciaPct, excedeLimite };
};
