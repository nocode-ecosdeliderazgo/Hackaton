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

## 🌐 Scraping del DOF

### Decodificación Latin1

El sitio del DOF publica sus páginas en codificación **ISO-8859-1** (latin1). El microservicio implementa:

- **Descarga con `arraybuffer`**: Recibe los datos como buffer binario
- **Decodificación con `iconv-lite`**: Convierte de latin1 a UTF-8
- **Parser robusto por filas**: Busca la fecha en formato `dd/mm/yyyy` dentro de cada `<tr>`

### Fallback a Días Hábiles Anteriores

Si la fecha solicitada no existe en el DOF (fines de semana, feriados, o datos no publicados aún):

1. **Retrocede automáticamente** al día hábil anterior (salta sábados y domingos)
2. **Máximo 3 reintentos**: Intenta hasta 3 días hábiles anteriores
3. **Reporta en `nota_validacion`**: Indica qué fecha se usó finalmente

**Ejemplo**:
```bash
# Solicitar un sábado
curl 'http://localhost:8080/tipo-cambio?fecha=2025-08-02'

# Response con fallback
{
  "fecha": "2025-08-02",
  "fechaUsada": "2025-08-01",
  "tc_dof": 18.1234,
  "nota_validacion": "SIN_PUBLICACION_FECHA; USADO_ANTERIOR=2025-08-01"
}
```

### Endpoints Alternos del DOF

El servicio prueba dos endpoints en orden:

1. **Principal**: `indicadores_detalle.php?cod_tipo=1&year=YYYY&month=M`
2. **Alterno**: `tipo_cambio_hist.php?year=YYYY&month=M`

Si el primero falla, intenta automáticamente con el segundo.

### Debugging

Activa el modo debug para guardar el HTML descargado:

```bash
# Configurar en .env
DEBUG_DOF=1

# Los archivos se guardan en
.debug/dof_YYYY_MM.html
```

**Nota**: El directorio `.debug/` está en `.gitignore`.

### Valores de `nota_validacion`

- **`OK`**: Fecha encontrada sin problemas
- **`SIN_PUBLICACION_FECHA; USADO_ANTERIOR=YYYY-MM-DD`**: Usó día hábil anterior
- **`DIF_DOF_BANX`**: Diferencia significativa entre DOF y Banxico (>1%)
- **`AUSENTE_DOF`**: No hay datos tras 3 reintentos (error 404)

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
  "fechaUsada": "2025-10-02",
  "tc_dof": 18.1234,
  "tc_fix": 18.1150,
  "fuente": "DOF",
  "publicado_a_las": "12:00",
  "nota_validacion": "OK"
}
```

**Nota**: `fechaUsada` puede ser diferente a `fecha` si se usó fallback a un día hábil anterior.

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
