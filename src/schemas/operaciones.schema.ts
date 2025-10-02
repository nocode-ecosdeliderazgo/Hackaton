/**
 * Schemas de validación Zod para operaciones FX
 */

import { z } from 'zod';

// Schema para TCInput
const tcInputSchema = z
  .object({
    tipo: z.enum(['DOF', 'MANUAL']),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('hoy')),
    valor: z.number().positive().optional(),
  })
  .refine(
    (data) => {
      // Si tipo === 'DOF', fecha debe estar presente
      if (data.tipo === 'DOF') {
        return data.fecha !== undefined;
      }
      // Si tipo === 'MANUAL', valor debe estar presente
      if (data.tipo === 'MANUAL') {
        return data.valor !== undefined && data.valor > 0;
      }
      return true;
    },
    {
      message:
        'Si tipo es DOF, fecha es requerida. Si tipo es MANUAL, valor es requerido y debe ser > 0',
    }
  );

// Schema para OperacionRequest
export const operacionRequestSchema = z.object({
  tipo: z.enum(['cobro', 'pago']),
  concepto: z.string().optional(),
  contraparte: z.string().optional(),
  fecha_operacion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  monto_usd: z.number().positive(),
  tc_base: tcInputSchema,
  tc_comp: tcInputSchema,
  notas: z.string().optional(),
});

// Schema para query params de GET /operaciones
export const operacionesQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tipo: z.enum(['cobro', 'pago']).optional(),
  estado: z.enum(['pendiente', 'cerrada', 'cancelada']).optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
});

// Tipo inferido de los schemas
export type OperacionRequestInput = z.infer<typeof operacionRequestSchema>;
export type OperacionesQueryInput = z.infer<typeof operacionesQuerySchema>;
