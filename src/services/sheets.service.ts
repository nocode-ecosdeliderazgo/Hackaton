/**
 * Servicio para interactuar con Google Sheets
 * Maneja registro y lectura de datos de tipo de cambio
 */

import { google, sheets_v4 } from 'googleapis';
import { logger } from '../config/logger.js';
import { config_app } from '../config/env.js';
import { generateRegistroHash } from '../utils/hash.js';

type Sheets = sheets_v4.Sheets;

let sheetsClient: Sheets | null = null;

/**
 * Inicializa el cliente de Google Sheets con Service Account
 */
const getGoogleSheetsClient = (): Sheets => {
  if (sheetsClient) return sheetsClient;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: config_app.google.clientEmail,
      private_key: config_app.google.privateKey,
      project_id: config_app.google.projectId,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
};

export interface RegistroTipoCambio {
  fecha: string;
  tc_dof: number;
  fuente: string;
  publicado_a_las: string;
  nota_validacion: string;
}

/**
 * Registra un nuevo tipo de cambio en Google Sheets
 * Evita duplicados verificando si ya existe la fecha
 */
export const registrarTipoCambio = async (
  registro: RegistroTipoCambio
): Promise<{ success: boolean; message: string }> => {
  try {
    const sheets = getGoogleSheetsClient();
    const sheetId = config_app.google.sheetId;
    const sheetTab = config_app.google.sheetTab;

    // Verificar si ya existe la fecha
    const exists = await existeFecha(registro.fecha);
    if (exists) {
      logger.info({ fecha: registro.fecha }, 'Registro ya existe en Google Sheets');
      return { success: false, message: 'La fecha ya está registrada' };
    }

    // Generar hash del registro
    const hashRegistro = generateRegistroHash(registro.fecha, registro.tc_dof);

    // Preparar la fila a insertar
    const row = [
      registro.fecha,
      registro.tc_dof,
      registro.fuente,
      registro.publicado_a_las,
      hashRegistro,
      registro.nota_validacion,
    ];

    // Insertar la fila
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${sheetTab}!A:F`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });

    logger.info({ fecha: registro.fecha, hashRegistro }, 'Registro insertado en Google Sheets');

    return { success: true, message: 'Registro insertado correctamente' };
  } catch (error) {
    logger.error({ error, registro }, 'Error al registrar en Google Sheets');
    throw new Error(`Error al registrar en Google Sheets: ${(error as Error).message}`);
  }
};

/**
 * Verifica si ya existe un registro para una fecha específica
 */
const existeFecha = async (fecha: string): Promise<boolean> => {
  try {
    const sheets = getGoogleSheetsClient();
    const sheetId = config_app.google.sheetId;
    const sheetTab = config_app.google.sheetTab;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetTab}!A:A`,
    });

    const values = response.data.values || [];

    // Ignora la primera fila (encabezados)
    const fechas = values.slice(1).map((row) => row[0]);

    return fechas.includes(fecha);
  } catch (error) {
    logger.error({ error, fecha }, 'Error al verificar existencia de fecha');
    return false;
  }
};

/**
 * Obtiene todos los registros de tipo de cambio de Google Sheets
 */
