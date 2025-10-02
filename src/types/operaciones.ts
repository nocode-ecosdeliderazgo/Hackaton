/**
 * Tipos e interfaces para operaciones FX
 */

export type TipoOperacion = 'cobro' | 'pago';
export type TipoTC = 'DOF' | 'MANUAL';
export type EstadoOperacion = 'pendiente' | 'cerrada' | 'cancelada';

export interface TCInput {
  tipo: TipoTC;
  fecha?: string; // YYYY-MM-DD, 'hoy', o undefined para 'hoy'
  valor?: number; // Requerido si tipo === 'MANUAL'
}

export interface TCResuelto {
  tipo: TipoTC;
  fecha?: string; // YYYY-MM-DD
  valor: number;
  nota?: string; // Ej: "SIN_PUBLICACION_FECHA; USADO_ANTERIOR=2025-10-02"
}

export interface OperacionRequest {
  tipo: TipoOperacion;
  concepto?: string;
  contraparte?: string;
  fecha_operacion: string; // YYYY-MM-DD
  monto_usd: number;
  tc_base: TCInput;
  tc_comp: TCInput;
  notas?: string;
}

export interface OperacionCalculada {
  tipo: TipoOperacion;
  concepto?: string;
  contraparte?: string;
  fecha_operacion: string;
  monto_usd: number;
  tc_base: TCResuelto;
  tc_comp: TCResuelto;
  mxn_base: number;
  mxn_comp: number;
  pnl_mxn: number;
  pnl_pct: number;
  notas?: string;
}

export interface OperacionResponse extends OperacionCalculada {
  id: string;
  estado: EstadoOperacion;
  sheet_row?: number;
}

export interface OperacionRow {
  id: string;
  ts_creacion: string;
  tipo: TipoOperacion;
  concepto: string;
  contraparte: string;
  fecha_operacion: string;
  monto_usd: number;
  tc_base_tipo: TipoTC;
  tc_base_fecha: string;
  tc_base_valor: number;
  tc_comp_tipo: TipoTC;
  tc_comp_fecha: string;
  tc_comp_valor: number;
  mxn_base: number;
  mxn_comp: number;
  pnl_mxn: number;
  pnl_pct: number;
  estado: EstadoOperacion;
  fecha_cierre: string;
  notas: string;
  hash: string;
}

export interface OperacionesListResponse {
  total: number;
  items: OperacionResponse[];
}

export interface OperacionesFilter {
  from?: string;
  to?: string;
  tipo?: TipoOperacion;
  estado?: EstadoOperacion;
  q?: string;
  limit?: number;
  offset?: number;
}
