Quiero agregar al microservicio Node.js + Express + TypeScript (ya desplegado en Render y protegido con X-API-Key) un módulo de Operaciones FX que:

Calcule P&L de operaciones en USD comparando un tipo de cambio base vs un tipo de cambio de comparación.

Guarde la operación en Google Sheets (pestaña operaciones_fx).

Permita listar operaciones con filtros.

Contexto actual

Ya existe GET /tipo-cambio con fallback a día hábil anterior y parsing DOF (latin1).

Ya existe /registrar y /promedios, integración con Google Sheets y auth por service account.

API protegida con X-API-Key y CORS listo para ChatGPT Actions.

Tenemos openapi.yaml importado en el GPT con Actions.

Objetivos

Nuevo endpoint POST /operaciones: recibe parámetros (tipo, monto, fechas, etc.), resuelve los TCs (DOF o manual), calcula P&L, guarda la fila en Sheets y devuelve el resultado.

Nuevo endpoint GET /operaciones: lista operaciones con filtros (from, to, tipo, estado, q, limit, offset).

Actualizar openapi.yaml con los nuevos paths y schemas.

Tests unitarios (cálculo) e integrados (controlador simulando Sheets).

README: sección “Operaciones FX”.

Esquema de Google Sheets (pestaña operaciones_fx)

Crear (si no existe) en este orden exacto de columnas:

id, ts_creacion, tipo, concepto, contraparte,
fecha_operacion, monto_usd,
tc_base_tipo, tc_base_fecha, tc_base_valor,
tc_comp_tipo, tc_comp_fecha, tc_comp_valor,
mxn_base, mxn_comp, pnl_mxn, pnl_pct,
estado, fecha_cierre, notas, hash


tipo: cobro (te pagan USD) o pago (tú pagas USD).

Cálculo P&L (desde la perspectiva del usuario):

cobro: pnl_mxn = mxn_comp - mxn_base

pago: pnl_mxn = mxn_base - mxn_comp

Redondeos: mxn_* a 2 decimales, pnl_pct a 3 decimales.

Contratos (OpenAPI)
POST /operaciones

Request JSON:

{
  "tipo": "cobro",                // "cobro" | "pago"
  "concepto": "Pago cliente ACME",
  "contraparte": "ACME Inc.",
  "fecha_operacion": "2025-10-10", // YYYY-MM-DD
  "monto_usd": 800,
  "tc_base": { "tipo": "DOF", "fecha": "2025-10-10" },      // O { "tipo":"MANUAL", "valor": 18.20 }
  "tc_comp": { "tipo": "DOF", "fecha": "hoy" },             // O { "tipo":"DOF","fecha":"2025-10-02" } o { "tipo":"MANUAL","valor": 18.33 }
  "notas": "Simulación vs hoy"
}


Response 200 JSON (ejemplo):

{
  "id": "op_9f2c01",
  "tipo": "cobro",
  "concepto": "Pago cliente ACME",
  "contraparte": "ACME Inc.",
  "fecha_operacion": "2025-10-10",
  "monto_usd": 800,
  "tc_base": { "tipo": "DOF", "fecha": "2025-10-10", "valor": 18.20 },
  "tc_comp": {
    "tipo": "DOF",
    "fecha": "2025-10-02",
    "valor": 18.33,
    "nota": "SIN_PUBLICACION_FECHA; USADO_ANTERIOR=2025-10-02"
  },
  "mxn_base": 14560.00,
  "mxn_comp": 14664.00,
  "pnl_mxn": 104.00,
  "pnl_pct": 0.714,
  "estado": "pendiente",
  "sheet_row": 27
}

GET /operaciones

Query params opcionales: from, to, tipo, estado, q, limit, offset
Response 200:

{
  "total": 2,
  "items": [ { "...": "..." }, { "...": "..." } ]
}

Cambios solicitados (archivos y lógica)
1) Schemas de validación

Crea un schema Zod (o equivalente) para OperacionRequest:

tipo: enum ['cobro','pago']

fecha_operacion: YYYY-MM-DD

monto_usd: number > 0

tc_base: { tipo: 'DOF'|'MANUAL', fecha?: string, valor?: number }

si tipo==='DOF' → fecha obligatoria YYYY-MM-DD

si tipo==='MANUAL' → valor obligatorio > 0

tc_comp: igual estructura que tc_base pero si tipo==='DOF' permite fecha='hoy' por defecto

concepto, contraparte, notas: opcionales string

2) Servicio de resolución de TC

Usa el servicio existente que consulta DOF:

Si tc.tipo==='DOF':

si fecha==='hoy' o vacío → usa hoy MX (y fallback si aplica).

