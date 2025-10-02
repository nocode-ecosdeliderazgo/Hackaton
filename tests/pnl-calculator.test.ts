/**
 * Tests unitarios para el servicio de cálculo P&L
 */

import { describe, it, expect } from '@jest/globals';
import { calcularPnL, round } from '../src/services/pnl-calculator.service.js';
import type { TCResuelto } from '../src/types/operaciones.js';

describe('round', () => {
  it('debe redondear a 2 decimales correctamente', () => {
    expect(round(18.12345, 2)).toBe(18.12);
    expect(round(18.126, 2)).toBe(18.13);
    expect(round(18.125, 2)).toBe(18.13); // Redondeo bancario
  });

  it('debe redondear a 3 decimales correctamente', () => {
    expect(round(0.7145, 3)).toBe(0.715);
    expect(round(0.7144, 3)).toBe(0.714);
  });
});

describe('calcularPnL', () => {
  const tc_base: TCResuelto = {
    tipo: 'DOF',
    fecha: '2025-10-10',
    valor: 18.20,
  };

  const tc_comp: TCResuelto = {
    tipo: 'DOF',
    fecha: '2025-10-02',
    valor: 18.33,
  };

  describe('operación tipo COBRO', () => {
    it('debe calcular P&L positivo cuando TC comp > TC base', () => {
      const result = calcularPnL('cobro', 800, tc_base, tc_comp);

      expect(result.mxn_base).toBe(14560.0); // 800 * 18.20
      expect(result.mxn_comp).toBe(14664.0); // 800 * 18.33
      expect(result.pnl_mxn).toBe(104.0); // mxn_comp - mxn_base
      expect(result.pnl_pct).toBe(0.714); // (104 / 14560) * 100 = 0.714%
    });

    it('debe calcular P&L negativo cuando TC comp < TC base', () => {
      const tc_comp_menor: TCResuelto = {
        tipo: 'DOF',
        fecha: '2025-10-02',
        valor: 18.0,
      };

      const result = calcularPnL('cobro', 800, tc_base, tc_comp_menor);

      expect(result.mxn_base).toBe(14560.0);
      expect(result.mxn_comp).toBe(14400.0); // 800 * 18.0
      expect(result.pnl_mxn).toBe(-160.0); // mxn_comp - mxn_base
      expect(result.pnl_pct).toBe(-1.099); // (-160 / 14560) * 100
    });

    it('debe calcular P&L cero cuando TCs son iguales', () => {
      const result = calcularPnL('cobro', 800, tc_base, tc_base);

      expect(result.mxn_base).toBe(14560.0);
      expect(result.mxn_comp).toBe(14560.0);
      expect(result.pnl_mxn).toBe(0);
      expect(result.pnl_pct).toBe(0);
    });
  });

  describe('operación tipo PAGO', () => {
    it('debe calcular P&L positivo cuando TC comp < TC base', () => {
      const tc_comp_menor: TCResuelto = {
        tipo: 'DOF',
        fecha: '2025-10-02',
        valor: 18.0,
      };

      const result = calcularPnL('pago', 800, tc_base, tc_comp_menor);

      expect(result.mxn_base).toBe(14560.0);
      expect(result.mxn_comp).toBe(14400.0);
      expect(result.pnl_mxn).toBe(160.0); // mxn_base - mxn_comp (gana al pagar menos)
      expect(result.pnl_pct).toBe(1.099);
    });

    it('debe calcular P&L negativo cuando TC comp > TC base', () => {
      const result = calcularPnL('pago', 800, tc_base, tc_comp);

      expect(result.mxn_base).toBe(14560.0);
      expect(result.mxn_comp).toBe(14664.0);
      expect(result.pnl_mxn).toBe(-104.0); // mxn_base - mxn_comp (pierde al pagar más)
      expect(result.pnl_pct).toBe(-0.714);
    });

    it('debe calcular P&L cero cuando TCs son iguales', () => {
      const result = calcularPnL('pago', 800, tc_base, tc_base);

      expect(result.mxn_base).toBe(14560.0);
      expect(result.mxn_comp).toBe(14560.0);
      expect(result.pnl_mxn).toBe(0);
      expect(result.pnl_pct).toBe(0);
    });
  });

  describe('redondeos', () => {
    it('debe redondear MXN a 2 decimales', () => {
      const tc_decimal: TCResuelto = {
        tipo: 'MANUAL',
        valor: 18.12345,
      };

      const result = calcularPnL('cobro', 100, tc_decimal, tc_decimal);

      expect(result.mxn_base).toBe(1812.35); // Redondeado a 2 decimales
      expect(result.mxn_comp).toBe(1812.35);
    });

    it('debe redondear pnl_pct a 3 decimales', () => {
      const tc_base_test: TCResuelto = {
        tipo: 'DOF',
        valor: 18.0,
      };

      const tc_comp_test: TCResuelto = {
        tipo: 'DOF',
        valor: 18.1234,
      };

      const result = calcularPnL('cobro', 1000, tc_base_test, tc_comp_test);

      // mxn_base = 18000.00
      // mxn_comp = 18123.40
      // pnl_mxn = 123.40
      // pnl_pct = (123.40 / 18000) * 100 = 0.685555... → 0.686
      expect(result.pnl_pct.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(3);
    });
  });

  describe('edge cases', () => {
    it('debe manejar montos grandes correctamente', () => {
      const result = calcularPnL('cobro', 100000, tc_base, tc_comp);

      expect(result.mxn_base).toBe(1820000.0);
      expect(result.mxn_comp).toBe(1833000.0);
      expect(result.pnl_mxn).toBe(13000.0);
    });

    it('debe manejar montos pequeños correctamente', () => {
      const result = calcularPnL('cobro', 1, tc_base, tc_comp);

      expect(result.mxn_base).toBe(18.2);
      expect(result.mxn_comp).toBe(18.33);
      expect(result.pnl_mxn).toBe(0.13);
    });

    it('debe manejar TC MANUAL sin fecha', () => {
      const tc_manual: TCResuelto = {
        tipo: 'MANUAL',
        valor: 18.5,
      };

      const result = calcularPnL('cobro', 500, tc_manual, tc_manual);

      expect(result.mxn_base).toBe(9250.0);
      expect(result.mxn_comp).toBe(9250.0);
      expect(result.pnl_mxn).toBe(0);
    });
  });
});
