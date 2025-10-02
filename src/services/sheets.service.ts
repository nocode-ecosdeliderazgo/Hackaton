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