llama a getTipoCambioDOF(fecha) → obtén { valor, fechaUsada, nota }.

Si tc.tipo==='MANUAL' → usa valor directamente.

Estandariza la salida:

interface TcResuelto { tipo: 'DOF'|'MANUAL'; fecha?: string; valor: number; nota?: string }

3) Cálculo

mxn_base = round(monto_usd * tc_base.valor, 2)

mxn_comp = round(monto_usd * tc_comp.valor, 2)

pnl_mxn: según tipo (reglas arriba)

pnl_pct = mxn_base ? round(pnl_mxn / mxn_base * 100, 3) : 0

4) Persistencia en Google Sheets

Agrega función appendOperacionFx(row: any[]) apuntando a la pestaña operaciones_fx.

Genera:

id: prefijo op_ + random/uuid corto

ts_creacion: ISO now

hash: opcional (ej. hash de campos clave para auditoría)

estado: "pendiente"

fecha_cierre: null

Inserta la fila con el orden de columnas exacto.

Devuelve sheet_row (número de fila insertada si es posible).

5) Rutas

POST /operaciones: implementa el flujo completo (validar → resolver TCs → calcular → escribir a Sheets → responder JSON).

GET /operaciones: lee operaciones_fx, aplica filtros en memoria o con query a Sheets (lo que sea más práctico por ahora) y pagina con limit/offset.

6) OpenAPI

Actualiza openapi.yaml: schemas OperacionRequest, OperacionResponse y paths /operaciones (GET/POST), con security: [ { ApiKeyAuth: [] } ] usando el mismo esquema de API Key global.

Mantén el server apuntando a producción (Render).

7) Tests

Unit:

Cálculo P&L (cobro/pago) con valores base/compuestos.

Redondeos (2 y 3 decimales).

Integración (mock de Sheets y mock de DOF service):

POST /operaciones con DOF/DOF (una fecha tiene fallback).

POST /operaciones con MANUAL/DOF.

GET /operaciones con filtros (al menos tipo, from/to).

Edge cases:

monto_usd inválido, fechas inválidas, tc_base o tc_comp mal definidos → 400.

8) README

Nueva sección “Operaciones FX” con:

Ejemplo de request/response de POST /operaciones

Ejemplo de GET /operaciones

Explicación breve de reglas P&L y fallback DOF.

Aceptación

POST /operaciones con:

{
  "tipo":"cobro",
  "concepto":"Pago cliente ACME",
  "fecha_operacion":"2025-10-10",
  "monto_usd":800,
  "tc_base":{"tipo":"DOF","fecha":"2025-10-10"},
  "tc_comp":{"tipo":"DOF","fecha":"hoy"}
}


→ 200 con JSON que incluya mxn_base, mxn_comp, pnl_mxn, pnl_pct, tc_* resueltos y sheet_row.

GET /operaciones?from=2025-10-01&to=2025-10-31&tipo=cobro → 200 con al menos 1 item si previamente inserté.

OpenAPI reimportable en el editor de GPT sin errores.

Estilo/código

TypeScript estricto, logs con pino (INFO para inicio y éxito; WARN/ERROR para fallas).

Reusar utilidades existentes (fechas MX, fallback DOF, redondeo).

Sin romper los contratos previos (/tipo-cambio, /registrar, /promedios).

Commits atómicos (servicio, rutas, tests, openapi, readme).

LO QUE TÚ HACES (pasos manuales)

Crear pestaña en Sheets

En tu GOOGLE_SHEET_ID, crea la pestaña operaciones_fx con las columnas exactas:

id | ts_creacion | tipo | concepto | contraparte | fecha_operacion | monto_usd |
tc_base_tipo | tc_base_fecha | tc_base_valor |
tc_comp_tipo | tc_comp_fecha | tc_comp_valor |
mxn_base | mxn_comp | pnl_mxn | pnl_pct |
estado | fecha_cierre | notas | hash


Comparte la hoja con la service account (Editor).

Reimportar la Action en tu GPT

Actualiza tu openapi.yaml (con los nuevos paths).

En GPT Builder → Actions → Import OpenAPI, pega el YAML.

La Auth debe seguir enviando X-API-Key.

Probar desde el GPT

“Registra una operación: cobro 800 USD el 2025-10-10 vs hoy.”

Luego: “Lista mis operaciones de octubre.”

(Opcional) Conversation starters

“Simular cobro 800 USD vs hoy (y registrar)”

“Listar operaciones de esta semana”

“Pago 1200 USD vs DOF del 2025-10-02”

(Opcional) Política/Disclaimer

“Las simulaciones usan DOF consolidado (y fallback a día hábil). No constituyen asesoría financiera.”