/**
 * Tests E2E para endpoints de tipo de cambio
 */

import request from 'supertest';
import app from '../src/app.js';

describe('E2E Tests - API de Tipo de Cambio', () => {
  describe('GET /health', () => {
    it('should return 200 and status ok', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('service', 'tc-dof-microservice');
    });
  });

  describe('GET /tipo-cambio', () => {
    it('should return 400 when fecha is missing', async () => {
      const response = await request(app).get('/tipo-cambio').expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should return 400 when fecha format is invalid', async () => {
      const response = await request(app).get('/tipo-cambio?fecha=2025-13-01').expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    // Note: This test requires actual DOF scraping, may be slow or fail if DOF is down
    it.skip('should return tipo de cambio for a valid date', async () => {
      const response = await request(app).get('/tipo-cambio?fecha=2025-10-02').expect(200);

      expect(response.body).toHaveProperty('fecha');
      expect(response.body).toHaveProperty('tc_dof');
      expect(response.body).toHaveProperty('fuente', 'DOF');
      expect(response.body).toHaveProperty('publicado_a_las');
      expect(response.body).toHaveProperty('nota_validacion');
    });
  });

  describe('POST /registrar', () => {
    it('should return 400 when tc_dof is missing', async () => {
      const response = await request(app)
        .post('/registrar')
        .send({
          fecha: '2025-10-02',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should return 400 when tc_dof is not a positive number', async () => {
      const response = await request(app)
        .post('/registrar')
        .send({
          fecha: '2025-10-02',
          tc_dof: -18.1234,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    // Note: This test requires Google Sheets configuration
    it.skip('should register a new tipo de cambio', async () => {
      const response = await request(app)
        .post('/registrar')
        .send({
          fecha: '2025-10-02',
          tc_dof: 18.1234,
          fuente: 'DOF',
          publicado_a_las: '10:35',
          nota_validacion: 'OK',
        })
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('fecha', '2025-10-02');
      expect(response.body).toHaveProperty('tc_dof', 18.1234);
    });
  });

  describe('GET /promedios', () => {
    it('should return promedios structure', async () => {
      const response = await request(app).get('/promedios').expect(200);

      expect(response.body).toHaveProperty('promedio_semanal');
      expect(response.body).toHaveProperty('promedio_mensual');
    });

    it('should return 400 when date format is invalid', async () => {
      const response = await request(app)
        .get('/promedios?from=2025-13-01&to=2025-10-02')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });
  });

  describe('404 Not Found', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app).get('/non-existent').expect(404);

      expect(response.body).toHaveProperty('error', 'Endpoint not found');
    });
  });
});
