/**
 * Servicio para resolver tipos de cambio (DOF o MANUAL)
 */

import { getTipoCambioDOF } from './dof.service.js';
import { formatDate, getMexicoDate } from '../utils/dates.js';
import { logger } from '../config/logger.js';
import type { TCInput, TCResuelto } from '../types/operaciones.js';

/**
 * Resuelve un tipo de cambio según su configuración (DOF o MANUAL)
 *
 * @param tcInput - Configuración del tipo de cambio
 * @returns TCResuelto con valor, fecha y nota si aplica
 */
export const resolverTipoCambio = async (tcInput: TCInput): Promise<TCResuelto> => {
  if (tcInput.tipo === 'MANUAL') {
    // Tipo de cambio manual
    if (!tcInput.valor || tcInput.valor <= 0) {
      throw new Error('Para tipo MANUAL, el valor es requerido y debe ser > 0');
    }

    logger.info({ tcInput }, 'TC resuelto manualmente');

    return {
      tipo: 'MANUAL',
      valor: tcInput.valor,
      fecha: undefined,
      nota: undefined,
    };
  }

  // Tipo DOF: resolver fecha
  let fechaConsulta: string;

  if (!tcInput.fecha || tcInput.fecha === 'hoy') {
    // Usar fecha actual en México
    fechaConsulta = formatDate(getMexicoDate());
  } else {
    // Usar fecha proporcionada
    fechaConsulta = tcInput.fecha;
  }

  logger.info({ fechaConsulta }, 'Consultando DOF para TC');

  // Obtener tipo de cambio del DOF
  const dofResult = await getTipoCambioDOF(fechaConsulta);

  if (!dofResult) {
    throw new Error(
      `No se encontró tipo de cambio en DOF para la fecha ${fechaConsulta}. ` +
        'Intenta con una fecha diferente o usa tipo MANUAL.'
    );
  }

  return {
    tipo: 'DOF',
    fecha: dofResult.fecha,
    valor: dofResult.tc_dof,
    nota: undefined, // La versión actual de DOF service no provee nota_validacion
  };
};
