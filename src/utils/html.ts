/**
 * Utilidades para extraer datos del HTML del DOF
 * Centraliza selectores y regex para facilitar ajustes futuros
 */

/**
 * Extrae el tipo de cambio del HTML del DOF por filas
 * Parser robusto que busca la fecha en formato dd/mm/yyyy dentro de cada <tr>
 * y extrae el primer número con 4-6 decimales
 *
 * @param html - HTML del DOF (decodificado en latin1)
 * @param isoDate - Fecha en formato YYYY-MM-DD
 * @returns Tipo de cambio o null si no se encuentra
 */
export const extractTcFromDof = (html: string, isoDate: string): number | null => {
  const [yyyy, mm, dd] = isoDate.split('-');

  // Construir regex de fecha flexible (con o sin ceros a la izquierda)
  const ddNum = parseInt(dd, 10);
  const mmNum = parseInt(mm, 10);

  // Buscar filas separadas por </tr>
  const rows = html.split(/<\/tr>/i);

  // Regex para encontrar la fecha en varios formatos posibles
  const fechaRe = new RegExp(
    `\\b0?${ddNum}\\/0?${mmNum}\\/${yyyy}\\b|\\b${ddNum}\\/0?${mmNum}\\/${yyyy}\\b|\\b0?${ddNum}\\/${mmNum}\\/${yyyy}\\b`
  );

  // Regex para números con 4-6 decimales
  const numRe = /\b\d{1,2}\.\d{4,6}\b/;

  for (const row of rows) {
    if (fechaRe.test(row)) {
      // Normalizar espacios y buscar el número
      const cleanRow = row.replace(/\s+/g, ' ');
      const match = cleanRow.match(numRe);

      if (match) {
        const value = parseFloat(match[0]);
        if (!isNaN(value) && value > 10 && value < 30) {
          // Validación razonable para USD/MXN
          return value;
        }
      }
    }
  }

  return null;
};

/**
 * Extrae un valor decimal del texto HTML (formato mexicano)
 * Espera números con 4-6 decimales, ej: 18.1234 o 18,1234
 * @deprecated Usar extractTcFromDof para mayor robustez
 */
export const extractDecimalValue = (text: string): number | null => {
  // Acepta punto o coma como separador decimal
  const regex = /(\d{1,2})[.,](\d{4,6})/;
  const match = text.match(regex);

  if (!match) return null;

  const integerPart = match[1];
  const decimalPart = match[2];

  // Normaliza a formato estándar con punto decimal
  const normalizedValue = `${integerPart}.${decimalPart}`;
  const parsed = parseFloat(normalizedValue);

  return isNaN(parsed) ? null : parsed;
};

/**
 * Limpia texto HTML eliminando etiquetas y espacios extra
 */
export const cleanHtmlText = (text: string): string => {
  return text
    .replace(/<[^>]*>/g, '') // Elimina etiquetas HTML
    .replace(/\s+/g, ' ') // Normaliza espacios
    .trim();
};

/**
 * Extrae fecha del formato usado en DOF (ej: "02/10/2025")
 */
export const extractDateFromDOFFormat = (text: string): string | null => {
  const regex = /(\d{2})\/(\d{2})\/(\d{4})/;
  const match = text.match(regex);

  if (!match) return null;

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
};

/**
 * Configuración de selectores para el scraping del DOF
 * Centralizado para facilitar actualizaciones cuando cambie el HTML
 */
export const DOF_SELECTORS = {
  TABLE_ROW: 'tr',
  TABLE_CELL: 'td',
  DATE_COLUMN_INDEX: 0,
  VALUE_COLUMN_INDEX: 1,
};

/**
 * URL base del DOF para el histórico de tipo de cambio
 */
export const DOF_BASE_URL = 'https://www.dof.gob.mx/indicadores_detalle.php';

/**
 * Construye la URL del DOF para un año y mes específico
 */
export const buildDOFUrl = (year: number, month: number): string => {
  return `${DOF_BASE_URL}?cod_tipo=1&year=${year}&month=${month}`;
};
