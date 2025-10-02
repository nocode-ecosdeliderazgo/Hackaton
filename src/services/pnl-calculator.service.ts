/**
 * Servicio para calcular P&L (Profit & Loss) de operaciones FX
 */

import type { TipoOperacion, TCResuelto, OperacionCalculada } from '../types/operaciones.js';

/**
 * Redondea un número a N decimales
 */
export const round = (num: number, decimals: number): number => {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Calcula el P&L de una operación FX
 *
 * Reglas:
 * - cobro: el usuario recibe USD, pnl_mxn = mxn_comp - mxn_base (gana si TC sube)
 * - pago: el usuario paga USD, pnl_mxn = mxn_base - mxn_comp (gana si TC baja)
 *
 * @param tipo - Tipo de operación (cobro o pago)
 * @param monto_usd - Monto en USD
 * @param tc_base - Tipo de cambio base
 * @param tc_comp - Tipo de cambio de comparación
 * @returns Objeto con mxn_base, mxn_comp, pnl_mxn y pnl_pct
 */
export const calcularPnL = (
  tipo: TipoOperacion,
  monto_usd: number,
  tc_base: TCResuelto,
  tc_comp: TCResuelto
): { mxn_base: number; mxn_comp: number; pnl_mxn: number; pnl_pct: number } => {
  // Calcular MXN base y comparación
  const mxn_base = round(monto_usd * tc_base.valor, 2);
  const mxn_comp = round(monto_usd * tc_comp.valor, 2);

  // Calcular P&L según tipo de operación
  let pnl_mxn: number;

  if (tipo === 'cobro') {
    // Usuario recibe USD: gana si el TC de comparación es mayor que el base
    pnl_mxn = round(mxn_comp - mxn_base, 2);
  } else {
    // Usuario paga USD: gana si el TC de comparación es menor que el base
    pnl_mxn = round(mxn_base - mxn_comp, 2);
  }

  // Calcular porcentaje de P&L
  const pnl_pct = mxn_base ? round((pnl_mxn / mxn_base) * 100, 3) : 0;

  return {
    mxn_base,
    mxn_comp,
    pnl_mxn,
    pnl_pct,
  };
};

/**
 * Calcula una operación completa con P&L
 */
export const calcularOperacion = (
  tipo: TipoOperacion,
  fecha_operacion: string,
  monto_usd: number,
  tc_base: TCResuelto,
  tc_comp: TCResuelto,
  concepto?: string,
  contraparte?: string,
  notas?: string
): OperacionCalculada => {
  const pnl = calcularPnL(tipo, monto_usd, tc_base, tc_comp);

  return {
    tipo,
    concepto,
    contraparte,
    fecha_operacion,
    monto_usd,
    tc_base,
    tc_comp,
    ...pnl,
    notas,
  };
};
