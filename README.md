# Microservicio de Tipo de Cambio DOF

Microservicio en Node.js + Express (TypeScript) para automatizar el tipo de cambio del dólar del DOF con validación opcional del FIX de Banxico, registro en Google Sheets, y cálculo de promedios semanal/mensual.

## 📋 Características

- ✅ **Scraping DOF**: Obtiene el tipo de cambio oficial del histórico mensual del DOF
- ✅ **Validación Banxico**: Validación opcional contra FIX Banxico (serie SF43718)
- ✅ **Google Sheets**: Registro automático con Service Account
- ✅ **Promedios**: Cálculo de promedio semanal ISO y mensual
- ✅ **API REST**: Endpoints documentados con OpenAPI 3.0
- ✅ **TypeScript**: Código type-safe con validación Zod
- ✅ **Tests**: Jest + Supertest con coverage configurado
- ✅ **Docker**: Multi-stage Dockerfile y docker-compose
- ✅ **Logging**: Logs estructurados con Pino
- ✅ **Code Quality**: ESLint + Prettier configurados

## 🚀 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express
- **Language**: TypeScript (ESM)
- **Validation**: Zod
- **HTTP Client**: Axios
- **Google Sheets**: googleapis
- **Logging**: Pino
- **Testing**: Jest + Supertest
- **Code Quality**: ESLint + Prettier

## 📁 Estructura del Proyecto

```
├── src/
│   ├── app.ts                    # Configuración Express
│   ├── server.ts                 # Entry point
│   ├── config/
│   │   ├── env.ts               # Variables de entorno
│   │   └── logger.ts            # Configuración de logging
│   ├── utils/
│   │   ├── dates.ts             # Helpers de fechas (ISO weeks, rangos)
│   │   ├── hash.ts              # Generación de hash MD5
│   │   └── html.ts              # Helpers para scraping DOF
│   ├── services/
│   │   ├── dof.service.ts       # Scraping del DOF
│   │   ├── banxico.service.ts   # API de Banxico
│   │   ├── sheets.service.ts    # Integración Google Sheets
│   │   └── stats.service.ts     # Cálculo de promedios
│   ├── controllers/
│   │   ├── fx.controller.ts     # Controladores de tipo de cambio
│   │   └── health.controller.ts # Health check
│   └── routes/
│       ├── fx.route.ts          # Rutas de tipo de cambio
│       └── health.route.ts      # Rutas de health
├── tests/
│   ├── fx.e2e.test.ts          # Tests E2E
│   ├── dates.test.ts           # Tests unitarios de dates
│   └── hash.test.ts            # Tests unitarios de hash
├── openapi.yaml                 # Especificación OpenAPI 3.0
├── Dockerfile                   # Multi-stage build
├── docker-compose.yml          # Orquestación Docker
├── package.json                # Dependencias y scripts
├── tsconfig.json               # Configuración TypeScript
├── jest.config.ts              # Configuración Jest
├── .eslintrc.cjs               # Configuración ESLint
├── .prettierrc                 # Configuración Prettier
└── README.md                   # Este archivo
```

## 🔧 Configuración

### 1. Crear Service Account de Google

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API de Google Sheets
4. Ve a **IAM & Admin** > **Service Accounts**
5. Crea una nueva Service Account
6. Genera una clave JSON para la Service Account
7. Descarga el archivo JSON

### 2. Configurar Google Sheets

1. Crea una nueva hoja de cálculo en Google Sheets
2. Comparte la hoja con el email de la Service Account (con permisos de editor)
3. Crea una pestaña llamada `tc_histórico`
4. En la primera fila (encabezados), agrega:

```
fecha | tc_dof | fuente | publicado_a_las | hash_registro | nota_validación
```

### 3. Variables de Entorno

Copia `.env.example` a `.env` y completa las variables:

```bash
cp .env.example .env
```

Edita `.env`:

