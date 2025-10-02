/**
 * Entry point del servidor
 */

import app from './app.js';
import { config_app } from './config/env.js';
import { logger } from './config/logger.js';

const PORT = config_app.port;

app.listen(PORT, () => {
  logger.info(
    {
      port: PORT,
      timezone: config_app.timezone,
      env: process.env.NODE_ENV || 'development',
    },
    `🚀 Servidor iniciado en http://localhost:${PORT}`
  );
});
