/**
 * Servicio para obtener el tipo de cambio del DOF
 * Implementa scraping del histórico mensual del DOF con heurística ajustable
 */

import axios from 'axios';
import { logger } from '../config/logger.js';
import {
  buildDOFUrl,
  extractDecimalValue,
  cleanHtmlText,
  extractDateFromDOFFormat,
} from '../utils/html.js';

export interface DOFResult {
  fecha: string;
  tc_dof: number;
  fuente: string;
  publicado_a_las: string;
}

/**
 * Obtiene el tipo de cambio del DOF para una fecha específica
 * Descarga el HTML del histórico mensual y extrae el valor del día
 */
export const getTipoCambioDOF = async (fecha: string): Promise<DOFResult | null> => {
  try {
    const [year, month, day] = fecha.split('-').map(Number);
    const url = buildDOFUrl(year, month);

    logger.info({ url, fecha }, 'Consultando DOF para tipo de cambio');

    const response = await axios.get<string>(url, {
      timeout: 10000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const html = response.data;

    // Heurística para extraer el tipo de cambio del día específico
    const tcValue = extractTipoCambioFromHTML(html, fecha);

    if (!tcValue) {
      logger.warn({ fecha }, 'No se encontró tipo de cambio en DOF para la fecha');
      return null;
    }

    // Hora de publicación típica del DOF (mediodía)
    const publicado_a_las = '12:00';

    return {
      fecha,
      tc_dof: tcValue,
      fuente: 'DOF',
      publicado_a_las,
    };
  } catch (error) {
    logger.error({ error, fecha }, 'Error al consultar DOF');
    throw new Error(`Error al obtener tipo de cambio del DOF: ${(error as Error).message}`);
  }
};

/**
 * Heurística para extraer el tipo de cambio de una fecha específica del HTML
 * Busca la fila correspondiente a la fecha y extrae el primer valor decimal
 */
const extractTipoCambioFromHTML = (html: string, fecha: string): number | null => {
  try {
    // El DOF publica en formato tabla HTML simple
    // Buscamos líneas que contengan la fecha y el valor

    const lines = html.split('\n');
    const [year, month, day] = fecha.split('-').map(Number);

    // Formatos posibles de fecha en el DOF
    const possibleDateFormats = [
      `${day}/${month}/${year}`,
      `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
      `${day}-${month}-${year}`,
      `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = cleanHtmlText(lines[i]);

      // Busca si esta línea contiene la fecha
      const containsDate = possibleDateFormats.some((format) => line.includes(format));

      if (containsDate) {
        // Busca en esta línea y las siguientes cercanas
        for (let j = i; j < Math.min(i + 5, lines.length); j++) {
          const searchLine = cleanHtmlText(lines[j]);
          const value = extractDecimalValue(searchLine);

          if (value && value > 10 && value < 30) {
            // Validación razonable para tipo de cambio USD/MXN
            logger.info({ fecha, value, line: searchLine }, 'Tipo de cambio extraído del DOF');
            return value;
          }
        }
      }
    }

    return null;
  } catch (error) {
    logger.error({ error, fecha }, 'Error en heurística de extracción DOF');
    return null;
  }
};

/**
 * Verifica si el DOF tiene datos para una fecha específica
 */
export const hasDOFData = async (fecha: string): Promise<boolean> => {
  const result = await getTipoCambioDOF(fecha);
  return result !== null;
};
