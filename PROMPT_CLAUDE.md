🔧 Encargo: robustecer scraping del DOF (Node + TS)

Quiero que actualices mi microservicio Node.js + Express + TypeScript que obtiene el tipo de cambio del DOF. Necesito:

Objetivos

Decodificación correcta del HTML del DOF: la página viene en ISO-8859-1 → usar axios con responseType:'arraybuffer' e iconv-lite para decodificar a latin1.

Parser robusto por filas: buscar la fecha en formato dd/mm/yyyy dentro de cada <tr> y extraer el primer número con 4–6 decimales.

Fallback a día hábil anterior: si la fecha solicitada no existe (o es fin de semana/feriado), retroceder al último día hábil (máx. 3 reintentos) y reportarlo en nota_validación.

Endpoint alterno del DOF: si indicadores_detalle.php falla, intentar tipo_cambio_hist.php (mismo year/month).

Logs claros y mensajes de error consistentes (AUSENTE_DOY cuando no hay dato tras reintentos).

Pruebas automatizadas con fixtures HTML representativos (incluye caso con y sin la fecha).

Aceptación

GET /tipo-cambio?fecha=2025-08-02 (sábado) → 200 con nota_validación que indique fallback, usando 2025-08-01.

GET /tipo-cambio?fecha=2025-10-01 (miércoles) → 200 si la fecha está en HTML; si no aparece aún, retrocede a la anterior hábil y explica el fallback.

Si tras 3 reintentos no hay dato → 404 con error JSON { code:"AUSENTE_DOY" }.

Parser tolerante a espacios/HTML y a codificación latin1.

Cobertura de tests incluye: fecha hábil, fin de semana, “fecha no listada”, cambio de mes y número con 4–6 decimales.

Contexto del repo

TS + Express, servicios dof.service.ts, utilidades utils/html.ts, utils/dates.ts.

Endpoints GET /tipo-cambio, POST /registrar, GET /promedios.

Logger: pino.

Tests: jest + supertest.

OpenAPI ya listo; no cambiar contratos de respuesta.

Cambios que quiero (hazlos como commits atómicos o PR):
1) Dependencia y utilidades

Añade iconv-lite:

npm i iconv-lite


Crea/actualiza src/utils/dates.ts con:

toDDMMYYYY(iso: string): string

isWeekend(iso: string): boolean

previousBusinessDay(iso: string): string // retrocede saltando sáb(6)/dom(0)

2) Descarga y decodificación del HTML

En src/services/dof.service.ts agrega función:

import axios from 'axios';
import iconv from 'iconv-lite';

async function fetchDofHtml(url: string): Promise<string> {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
  return iconv.decode(Buffer.from(res.data), 'latin1'); // ISO-8859-1
}


Implementa getMonthUrls(isoDate) que devuelva un arreglo de URLs en orden de intento:

https://www.dof.gob.mx/indicadores_detalle.php?cod_tipo=1&year=YYYY&month=M

https://www.dof.gob.mx/tipo_cambio_hist.php?year=YYYY&month=M

3) Parser por filas (en src/utils/html.ts)

Implementa:

export function extractTcFromDof(html: string, isoDate: string): number | null {
  const [yyyy, mm, dd] = isoDate.split('-');
  const fechaMX = `${dd}/${mm}/${yyyy}`;              // dd/mm/yyyy
  const rows = html.split(/<\/tr>/i);
  const fechaRe = new RegExp(`\\b${dd}\\/${mm}\\/${yyyy}\\b`);
  const numRe = /\b\d{1,2}\.\d{4,6}\b/;

  for (const row of rows) {
    if (fechaRe.test(row)) {
      const m = row.replace(/\s+/g, ' ').match(numRe);
      if (m) return parseFloat(m[0]);
    }
  }
  return null;
}

4) Lógica con fallback (en src/services/dof.service.ts)

Implementa getTipoCambioDOF(isoDate: string):

Intenta hasta 3 veces:

Construye URLs del mes correspondiente a fechaActual (si cambiaste de mes al retroceder, recalcula URLs).

Descarga HTML (decodificado).

Llama extractTcFromDof(html, fechaActual).

Si encuentra → return { fechaUsada, valor, nota }, donde:

nota = "OK" si fechaUsada===isoDate,

o nota = "SIN_PUBLICACION_FECHA; USADO_ANTERIOR=YYYY-MM-DD" si cayó en fallback.

Si no encuentra → fechaActual = previousBusinessDay(fechaActual) y repite.

Si no lo encuentra tras 3 intentos → lanza AUSENTE_DOY (error controlado).

Si el primer endpoint falla (HTTP/HTML inesperado), intenta el alterno.

5) Integración en el controlador

En GET /tipo-cambio, propaga fechaUsada y nota_validación en la respuesta JSON.

Si lanzas AUSENTE_DOY, responde 404 { code:"AUSENTE_DOY", message:"No hay publicación para la fecha solicitada ni días hábiles anteriores tras 3 intentos" }.

6) Logs y depuración

Log DEBUG del tamaño del HTML y del primeros 200 caracteres (no guardes todo en logs).

Si process.env.DEBUG_DOF === '1', guarda el HTML en .debug/dof_YYYY_MM.html (añade .debug al .gitignore).

7) Tests (jest)

Crea tests/dof.parser.test.ts con fixtures en tests/fixtures/:

dof_ok_row.html (contiene una fila con 01/10/2025 y un valor como 18.1234) → extractTcFromDof(..., '2025-10-01') debe devolver 18.1234.

dof_missing_date.html (no contiene la fecha del día) → extractTcFromDof devuelve null.

dof_misaligned.html (múltiples filas, espacios y etiquetas varias) → el parser aún encuentra el número.

Test de previousBusinessDay:

2025-08-02 → 2025-08-01

2025-08-04 (lunes) → 2025-08-01

Test de getTipoCambioDOF mockeando fetchDofHtml para:

1er intento null, 2º intento con fecha anterior encuentra → retorna con nota_validación de fallback.

Tres intentos fallidos → lanza error con code AUSENTE_DOY.

8) Endpoints de prueba manual (no cambies contrato)

GET /tipo-cambio?fecha=2025-08-02 → 200, nota_validación con fallback a 2025-08-01.

GET /tipo-cambio?fecha=2025-10-01 → 200 si está la fila; si no, fallback.

GET /tipo-cambio?fecha=YYYY-MM-DD (con DEBUG_DOF=1) debe dejar HTML en .debug/.

HTML real para ajustar el parser (PEGA aquí fragmento real)

Pega 10–20 líneas del HTML real del DOF (ya decodificado) donde debería aparecer dd/mm/yyyy (o confirma que no aparece):

<!-- DOF OCTUBRE (fragmento REAL) -->
[PEGA_AQUÍ_EL_HTML_REAL_DECODIFICADO]

Notas y estilo

Mantén TypeScript estricto.

No cambies la forma de las respuestas JSON actuales (solo añade fechaUsada si ya está previsto, y nota_validación).

Usa try/catch con mensajes claros; maneja timeouts de 10s.

No introduzcas dependencias pesadas (usa iconv-lite y regex simples).

Entregables

Cambios en src/utils/dates.ts, src/utils/html.ts, src/services/dof.service.ts, controlador de GET /tipo-cambio.

Nuevos tests y fixtures HTML.

Actualización mínima del README: sección “Scraping DOF” explicando latin1, fallback y endpoints alternos.

Pequeño comentario en openapi.yaml para nota_validación indicando posibles valores: OK, SIN_PUBLICACION_FECHA; USADO_ANTERIOR=YYYY-MM-DD, AUSENTE_DOY.