```env
PORT=8080
TZ=America/Mexico_City

# Google Sheets Configuration
GOOGLE_PROJECT_ID=tu-project-id
GOOGLE_CLIENT_EMAIL=tu-service-account@tu-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_PRIVATE_KEY_AQUI\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=tu_google_sheet_id
SHEET_TAB=tc_histórico

# Banxico Configuration (Optional)
BANXICO_TOKEN=tu_token_banxico

# Alertas
ALERTA_VARIACION_PCT=1.0
```

**Nota**: Para obtener `GOOGLE_SHEET_ID`, toma la parte de la URL de tu hoja:
```
https://docs.google.com/spreadsheets/d/[ESTE_ES_EL_ID]/edit
```

### 4. Scopes Requeridos de Google

La Service Account necesita los siguientes scopes:

```
https://www.googleapis.com/auth/spreadsheets
```

Esto ya está configurado en el código (`sheets.service.ts`).

## 📦 Instalación

### Usando npm

```bash
# Instalar dependencias
npm install

# Modo desarrollo (watch mode)
npm run dev

# Build para producción
npm run build

# Ejecutar producción
npm start
```

### Usando Docker

```bash
# Build de la imagen
docker build -t tc-dof .

# Ejecutar contenedor
docker run -p 8080:8080 --env-file .env tc-dof

# O usando docker-compose
docker-compose up -d
```

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Tests en modo watch
npm run test:watch

# Ver coverage
npm test -- --coverage
```

## 🔍 Linting y Formato

```bash
# Lint
npm run lint

# Lint y auto-fix
npm run lint:fix

# Format check
npm run format:check

# Format y auto-fix
npm run format
```

## 🌐 Endpoints

### Operaciones FX

#### POST /operaciones

Crea una nueva operación FX, resuelve los tipos de cambio (DOF o manual), calcula P&L y registra en Google Sheets.

**Request Body**:
```json
{
  "tipo": "cobro",
  "concepto": "Pago cliente ACME",
  "contraparte": "ACME Inc.",
  "fecha_operacion": "2025-10-10",
  "monto_usd": 800,
  "tc_base": {
    "tipo": "DOF",
    "fecha": "2025-10-10"
  },
  "tc_comp": {
    "tipo": "DOF",
    "fecha": "hoy"
  },
  "notas": "Simulación vs hoy"
}
```

**Tipos de Cambio Soportados**:

- **DOF**: Obtiene el tipo de cambio del DOF para una fecha específica
  - `fecha`: YYYY-MM-DD o "hoy" para usar la fecha actual de México
  - Aplica fallback automático a día hábil anterior si no hay publicación
- **MANUAL**: Usa un valor de tipo de cambio proporcionado manualmente
  - `valor`: número positivo

**Tipos de Operación**:

- **cobro**: El usuario recibe USD
  - P&L = mxn_comp - mxn_base
  - Gana si el TC de comparación es mayor que el base
- **pago**: El usuario paga USD
  - P&L = mxn_base - mxn_comp
  - Gana si el TC de comparación es menor que el base

**Ejemplo Response**:
```json
{
  "id": "op_9f2c01",
  "tipo": "cobro",
  "concepto": "Pago cliente ACME",
  "contraparte": "ACME Inc.",
  "fecha_operacion": "2025-10-10",
  "monto_usd": 800,
  "tc_base": {
    "tipo": "DOF",
    "fecha": "2025-10-10",
    "valor": 18.20
  },
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
```

**Ejemplo cURL**:
```bash
curl -X POST 'http://localhost:8080/operaciones' \
  -H 'Content-Type: application/json' \
  -d '{
    "tipo": "cobro",
    "concepto": "Pago cliente ACME",
    "fecha_operacion": "2025-10-10",
    "monto_usd": 800,
    "tc_base": {"tipo": "DOF", "fecha": "2025-10-10"},
    "tc_comp": {"tipo": "DOF", "fecha": "hoy"}
  }'
