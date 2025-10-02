import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  PORT: z.string().default('8080'),
  TZ: z.string().default('America/Mexico_City'),
  GOOGLE_PROJECT_ID: z.string(),
  GOOGLE_CLIENT_EMAIL: z.string().email(),
  GOOGLE_PRIVATE_KEY: z.string(),
  GOOGLE_SHEET_ID: z.string(),
  SHEET_TAB: z.string().default('tc_histórico'),
  BANXICO_TOKEN: z.string().optional(),
  ALERTA_VARIACION_PCT: z.string().default('1.0'),
});

const parseEnv = () => {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.format());
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
};

export const env = parseEnv();

export const config_app = {
  port: parseInt(env.PORT, 10),
  timezone: env.TZ,
  google: {
    projectId: env.GOOGLE_PROJECT_ID,
    clientEmail: env.GOOGLE_CLIENT_EMAIL,
    privateKey: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    sheetId: env.GOOGLE_SHEET_ID,
    sheetTab: env.SHEET_TAB,
  },
  banxico: {
    token: env.BANXICO_TOKEN,
  },
  alertas: {
    variacionPct: parseFloat(env.ALERTA_VARIACION_PCT),
  },
};
