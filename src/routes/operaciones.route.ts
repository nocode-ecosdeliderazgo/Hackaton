/**
 * Rutas para operaciones FX
 */

import { Router } from 'express';
import { crearOperacion, listarOperaciones } from '../controllers/operaciones.controller.js';

const router = Router();

/**
 * POST /operaciones
 * Crea una nueva operación FX
 */
router.post('/', crearOperacion);

/**
 * GET /operaciones
 * Lista operaciones FX con filtros opcionales
 */
router.get('/', listarOperaciones);

export default router;
