/**
 * Rutas para endpoints de tipo de cambio
 */

import { Router } from 'express';
import { getTipoCambio, registrar, getPromedios } from '../controllers/fx.controller.js';

const router = Router();

router.get('/tipo-cambio', getTipoCambio);
router.post('/registrar', registrar);
router.get('/promedios', getPromedios);

export default router;