```

#### GET /operaciones

Lista operaciones FX con filtros opcionales.

**Query Parameters**:
- `from`: Fecha inicial (YYYY-MM-DD)
- `to`: Fecha final (YYYY-MM-DD)
- `tipo`: Filtrar por tipo (`cobro` o `pago`)
- `estado`: Filtrar por estado (`pendiente`, `cerrada`, `cancelada`)
- `q`: Búsqueda en concepto, contraparte y notas
- `limit`: Número de resultados por página (default: 20, max: 100)
- `offset`: Offset para paginación (default: 0)

**Ejemplo Response**:
```json
{
  "total": 2,
  "items": [
    {
      "id": "op_9f2c01",
      "tipo": "cobro",
      "concepto": "Pago cliente ACME",
      "fecha_operacion": "2025-10-10",
      "monto_usd": 800,
      "tc_base": { "tipo": "DOF", "fecha": "2025-10-10", "valor": 18.20 },
      "tc_comp": { "tipo": "DOF", "fecha": "2025-10-02", "valor": 18.33 },
      "mxn_base": 14560.00,
      "mxn_comp": 14664.00,
      "pnl_mxn": 104.00,
      "pnl_pct": 0.714,
      "estado": "pendiente"
    }
  ]
}
```

**Ejemplo cURL**:
```bash
# Listar todas las operaciones de octubre
curl 'http://localhost:8080/operaciones?from=2025-10-01&to=2025-10-31'

# Listar solo operaciones de cobro
curl 'http://localhost:8080/operaciones?tipo=cobro&limit=10'

# Buscar por texto
curl 'http://localhost:8080/operaciones?q=ACME'
```

**Esquema de Google Sheets (pestaña operaciones_fx)**:

Crear en este orden exacto de columnas:

```
id | ts_creacion | tipo | concepto | contraparte | fecha_operacion | monto_usd |
tc_base_tipo | tc_base_fecha | tc_base_valor |
tc_comp_tipo | tc_comp_fecha | tc_comp_valor |
mxn_base | mxn_comp | pnl_mxn | pnl_pct |
estado | fecha_cierre | notas | hash
```

**Reglas de Cálculo P&L**:

- `mxn_base` = round(monto_usd × tc_base.valor, 2 decimales)
- `mxn_comp` = round(monto_usd × tc_comp.valor, 2 decimales)
- `pnl_mxn`:
  - cobro: `mxn_comp - mxn_base` (gana si TC sube)
  - pago: `mxn_base - mxn_comp` (gana si TC baja)
- `pnl_pct` = round((pnl_mxn / mxn_base) × 100, 3 decimales)

### Health Check

```bash
GET /health
```

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-02T12:00:00.000Z",
  "service": "tc-dof-microservice"
}
```

### Obtener Tipo de Cambio

```bash
GET /tipo-cambio?fecha=YYYY-MM-DD
```

**Ejemplo**:
```bash
curl 'http://localhost:8080/tipo-cambio?fecha=2025-10-02'
```

**Response**:
```json
{
  "fecha": "2025-10-02",
  "tc_dof": 18.1234,
  "tc_fix": 18.1150,
  "fuente": "DOF",
  "publicado_a_las": "12:00",
  "nota_validacion": "OK"
}
```

### Registrar Tipo de Cambio

```bash
POST /registrar
Content-Type: application/json
```

**Body**:
```json
{
  "fecha": "2025-10-02",
  "tc_dof": 18.1234,
  "fuente": "DOF",
  "publicado_a_las": "10:35",
  "nota_validacion": "OK"
}
```

**Ejemplo**:
```bash
curl -X POST 'http://localhost:8080/registrar' \
  -H 'Content-Type: application/json' \
  -d '{
    "fecha": "2025-10-02",
    "tc_dof": 18.1234,
    "fuente": "DOF",
    "publicado_a_las": "10:35",
    "nota_validacion": "OK"
  }'
```

**Response**:
```json
{
  "message": "Registro insertado correctamente",
  "fecha": "2025-10-02",
  "tc_dof": 18.1234
}
```

### Obtener Promedios

```bash
GET /promedios?from=YYYY-MM-DD&to=YYYY-MM-DD
```

