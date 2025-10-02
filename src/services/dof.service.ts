/**
 * Servicio para obtener el tipo de cambio del DOF
 * Implementa scraping del histórico mensual del DOF con heurística ajustable
 */

import axios from 'axios';
import https from 'https';
import { logger } from '../config/logger.js';
import {
  buildDOFUrl,
  extractDecimalValue,
  cleanHtmlText,
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
    const url = buildDOFUrl(year, month, day);

    logger.info({ url, fecha }, 'Consultando DOF para tipo de cambio');

    // Configurar agente HTTPS para desarrollo (deshabilitar verificación SSL)
    const httpsAgent = new https.Agent({
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    });

    const response = await axios.get<string>(url, {
      timeout: 10000,
      httpsAgent,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const html = response.data;

    // Extraer el tipo de cambio del HTML
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
 * Extrae el tipo de cambio del HTML del nuevo sistema DOF
 * Busca el valor del dólar en la página
 */
const extractTipoCambioFromHTML = (html: string, fecha: string): number | null => {
  try {
    // El nuevo sistema DOF muestra el tipo de cambio directamente en la página
    // Buscamos el patrón del valor del dólar (formato: XX.XXXX)
    
    // Primero intentamos buscar el patrón específico del dólar
    const dollarMatch = html.match(/DÓLAR.*?(\d{1,2}\.\d{4})/i);
    if (dollarMatch) {
      const value = parseFloat(dollarMatch[1]);
      if (value && value > 10 && value < 30) {
        logger.info({ fecha, value }, 'Tipo de cambio extraído del DOF (patrón DÓLAR)');
        return value;
      }
    }

    // Si no encontramos el patrón específico, buscamos cualquier valor decimal
    // que esté en el rango típico del tipo de cambio USD/MXN
    const lines = html.split('\n');
    for (const line of lines) {
      const cleanLine = cleanHtmlText(line);
      const value = extractDecimalValue(cleanLine);
      
      if (value && value > 10 && value < 30) {
        // Validación razonable para tipo de cambio USD/MXN
        logger.info({ fecha, value, line: cleanLine }, 'Tipo de cambio extraído del DOF (heurística)');
        return value;
      }
    }

    return null;
  } catch (error) {
    logger.error({ error, fecha }, 'Error en extracción DOF');
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
