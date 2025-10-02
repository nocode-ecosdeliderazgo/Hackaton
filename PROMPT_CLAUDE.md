Genera un microservicio en Node.js + Express (TypeScript) para automatizar el tipo de cambio del dólar del DOF con validación opcional del FIX de Banxico, registro en Google Sheets, y cálculo de promedios semanal/mensual. Entrega un proyecto completo y ejecutable con estructura, código, pruebas, OpenAPI y Docker.

Objetivo

Obtener el tipo de cambio oficial del DOF (scrape/parse del histórico mensual por año/mes; heurística ajustable).

Validar opcionalmente contra FIX Banxico (serie SF43718) usando token.

Registrar en Google Sheets (Service Account) con esquema fijo.

Calcular promedio semanal (lunes–domingo) y promedio mensual (1–fin de mes) usando solo días con publicación.

Exponer endpoints REST y OpenAPI 3.0; incluir tests y Dockerfile.

Tech & calidad

Node 18+, Express, TypeScript (ESM), Zod (validación).

HTTP client: axios o undici. Logs: pino. Env: dotenv.

Google Sheets: googleapis (JWT Service Account).

Lint/format: ESLint + Prettier.

Tests: Jest + supertest.

Dockerfile (multi-stage) y docker-compose.yml opcional.

Scripts en package.json: dev, build, start, test, lint, format.

Estructura
/src
  app.ts
  server.ts
  /config
    env.ts
    logger.ts
  /utils
    dates.ts       // helpers semana ISO, rango mes, parse fechas MX
    hash.ts        // md5(fecha+valor)
    html.ts        // helpers para extraer número decimal del HTML
  /services
    dof.service.ts       // descarga y parse del DOF (por año/mes)
    banxico.service.ts   // FIX serie SF43718
    sheets.service.ts    // append/read a Google Sheets
    stats.service.ts     // promedio semanal/mensual
  /controllers
    fx.controller.ts
    health.controller.ts
  /routes
    fx.route.ts
    health.route.ts
/tests
  fx.e2e.test.ts
openapi.yaml
Dockerfile
docker-compose.yml
jest.config.ts
tsconfig.json
.eslintrc.cjs
.prettierrc
README.md

Variables de entorno (.env)
PORT=8080
TZ=America/Mexico_City
GOOGLE_PROJECT_ID=...
GOOGLE_CLIENT_EMAIL=...
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=<<ID_DE_LA_HOJA>>
SHEET_TAB=tc_histórico
BANXICO_TOKEN=<<OPCIONAL>>
ALERTA_VARIACION_PCT=1.0

Esquema de la Sheet (pestaña tc_histórico)

Encabezados exactos (fila 1):

fecha (YYYY-MM-DD) | tc_dof | fuente | publicado_a_las | hash_registro | nota_validación

Endpoints

GET /health → {status:"ok"}

GET /tipo-cambio?fecha=YYYY-MM-DD

Obtiene DOF del día (parsea histórico mensual por YYYY/MM y extrae el valor del día).

Si BANXICO_TOKEN está presente, obtiene FIX y marca nota_validación="DIF_DOFBANX" si |DOF−FIX|/FIX > 1%.

Respuesta:

{
  "fecha": "2025-10-02",
  "tc_dof": 18.1234,
  "tc_fix": 18.1150,
  "fuente": "DOF",
  "publicado_a_las": "10:35",
  "nota_validación": "OK"
}


POST /registrar

Body:

{
  "fecha": "YYYY-MM-DD",   // si falta, usar hoy MX
  "tc_dof": 18.1234,
  "fuente": "DOF",
  "publicado_a_las": "HH:mm",
  "nota_validación": "OK"
}


Inserta fila si no existe fecha. Genera hash_registro = md5(fecha+tc_dof).

GET /promedios?from=YYYY-MM-DD&to=YYYY-MM-DD

Si no se pasan rangos, usa semana y mes de la fecha actual (zona MX).

Respuesta:

{
  "promedio_semanal": { "isoYear": 2025, "isoWeek": 40, "valor": 18.15 },
  "promedio_mensual": { "year": 2025, "month": 10, "valor": 18.09 }
}

Reglas de negocio

Semana calendario ISO (lun–dom) y mes calendario.

Solo promediar días con tc_dof registrado (sin imputar fines de semana/feriados).

Si DOF no publica para una fecha, devolver 404 lógico o nota_validación="AUSENTE_DOY".

Registrar en Sheets: evita duplicados por fecha.

Al registrar, si ALERTA_VARIACION_PCT está definido, compara contra el último día previo y loggea warning si supera el umbral.

DOF scraping (importante)

Implementa dof.service.ts con una heurística desacoplada (función pura) que:

descarga el HTML del histórico mensual (por year y month),

localiza la fila del YYYY-MM-DD,

extrae el primer decimal con 4–6 decimales.

Centraliza selectores/regex en html.ts para ajustes futuros.

Maneja cambios de HTML con try/catch y mensajes claros.

Banxico FIX

Serie SF43718 (oportuno). Si hay token, traer valor numérico y normalizar coma/punto.

OpenAPI (openapi.yaml)

OpenAPI 3.0 con:

/health GET

/tipo-cambio GET (query: fecha)

/registrar POST (schemas request/response)

/promedios GET (query: from, to)

Incluye examples y descripciones; genera campos para usarlo como Action de un GPT (auth por API key opcional).

Tests

Unit: dates.ts (semana ISO), stats.service.ts (promedios).

E2E con supertest:

GET /health → 200

Mock de DOF/Banxico para GET /tipo-cambio

POST /registrar inserta y no duplica

GET /promedios con fixtures verifica valores.

README (obligatorio)

Incluye:

Cómo crear Service Account y compartir la Sheet con GOOGLE_CLIENT_EMAIL.

Scopes requeridos y configuración .env.

Comandos:

npm i
npm run dev
npm run test
npm run build && npm start


Docker:

docker build -t tc-dof .
docker run -p 8080:8080 --env-file .env tc-dof


Ejemplos curl:

curl 'http://localhost:8080/health'
curl 'http://localhost:8080/tipo-cambio?fecha=2025-10-02'
curl -X POST 'http://localhost:8080/registrar' \
  -H 'Content-Type: application/json' \
  -d '{"fecha":"2025-10-02","tc_dof":18.1234,"fuente":"DOF","publicado_a_las":"10:35","nota_validación":"OK"}'
curl 'http://localhost:8080/promedios'

Calidad

TypeScript estricto, controladores delgados, servicios puros testeables.

Middleware de errores centralizado.

Logs estructurados con pino.

Código limpio y comentado donde el HTML del DOF pueda cambiar.

Entrega el proyecto completo con todos los archivos listados, código implementado y listo para ejecutar.