/**
 * Servicio para cálculo de promedios semanal y mensual
 * Usa solo días con publicación (no imputa fines de semana/feriados)
 */

import { logger } from '../config/logger.js';
import { getISOWeek, getWeekRange, getMonthRange, formatDate } from '../utils/dates.js';
import { obtenerRegistros, RegistroTipoCambio } from './sheets.service.js';

export interface PromedioSemanal {
  isoYear: number;
  isoWeek: number;
  valor: number;
  diasConsiderados: number;
}

export interface PromedioMensual {
  year: number;
  month: number;
  valor: number;
  diasConsiderados: number;
}

export interface PromediosResult {
  promedio_semanal: PromedioSemanal | null;
  promedio_mensual: PromedioMensual | null;
}

/**
 * Calcula promedios semanal y mensual para una fecha dada
 * Si no se proporciona rango, usa la semana y mes de la fecha actual
 */
export const calcularPromedios = async (
  fromDate?: string,
  toDate?: string
): Promise<PromediosResult> => {
  try {
    // Si no se proporcionan fechas, usar el mes y semana actuales
    const now = new Date();
    const defaultFromDate = fromDate || formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const defaultToDate = toDate || formatDate(now);

    // Obtener registros del rango
    const registros = await obtenerRegistros(defaultFromDate, defaultToDate);

    if (registros.length === 0) {
      logger.warn('No hay registros para calcular promedios');
      return {
        promedio_semanal: null,
        promedio_mensual: null,
      };
    }

    // Calcular promedio semanal
    const promedioSemanal = calcularPromedioSemanal(registros, now);

    // Calcular promedio mensual
    const promedioMensual = calcularPromedioMensual(registros, now);

    return {
      promedio_semanal: promedioSemanal,
      promedio_mensual: promedioMensual,
    };
  } catch (error) {
    logger.error({ error }, 'Error al calcular promedios');
    throw new Error(`Error al calcular promedios: ${(error as Error).message}`);
  }
};

/**
 * Calcula el promedio semanal ISO (lunes a domingo)
 */
const calcularPromedioSemanal = (
  registros: RegistroTipoCambio[],
  referenceDate: Date
): PromedioSemanal | null => {
  const { isoYear, isoWeek } = getISOWeek(referenceDate);
  const { start, end } = getWeekRange(isoYear, isoWeek);

  const startStr = formatDate(start);
  const endStr = formatDate(end);

  // Filtrar registros de la semana
  const registrosSemana = registros.filter(
    (r) => r.fecha >= startStr && r.fecha <= endStr && r.tc_dof > 0
  );

  if (registrosSemana.length === 0) {
    return null;
  }

  const suma = registrosSemana.reduce((acc, r) => acc + r.tc_dof, 0);
  const promedio = suma / registrosSemana.length;

  logger.info(
    { isoYear, isoWeek, promedio, diasConsiderados: registrosSemana.length },
    'Promedio semanal calculado'
  );

  return {
    isoYear,
    isoWeek,
    valor: parseFloat(promedio.toFixed(4)),
    diasConsiderados: registrosSemana.length,
  };
};

/**
 * Calcula el promedio mensual (1 a fin de mes)
 */
const calcularPromedioMensual = (
  registros: RegistroTipoCambio[],
  referenceDate: Date
): PromedioMensual | null => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth() + 1;

  const { start, end } = getMonthRange(year, month);

  const startStr = formatDate(start);
  const endStr = formatDate(end);

  // Filtrar registros del mes
  const registrosMes = registros.filter(
    (r) => r.fecha >= startStr && r.fecha <= endStr && r.tc_dof > 0
  );

  if (registrosMes.length === 0) {
    return null;
  }

  const suma = registrosMes.reduce((acc, r) => acc + r.tc_dof, 0);
  const promedio = suma / registrosMes.length;

  logger.info(
    { year, month, promedio, diasConsiderados: registrosMes.length },
    'Promedio mensual calculado'
  );

  return {
    year,
    month,
    valor: parseFloat(promedio.toFixed(4)),
    diasConsiderados: registrosMes.length,
  };
};
