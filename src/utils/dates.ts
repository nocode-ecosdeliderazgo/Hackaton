/**
 * Utilidades para manejo de fechas en zona horaria de México
 * y cálculo de semanas ISO y rangos de meses
 */

/**
 * Obtiene la fecha actual en zona horaria de México
 */
export const getMexicoDate = (): Date => {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' })
  );
};

/**
 * Formatea una fecha a string YYYY-MM-DD
 */
export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parsea un string YYYY-MM-DD a Date
 */
export const parseDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Calcula el año y semana ISO de una fecha
 */
export const getISOWeek = (date: Date): { isoYear: number; isoWeek: number } => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const isoWeek = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { isoYear: d.getFullYear(), isoWeek };
};

/**
 * Obtiene el rango de fechas para una semana ISO (lunes a domingo)
 */
export const getWeekRange = (
  isoYear: number,
  isoWeek: number
): { start: Date; end: Date } => {
  const jan4 = new Date(isoYear, 0, 4);
  const daysToMonday = (jan4.getDay() || 7) - 1;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - daysToMonday);

  const start = new Date(firstMonday);
  start.setDate(firstMonday.getDate() + (isoWeek - 1) * 7);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return { start, end };
};

/**
 * Obtiene el rango de fechas para un mes completo
 */
export const getMonthRange = (year: number, month: number): { start: Date; end: Date } => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start, end };
};

/**
 * Obtiene todas las fechas entre dos fechas (inclusivo)
 */
export const getDateRange = (start: Date, end: Date): Date[] => {
  const dates: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

/**
 * Verifica si una fecha es fin de semana
 */
export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};