**Ejemplo**:
```bash
curl 'http://localhost:8080/promedios'
```

**Response**:
```json
{
  "promedio_semanal": {
    "isoYear": 2025,
    "isoWeek": 40,
    "valor": 18.15,
    "diasConsiderados": 5
  },
  "promedio_mensual": {
    "year": 2025,
    "month": 10,
    "valor": 18.09,
    "diasConsiderados": 22
  }
}
```

## 📄 Documentación OpenAPI

La documentación completa de la API está disponible en `openapi.yaml`. Puedes visualizarla usando:

- [Swagger Editor](https://editor.swagger.io/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [Redoc](https://github.com/Redocly/redoc)

Simplemente copia el contenido de `openapi.yaml` en cualquiera de estas herramientas.

## 🎯 Casos de Uso

### 1. Workflow Completo

```bash
# 1. Obtener tipo de cambio del DOF
curl 'http://localhost:8080/tipo-cambio?fecha=2025-10-02'

# 2. Registrar en Google Sheets
curl -X POST 'http://localhost:8080/registrar' \
  -H 'Content-Type: application/json' \
  -d '{
    "fecha": "2025-10-02",
    "tc_dof": 18.1234,
    "fuente": "DOF",
    "publicado_a_las": "12:00",
    "nota_validacion": "OK"
  }'

# 3. Obtener promedios
curl 'http://localhost:8080/promedios'
```

### 2. Automatización Diaria

Puedes usar cron o un scheduler para automatizar la obtención diaria:

```bash
# Crontab ejemplo (ejecutar a las 13:00 todos los días)
0 13 * * * curl 'http://localhost:8080/tipo-cambio?fecha=$(date +\%Y-\%m-\%d)'
```

## 🔐 Seguridad

- ✅ Service Account para acceso seguro a Google Sheets
- ✅ Validación de entrada con Zod
- ✅ Manejo centralizado de errores
- ✅ Logging estructurado (sin exponer información sensible)
- ✅ Docker con usuario no-root
- ✅ Variables de entorno para secrets

## 📊 Monitoring

El servicio expone un endpoint de health check (`/health`) que puede ser usado por:

- Docker healthcheck (ya configurado)
- Kubernetes liveness/readiness probes
- Uptime monitoring services (UptimeRobot, Pingdom, etc.)

## 🐛 Troubleshooting

### Error: "Invalid environment variables"

Verifica que todas las variables requeridas estén en `.env` y que `GOOGLE_PRIVATE_KEY` tenga el formato correcto (con `\n` para saltos de línea).

### Error: "No se encontró tipo de cambio en DOF"

El DOF puede no tener publicaciones para ciertos días (fines de semana, feriados). Esto es esperado.

### Error: Google Sheets permission denied

Asegúrate de que:
1. La hoja está compartida con el email de la Service Account
2. Los permisos son de "Editor"
3. `GOOGLE_SHEET_ID` es correcto

### Error: Banxico API 404

Banxico puede no tener datos para ciertas fechas. El campo `tc_fix` será `undefined` en estos casos.

## 📝 Notas Técnicas

### Heurística de Scraping DOF

El servicio implementa una heurística ajustable para extraer el tipo de cambio del HTML del DOF. Los selectores están centralizados en `src/utils/html.ts` para facilitar ajustes futuros si el DOF cambia su estructura.

### Semanas ISO

Los promedios semanales usan semanas ISO (lunes a domingo), calculadas con la función `getISOWeek` en `src/utils/dates.ts`.

### Hash de Registros

Cada registro en Google Sheets incluye un hash MD5 de `fecha + tc_dof` para detectar duplicados y mantener integridad.

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT.

## 👥 Autor

Desarrollado para automatizar el seguimiento del tipo de cambio oficial del DOF.

## 🙏 Agradecimientos

- [DOF](https://www.dof.gob.mx/) por publicar el tipo de cambio oficial
- [Banxico](https://www.banxico.org.mx/) por la API del FIX
- [Google Sheets API](https://developers.google.com/sheets/api) por la integración
