import crypto from 'crypto';

/**
 * Genera un hash MD5 para un registro de tipo de cambio
 * Combina fecha y valor para crear un identificador único
 */
export const generateRegistroHash = (fecha: string, tcDof: number): string => {
  const data = `${fecha}${tcDof}`;
  return crypto.createHash('md5').update(data).digest('hex');
};
