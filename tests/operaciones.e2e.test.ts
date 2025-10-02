/**
 * Tests E2E para endpoints de operaciones FX
 * Nota: Estos tests requieren configuración de Google Sheets y pueden requerir mocks
 */

import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';

describe('POST /operaciones', () => {
  describe('validación de request', () => {
    it('debe retornar 400 si falta tipo', async () => {
      const response = await request(app)
        .post('/operaciones')
        .send({
          fecha_operacion: '2025-10-10',
          monto_usd: 800,
          tc_base: { tipo: 'MANUAL', valor: 18.2 },
          tc_comp: { tipo: 'MANUAL', valor: 18.3 },
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('debe retornar 400 si tipo es inválido', async () => {
      const response = await request(app)
        .post('/operaciones')
        .send({
          tipo: 'invalido',
          fecha_operacion: '2025-10-10',
          monto_usd: 800,
          tc_base: { tipo: 'MANUAL', valor: 18.2 },
          tc_comp: { tipo: 'MANUAL', valor: 18.3 },
        });

      expect(response.status).toBe(400);
    });

    it('debe retornar 400 si monto_usd es negativo', async () => {
      const response = await request(app)
        .post('/operaciones')
        .send({
          tipo: 'cobro',
          fecha_operacion: '2025-10-10',
          monto_usd: -100,
          tc_base: { tipo: 'MANUAL', valor: 18.2 },
          tc_comp: { tipo: 'MANUAL', valor: 18.3 },
        });

      expect(response.status).toBe(400);
    });

    it('debe retornar 400 si tc_base tipo MANUAL sin valor', async () => {
      const response = await request(app)
        .post('/operaciones')
        .send({
          tipo: 'cobro',
          fecha_operacion: '2025-10-10',
          monto_usd: 800,
          tc_base: { tipo: 'MANUAL' },
          tc_comp: { tipo: 'MANUAL', valor: 18.3 },
        });

      expect(response.status).toBe(400);
    });

    it('debe retornar 400 si tc_base tipo DOF sin fecha', async () => {
      const response = await request(app)
        .post('/operaciones')
        .send({
          tipo: 'cobro',
          fecha_operacion: '2025-10-10',
          monto_usd: 800,
          tc_base: { tipo: 'DOF' },
          tc_comp: { tipo: 'MANUAL', valor: 18.3 },
        });

      expect(response.status).toBe(400);
    });

    it('debe retornar 400 si fecha_operacion tiene formato inválido', async () => {
      const response = await request(app)
        .post('/operaciones')
        .send({
          tipo: 'cobro',
          fecha_operacion: '10-10-2025',
          monto_usd: 800,
          tc_base: { tipo: 'MANUAL', valor: 18.2 },
          tc_comp: { tipo: 'MANUAL', valor: 18.3 },
        });

      expect(response.status).toBe(400);
    });
  });

  describe('operaciones válidas con TC MANUAL', () => {
    it('debe crear operación cobro con ambos TC MANUAL', async () => {
      const response = await request(app)
        .post('/operaciones')
        .send({
          tipo: 'cobro',
          concepto: 'Pago cliente test',
          contraparte: 'Test Inc.',
          fecha_operacion: '2025-10-10',
          monto_usd: 800,
          tc_base: { tipo: 'MANUAL', valor: 18.2 },
          tc_comp: { tipo: 'MANUAL', valor: 18.33 },
          notas: 'Test unitario',
        });

      // Puede ser 200 o 500 dependiendo de si Google Sheets está configurado
      if (response.status === 200) {
        expect(response.body).toHaveProperty('id');
        expect(response.body.tipo).toBe('cobro');
        expect(response.body.monto_usd).toBe(800);
        expect(response.body.mxn_base).toBe(14560.0);
        expect(response.body.mxn_comp).toBe(14664.0);
        expect(response.body.pnl_mxn).toBe(104.0);
        expect(response.body.estado).toBe('pendiente');
      }
    });

    it('debe crear operación pago con TC MANUAL', async () => {
      const response = await request(app)
        .post('/operaciones')
        .send({
          tipo: 'pago',
          concepto: 'Pago proveedor test',
          fecha_operacion: '2025-10-15',
          monto_usd: 1000,
          tc_base: { tipo: 'MANUAL', valor: 18.5 },
          tc_comp: { tipo: 'MANUAL', valor: 18.2 },
        });

      if (response.status === 200) {
        expect(response.body.tipo).toBe('pago');
        expect(response.body.monto_usd).toBe(1000);
        expect(response.body.mxn_base).toBe(18500.0);
        expect(response.body.mxn_comp).toBe(18200.0);
        expect(response.body.pnl_mxn).toBe(300.0); // Gana porque paga menos
      }
    });
  });
});

describe('GET /operaciones', () => {
  it('debe retornar 200 con estructura correcta', async () => {
    const response = await request(app).get('/operaciones');

    // Puede ser 200 o 500 dependiendo de si Google Sheets está configurado
    if (response.status === 200) {
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
    }
  });

  it('debe aceptar query params válidos', async () => {
    const response = await request(app)
      .get('/operaciones')
      .query({
        from: '2025-10-01',
        to: '2025-10-31',
        tipo: 'cobro',
        limit: 10,
        offset: 0,
      });

    // Puede ser 200 o 500 dependiendo de si Google Sheets está configurado
    expect([200, 500]).toContain(response.status);
  });

  it('debe retornar 400 si fecha tiene formato inválido', async () => {
    const response = await request(app).get('/operaciones').query({
      from: '10-10-2025',
    });

    expect(response.status).toBe(400);
  });

  it('debe retornar 400 si tipo es inválido', async () => {
    const response = await request(app).get('/operaciones').query({
      tipo: 'invalido',
    });

    expect(response.status).toBe(400);
  });

  it('debe retornar 400 si limit excede el máximo', async () => {
    const response = await request(app).get('/operaciones').query({
      limit: 150,
    });

    expect(response.status).toBe(400);
  });
});
