/**
 * Utilidades para extraer datos del HTML del DOF
 * Centraliza selectores y regex para facilitar ajustes futuros
 */

/**
 * Extrae un valor decimal del texto HTML (formato mexicano)
 * Espera números con 4-6 decimales, ej: 18.1234 o 18,1234
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
