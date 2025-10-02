/**
 * Servicio para obtener el tipo de cambio del DOF
 * Implementa scraping robusto con decodificación latin1 y fallback a días hábiles anteriores
 */

import axios from 'axios';
import https from 'https';
import iconv from 'iconv-lite';
import fs from 'fs';
import path from 'path';
import { logger } from '../config/logger.js';
import { extractTcFromDof } from '../utils/html.js';
import { previousBusinessDay } from '../utils/dates.js';

// Agente HTTPS que ignora verificación de certificados para DOF
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

export interface DOFResult {
  fecha: string;
  fechaUsada: string;
  tc_dof: number;
  fuente: string;
  publicado_a_las: string;
  nota_validacion: string;
}

export class DOFError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'DOFError';
  }
}

/**
 * Descarga y decodifica el HTML del DOF desde ISO-8859-1 (latin1)
 */
async function fetchDofHtml(url: string): Promise<string> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 10000,
    httpsAgent,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  // Decodificar de ISO-8859-1 (latin1) a UTF-8
  return iconv.decode(Buffer.from(response.data), 'latin1');
}

/**
 * Genera las URLs del DOF para un mes específico
 * Retorna dos URLs en orden de intento: indicadores_detalle y tipo_cambio_hist
 */
function getMonthUrls(isoDate: string): string[] {
  const [year, month] = isoDate.split('-');

  return [
    `https://www.dof.gob.mx/indicadores_detalle.php?cod_tipo=1&year=${year}&month=${parseInt(month, 10)}`,
    `https://www.dof.gob.mx/tipo_cambio_hist.php?year=${year}&month=${parseInt(month, 10)}`,
  ];
}

/**
 * Guarda el HTML en .debug/ si DEBUG_DOF=1
 */
function saveDebugHtml(html: string, isoDate: string): void {
  if (process.env.DEBUG_DOF !== '1') return;

  try {
    const [year, month] = isoDate.split('-');
    const debugDir = path.join(process.cwd(), '.debug');

    // Crear directorio si no existe
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }

    const filename = path.join(debugDir, `dof_${year}_${month}.html`);
    fs.writeFileSync(filename, html, 'utf-8');

    logger.debug({ filename }, 'HTML del DOF guardado para debugging');
  } catch (error) {
    logger.warn({ error }, 'Error al guardar HTML de debug');
  }
}

/**
 * Intenta obtener el tipo de cambio del DOF con fallback a días hábiles anteriores
 *
 * Lógica:
 * 1. Intenta hasta 3 veces
 * 2. Para cada intento, prueba ambos endpoints del DOF
 * 3. Si no encuentra la fecha, retrocede al día hábil anterior
 * 4. Si tras 3 intentos no hay dato, lanza error AUSENTE_DOF
 */
export const getTipoCambioDOF = async (isoDate: string): Promise<DOFResult> => {
  const MAX_RETRIES = 3;
  let fechaActual = isoDate;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      logger.info({ fechaActual, attempt: attempt + 1 }, 'Consultando DOF para tipo de cambio');

      const urls = getMonthUrls(fechaActual);

      // Intentar ambos endpoints
      for (const url of urls) {
        try {
          const html = await fetchDofHtml(url);

          // Log de debug
          logger.debug(
            {
              url,
              htmlLength: html.length,
              htmlSample: html.substring(0, 200),
            },
            'HTML recibido del DOF'
          );

          // Guardar HTML si DEBUG_DOF=1
          saveDebugHtml(html, fechaActual);

          // Intentar extraer el tipo de cambio
          const tcValue = extractTcFromDof(html, fechaActual);

          if (tcValue) {
            // ¡Éxito!
            const nota_validacion =
              fechaActual === isoDate
                ? 'OK'
                : `SIN_PUBLICACION_FECHA; USADO_ANTERIOR=${fechaActual}`;

            logger.info(
              {
                isoDate,
                fechaUsada: fechaActual,
                tc_dof: tcValue,
                nota_validacion,
              },
              'Tipo de cambio encontrado en DOF'
            );

            return {
              fecha: isoDate,
              fechaUsada: fechaActual,
              tc_dof: tcValue,
              fuente: 'DOF',
              publicado_a_las: '12:00',
              nota_validacion,
            };
          }
        } catch (error) {
          logger.warn({ error, url }, 'Error al consultar endpoint del DOF');
          lastError = error as Error;
          // Continuar con el siguiente endpoint
        }
      }

      // Si llegamos aquí, ningún endpoint tuvo la fecha
      logger.warn({ fechaActual }, 'Fecha no encontrada en ningún endpoint, retrocediendo');

      // Retroceder al día hábil anterior
      fechaActual = previousBusinessDay(fechaActual);
    } catch (error) {
      logger.error({ error, fechaActual, attempt: attempt + 1 }, 'Error en intento del DOF');
      lastError = error as Error;
    }
  }

  // Si llegamos aquí, agotamos los reintentos
  throw new DOFError(
    'No hay publicación para la fecha solicitada ni días hábiles anteriores tras 3 intentos',
    'AUSENTE_DOF'
  );
};

/**
 * Verifica si el DOF tiene datos para una fecha específica
 */
export const hasDOFData = async (fecha: string): Promise<boolean> => {
  try {
    await getTipoCambioDOF(fecha);
    return true;
  } catch (error) {
    if (error instanceof DOFError && error.code === 'AUSENTE_DOF') {
      return false;
    }
    throw error;
  }
};