export const obtenerRegistros = async (
  fromDate?: string,
  toDate?: string
): Promise<RegistroTipoCambio[]> => {
  try {
    const sheets = getGoogleSheetsClient();
    const sheetId = config_app.google.sheetId;
    const sheetTab = config_app.google.sheetTab;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetTab}!A:F`,
    });

    const values = response.data.values || [];

    // Ignora la primera fila (encabezados)
    const rows = values.slice(1);

    let registros: RegistroTipoCambio[] = rows.map((row) => ({
      fecha: row[0] || '',
      tc_dof: parseFloat(row[1]) || 0,
      fuente: row[2] || '',
      publicado_a_las: row[3] || '',
      nota_validacion: row[5] || '',
    }));

    // Filtrar por rango de fechas si se proporciona
    if (fromDate) {
      registros = registros.filter((r) => r.fecha >= fromDate);
    }
    if (toDate) {
      registros = registros.filter((r) => r.fecha <= toDate);
    }

    return registros;
  } catch (error) {
    logger.error({ error }, 'Error al obtener registros de Google Sheets');
    throw new Error(`Error al obtener registros de Google Sheets: ${(error as Error).message}`);
  }
};

/**
 * ==========================================
 * OPERACIONES FX
 * ==========================================
 */

import type { OperacionCalculada, OperacionResponse, OperacionesFilter } from '../types/operaciones.js';
import { randomBytes, createHash } from 'crypto';

const OPERACIONES_TAB = 'operaciones_fx';

/**
 * Genera un ID único para una operación
 */
const generateOperacionId = (): string => {
  return 'op_' + randomBytes(3).toString('hex');
};

/**
 * Genera un hash para auditoría de operación
 */
const generateOperacionHash = (
  id: string,
  fecha_operacion: string,
  monto_usd: number
): string => {
  const data = `${id}:${fecha_operacion}:${monto_usd}`;
  return createHash('md5').update(data).digest('hex').substring(0, 8);
};

/**
 * Registra una operación FX en Google Sheets
 */
export const registrarOperacionFx = async (
  operacion: OperacionCalculada
): Promise<{ id: string; sheet_row: number }> => {
  try {
    const sheets = getGoogleSheetsClient();
    const sheetId = config_app.google.sheetId;

    // Generar ID y timestamp
    const id = generateOperacionId();
    const ts_creacion = new Date().toISOString();
    const estado = 'pendiente';
    const hash = generateOperacionHash(id, operacion.fecha_operacion, operacion.monto_usd);

    // Preparar la fila según el esquema exacto
    // id | ts_creacion | tipo | concepto | contraparte | fecha_operacion | monto_usd |
    // tc_base_tipo | tc_base_fecha | tc_base_valor |
    // tc_comp_tipo | tc_comp_fecha | tc_comp_valor |
    // mxn_base | mxn_comp | pnl_mxn | pnl_pct |
    // estado | fecha_cierre | notas | hash
    const row = [
      id,
      ts_creacion,
      operacion.tipo,
      operacion.concepto || '',
      operacion.contraparte || '',
      operacion.fecha_operacion,
      operacion.monto_usd,
      operacion.tc_base.tipo,
      operacion.tc_base.fecha || '',
      operacion.tc_base.valor,
      operacion.tc_comp.tipo,
      operacion.tc_comp.fecha || '',
      operacion.tc_comp.valor,
      operacion.mxn_base,
      operacion.mxn_comp,
      operacion.pnl_mxn,
      operacion.pnl_pct,
      estado,
      '', // fecha_cierre
      operacion.notas || '',
      hash,
    ];

    // Insertar la fila
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${OPERACIONES_TAB}!A:U`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });

    // Obtener número de fila insertada
    const updatedRange = response.data.updates?.updatedRange || '';
    const rowMatch = updatedRange.match(/!A(\d+)/);
    const sheet_row = rowMatch ? parseInt(rowMatch[1], 10) : 0;

    logger.info({ id, sheet_row }, 'Operación FX registrada en Google Sheets');

    return { id, sheet_row };
  } catch (error) {
    logger.error({ error, operacion }, 'Error al registrar operación FX en Google Sheets');
    throw new Error(`Error al registrar operación FX: ${(error as Error).message}`);
  }
};

/**
 * Obtiene operaciones FX de Google Sheets con filtros
 */
export const obtenerOperacionesFx = async (
  filter: OperacionesFilter = {}
): Promise<OperacionResponse[]> => {
  try {
    const sheets = getGoogleSheetsClient();
    const sheetId = config_app.google.sheetId;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${OPERACIONES_TAB}!A:U`,
    });

    const values = response.data.values || [];

    // Ignora la primera fila (encabezados)
    const rows = values.slice(1);

    // Parsear operaciones
    let operaciones: OperacionResponse[] = rows.map((row) => ({
      id: row[0] || '',
      tipo: row[2] as 'cobro' | 'pago',
      concepto: row[3] || undefined,
      contraparte: row[4] || undefined,
      fecha_operacion: row[5] || '',
      monto_usd: parseFloat(row[6]) || 0,
      tc_base: {
        tipo: row[7] as 'DOF' | 'MANUAL',
        fecha: row[8] || undefined,
        valor: parseFloat(row[9]) || 0,
        nota: undefined,
      },
      tc_comp: {
        tipo: row[10] as 'DOF' | 'MANUAL',
        fecha: row[11] || undefined,
        valor: parseFloat(row[12]) || 0,
        nota: undefined,
      },
      mxn_base: parseFloat(row[13]) || 0,
      mxn_comp: parseFloat(row[14]) || 0,
      pnl_mxn: parseFloat(row[15]) || 0,
      pnl_pct: parseFloat(row[16]) || 0,
      estado: row[17] as 'pendiente' | 'cerrada' | 'cancelada',
      notas: row[19] || undefined,
    }));

    // Aplicar filtros
    if (filter.from) {
      operaciones = operaciones.filter((op) => op.fecha_operacion >= filter.from!);
    }
    if (filter.to) {
      operaciones = operaciones.filter((op) => op.fecha_operacion <= filter.to!);
    }
    if (filter.tipo) {
      operaciones = operaciones.filter((op) => op.tipo === filter.tipo);
    }
    if (filter.estado) {
      operaciones = operaciones.filter((op) => op.estado === filter.estado);
    }
    if (filter.q) {
      const query = filter.q.toLowerCase();
      operaciones = operaciones.filter(
        (op) =>
          op.concepto?.toLowerCase().includes(query) ||
          op.contraparte?.toLowerCase().includes(query) ||
          op.notas?.toLowerCase().includes(query)
      );
    }

    // Aplicar paginación
    const offset = filter.offset || 0;
    const limit = filter.limit || 20;
    operaciones = operaciones.slice(offset, offset + limit);

    return operaciones;
  } catch (error) {
    logger.error({ error, filter }, 'Error al obtener operaciones FX de Google Sheets');
    throw new Error(`Error al obtener operaciones FX: ${(error as Error).message}`);
  }
};
