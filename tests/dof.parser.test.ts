/**
 * Tests para el parser robusto del DOF y funciones de fechas
 */

import fs from 'fs';
import path from 'path';
import { extractTcFromDof } from '../src/utils/html.js';
import { previousBusinessDay, toDDMMYYYY, isWeekendISO } from '../src/utils/dates.js';

describe('Parser del DOF', () => {
  describe('extractTcFromDof', () => {
    it('debe extraer tipo de cambio de fila OK', () => {
      const html = fs.readFileSync(
        path.join(__dirname, 'fixtures', 'dof_ok_row.html'),
        'utf-8'
      );

      const result = extractTcFromDof(html, '2025-10-01');
      expect(result).toBe(18.1234);
    });

    it('debe devolver null cuando la fecha no existe', () => {
      const html = fs.readFileSync(
        path.join(__dirname, 'fixtures', 'dof_missing_date.html'),
        'utf-8'
      );

      const result = extractTcFromDof(html, '2025-10-01');
      expect(result).toBeNull();
    });

    it('debe manejar HTML con espacios y etiquetas desalineadas', () => {
      const html = fs.readFileSync(
        path.join(__dirname, 'fixtures', 'dof_misaligned.html'),
        'utf-8'
      );

      const result = extractTcFromDof(html, '2025-08-15');
      expect(result).toBe(19.456789);
    });

    it('debe extraer múltiples fechas correctamente', () => {
      const html = fs.readFileSync(
        path.join(__dirname, 'fixtures', 'dof_ok_row.html'),
        'utf-8'
      );

      expect(extractTcFromDof(html, '2025-10-01')).toBe(18.1234);
      expect(extractTcFromDof(html, '2025-10-02')).toBe(18.2345);
      expect(extractTcFromDof(html, '2025-10-03')).toBe(18.3456);
    });

    it('debe manejar fechas sin ceros a la izquierda', () => {
      const html = '<tr><td>1/10/2025</td><td>18.1234</td></tr>';
      const result = extractTcFromDof(html, '2025-10-01');
      expect(result).toBe(18.1234);
    });

    it('debe validar rangos razonables de tipo de cambio', () => {
      const htmlLow = '<tr><td>01/10/2025</td><td>5.1234</td></tr>';
      const htmlHigh = '<tr><td>01/10/2025</td><td>50.1234</td></tr>';

      expect(extractTcFromDof(htmlLow, '2025-10-01')).toBeNull();
      expect(extractTcFromDof(htmlHigh, '2025-10-01')).toBeNull();
    });
  });
});

describe('Utilidades de fechas', () => {
  describe('toDDMMYYYY', () => {
    it('debe convertir ISO a formato DD/MM/YYYY', () => {
      expect(toDDMMYYYY('2025-10-01')).toBe('01/10/2025');
      expect(toDDMMYYYY('2025-08-15')).toBe('15/08/2025');
      expect(toDDMMYYYY('2024-01-05')).toBe('05/01/2024');
    });
  });

  describe('isWeekendISO', () => {
    it('debe detectar sábados y domingos', () => {
      expect(isWeekendISO('2025-08-02')).toBe(true); // Sábado
      expect(isWeekendISO('2025-08-03')).toBe(true); // Domingo
      expect(isWeekendISO('2025-08-01')).toBe(false); // Viernes
      expect(isWeekendISO('2025-08-04')).toBe(false); // Lunes
    });
  });

  describe('previousBusinessDay', () => {
    it('debe retroceder de sábado a viernes', () => {
      expect(previousBusinessDay('2025-08-02')).toBe('2025-08-01');
    });

    it('debe retroceder de domingo a viernes', () => {
      expect(previousBusinessDay('2025-08-03')).toBe('2025-08-01');
    });

    it('debe retroceder de lunes a viernes', () => {
      expect(previousBusinessDay('2025-08-04')).toBe('2025-08-01');
    });

    it('debe retroceder de miércoles a martes', () => {
      expect(previousBusinessDay('2025-08-06')).toBe('2025-08-05');
    });

    it('debe manejar cambio de mes', () => {
      expect(previousBusinessDay('2025-09-01')).toBe('2025-08-29'); // Viernes
    });

    it('debe manejar cambio de año', () => {
      expect(previousBusinessDay('2025-01-01')).toBe('2024-12-31');
    });
  });
});
