# @acme/processing

Pipeline de procesamiento automático para Gaussian Splatting Platform.

## 📋 Descripción

Este paquete maneja el procesamiento automático de uploads de usuarios a través de un sistema de pipeline por etapas. Soporta diferentes tipos de archivos (videos, imágenes ZIP, archivos PLY/SPLAT) con pipelines específicos para cada tipo.

## 🏗️ Arquitectura

### Componentes

1. **Pipeline Creator** (`src/services/pipeline-creator.ts`)
   - Crea secuencias de etapas según tipo de upload
   - Define qué stages son AUTO vs MANUAL
   - Asigna recursos de processing (CPU/GPU)

2. **Pipeline Orchestrator** (`src/services/pipeline-orchestrator.ts`)
   - Maneja el flujo de etapas
   - Triggerea stages automáticos
   - Pausa en stages manuales

3. **Workers** (Docker + Modal)
   - CPU Workers: Frame extraction, image validation, SOG conversion
   - GPU Workers: COLMAP, Brush training

4. **Admin UI** (`apps/admin`)
   - Visualización de pipeline stages
   - Acciones: Retry, Skip, Cancel, Change Mode
   - Upload/Download de archivos para stages manuales

## 📦 Pipelines por Tipo de Archivo

### VIDEO (.mp4, .mov, .avi)
```
1. EXTRACT_FRAMES     (auto, CPU)  → Extrae frames del video
2. VALIDATE_OVERLAP   (auto, CPU)  → Valida solapamiento
3. COLMAP             (auto, GPU)  → Reconstrucción 3D
4. BRUSH_TRAINING     (auto, GPU)  → Entrenamiento Gaussian Splatting
5. OPTIMIZE_PLY       (manual)     → Optimización por admin
6. CONVERT_SOG        (auto, GPU)  → Conversión a formato SOG
7. ADMIN_APPROVAL     (manual)     → Aprobación final
```

### ZIP IMÁGENES (.zip)
```
1. VALIDATE_OVERLAP   (auto, CPU)
2. COLMAP             (auto, GPU)
3. BRUSH_TRAINING     (auto, GPU)
4. OPTIMIZE_PLY       (manual)
5. CONVERT_SOG        (auto, GPU)
6. ADMIN_APPROVAL     (manual)
```

### PLY/SPLAT (.ply, .splat)
```
1. OPTIMIZE_PLY       (manual)
2. CONVERT_SOG        (auto, GPU)
3. ADMIN_APPROVAL     (manual)
```

## 🚀 Deployment

Esta guía cubre el deployment completo del sistema de procesamiento con Redis/BullMQ + Modal.

### Arquitectura de Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                         Main App                             │
│                   (Next.js on Vercel)                        │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Upload     │───▶│   Pipeline   │───▶│  BullMQ      │  │
│  │   Service    │    │   Creator    │    │  Queues      │  │
│  └──────────────┘    └──────────────┘    └──────┬───────┘  │
└───────────────────────────────────────────────────┼──────────┘
                                                    │
                           ┌────────────────────────┼────────────────────────┐
                           │          Redis/BullMQ (Upstash)                 │
                           └────────────────────────┬────────────────────────┘
                                                    │
                           ┌────────────────────────┴────────────────────────┐
                           │                                                 │
                  ┌────────▼────────┐                           ┌────────▼────────┐
                  │  CPU Workers    │                           │  GPU Workers    │
                  │  (Railway/      │                           │  (Modal)        │
                  │   Render)       │                           │                 │
                  │                 │                           │                 │
                  │ • frame-        │                           │ • COLMAP        │
                  │   extractor     │                           │ • Brush         │
                  │ • image-        │                           │   Training      │
                  │   validator     │                           │                 │
                  │ • sog-          │                           │                 │
                  │   converter     │                           │                 │
                  └─────────────────┘                           └─────────────────┘
                           │                                            │
                           └────────────────┬───────────────────────────┘
                                            │
                                   ┌────────▼─────────┐
                                   │   S3/R2 Storage  │
                                   │  (Cloudflare R2) │
                                   └──────────────────┘
```

### Paso 1: Setup Base de Datos

```bash
# Aplicar schema con processing_stage table
pnpm db:push

# Verificar que la tabla se creó correctamente
# Conectarte a Supabase y revisar la tabla processing_stage
```

### Paso 2: Setup Redis (Upstash - Tier Gratuito)

1. Crear cuenta en [Upstash](https://upstash.com/)
2. Crear nueva base de datos Redis:
   - Region: Elegir la más cercana a tus workers
   - Type: Redis
   - Plan: Free (10,000 commands/day)

3. Copiar la URL de conexión:
   ```
   Redis URL: redis://default:xxx@xxx.upstash.io:6379
   ```

4. Agregar a tus variables de entorno:
   ```bash
   # .env
   REDIS_URL="redis://default:xxx@xxx.upstash.io:6379"
   ```

### Paso 3: Setup S3/R2 Storage

Si aún no tienes configurado Cloudflare R2:

1. Crear bucket en Cloudflare R2
2. Crear API token con permisos de lectura/escritura
3. Agregar a variables de entorno:

```bash
# .env
STORAGE_BUCKET_NAME="your-bucket-name"
STORAGE_ACCESS_KEY_ID="your-r2-access-key"
STORAGE_SECRET_ACCESS_KEY="your-r2-secret-key"
STORAGE_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"
```

### Paso 4: Deploy Modal Functions (GPU Workers)

```bash
# 1. Instalar Modal CLI
pip install modal

# 2. Setup Modal (crear cuenta y autenticar)
modal setup

# 3. Crear secret en Modal con credenciales de storage
modal secret create storage-credentials \
  STORAGE_BUCKET_NAME=your-bucket \
  STORAGE_ACCESS_KEY_ID=your-r2-access-key \
  STORAGE_SECRET_ACCESS_KEY=your-r2-secret-key \
  STORAGE_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com

# 4. Deploy funciones Modal
cd packages/processing/modal

# Deploy COLMAP processor
modal deploy colmap_processor.py

# Deploy Brush processor
modal deploy brush_processor.py

# 5. Obtener URLs de las funciones
# Modal te dará URLs como:
# https://your-workspace--colmap-processor-run-colmap.modal.run
# https://your-workspace--brush-processor-train-gaussian-splatting.modal.run
```

6. Agregar URLs de Modal a variables de entorno:

```bash
# .env
MODAL_COLMAP_URL="https://your-workspace--colmap-processor-run-colmap.modal.run"
MODAL_BRUSH_URL="https://your-workspace--brush-processor-train-gaussian-splatting.modal.run"
MODAL_TOKEN="your-modal-token" # Obtener de Modal dashboard
```

### Paso 5: Deploy CPU Workers (Railway o Render)

Los CPU workers se deployean como servicios separados que corren 24/7.

#### Opción A: Railway (Recomendado)

1. Instalar Railway CLI:
   ```bash
   npm i -g @railway/cli
   railway login
   ```

2. Crear proyecto Railway:
   ```bash
   railway init
   ```

3. Agregar variables de entorno en Railway:
   - `REDIS_URL`
   - `STORAGE_BUCKET_NAME`
   - `STORAGE_ACCESS_KEY_ID`
   - `STORAGE_SECRET_ACCESS_KEY`
   - `STORAGE_ENDPOINT`
   - `POSTGRES_URL` (tu Supabase URL)

4. Crear `Dockerfile` para workers (Railway lo detectará automáticamente):

```dockerfile
# packages/processing/Dockerfile
FROM node:20-slim

WORKDIR /app

# Instalar Python y dependencias para CPU workers
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    libvips-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias Python
RUN pip3 install --no-cache-dir \
    boto3==1.34.* \
    opencv-python-headless==4.9.* \
    pillow==10.2.* \
    numpy==1.26.*

# Copy workspace files
COPY package.json pnpm-lock.yaml ./
COPY packages/processing ./packages/processing
COPY packages/db ./packages/db

# Install Node dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Build
RUN pnpm --filter @acme/processing build

# Start CPU workers
WORKDIR /app/packages/processing
CMD ["pnpm", "start:cpu"]
```

5. Deploy:
   ```bash
   railway up
   ```

#### Opción B: Render

1. Crear cuenta en [Render](https://render.com/)
2. Conectar tu repositorio GitHub
3. Crear nuevo "Background Worker"
4. Configurar:
   - **Build Command**: `pnpm install && pnpm --filter @acme/processing build`
   - **Start Command**: `pnpm --filter @acme/processing start:cpu`
   - **Environment**: Node 20
5. Agregar variables de entorno (mismo que Railway)
6. Deploy

### Paso 6: Configurar Workers en Main App

Actualizar variables de entorno en tu app principal (Vercel):

```bash
# Vercel Environment Variables
REDIS_URL="redis://default:xxx@xxx.upstash.io:6379"
MODAL_COLMAP_URL="https://..."
MODAL_BRUSH_URL="https://..."
MODAL_TOKEN="..."
STORAGE_BUCKET_NAME="..."
STORAGE_ACCESS_KEY_ID="..."
STORAGE_SECRET_ACCESS_KEY="..."
STORAGE_ENDPOINT="..."
```

### Paso 7: Verificar Deployment

1. **Test upload flow**:
   ```bash
   # Subir un video de prueba
   # El sistema debería:
   # 1. Crear stages en la DB
   # 2. Agregar primer job a Redis
   # 3. CPU worker procesa frame extraction
   # 4. Siguiente stage se triggerea automáticamente
   ```

2. **Monitorear workers**:
   ```bash
   # Railway/Render logs
   railway logs

   # Modal logs
   modal app logs
   ```

3. **Verificar Redis**:
   - Ir al dashboard de Upstash
   - Ver métricas de commands/day
   - Verificar que los jobs se están procesando

### Paso 8: Scaling (Opcional)

**CPU Workers (Railway/Render)**:
- Horizontal scaling: Deployer múltiples instancias del mismo worker
- Cada instancia procesará jobs en paralelo
- Railway/Render cobra por instancia

**GPU Workers (Modal)**:
- Auto-scaling: Modal escala automáticamente según demanda
- Solo pagas por compute time (no por idle)
- Modal maneja todo el scaling por ti

**Redis/BullMQ**:
- Upstash Free: 10,000 commands/day
- Upstash Pro: 100,000+ commands/day ($10/mes)

### Costos Estimados (Producción Baja-Media)

| Servicio | Plan | Costo/mes |
|----------|------|-----------|
| Upstash Redis | Free | $0 |
| Railway CPU Workers | Hobby | $5 |
| Modal GPU (10 jobs/día) | Pay-as-you-go | ~$5-10 |
| Cloudflare R2 | Free tier | $0 |
| **Total** | | **~$10-15/mes** |

## 🔧 Usage

### Automatic Pipeline Creation

El pipeline se crea automáticamente cuando un usuario sube un archivo:

```typescript
// En confirmUpload (packages/api/src/router/presentation.ts)
await createPipelineStages(db, presentationId, uploadType);
await triggerNextStage(db, presentationId);
```

### Manual Stage Actions (Admin)

Los admins pueden controlar stages desde la UI:

```typescript
// Completar stage manual
await trpc.pipeline.completeStage.mutate({
  stageId: "stage-123",
  outputFileKey: "processed/file.ply" // opcional
});

// Reintentar stage fallido
await trpc.pipeline.retryStage.mutate({ stageId: "stage-123" });

// Omitir stage
await trpc.pipeline.skipStage.mutate({ stageId: "stage-123" });

// Cancelar stage en progreso
await trpc.pipeline.cancelStage.mutate({ stageId: "stage-123" });

// Cambiar modo AUTO ↔ MANUAL
await trpc.pipeline.changeStageMode.mutate({
  stageId: "stage-123",
  mode: "MANUAL"
});
```

## 📊 Monitoring

### Stage Status

- **PENDING**: Stage esperando ejecución
- **IN_PROGRESS**: Stage ejecutándose
- **COMPLETED**: Stage completado exitosamente
- **FAILED**: Stage falló (puede reintentarse)
- **SKIPPED**: Stage omitido por admin
- **CANCELLED**: Stage cancelado por admin

### Costos Estimados

| Pipeline | Stages Auto | Tiempo Estimado | Costo Estimado |
|----------|-------------|-----------------|----------------|
| Video completo | 5 | ~15 min | $0.15 |
| ZIP imágenes | 4 | ~12 min | $0.12 |
| PLY upload | 1 | ~30 seg | $0.01 |

## 🐛 Troubleshooting

### Stage Stuck en IN_PROGRESS

```bash
# Verificar logs del worker
docker logs <container-id>

# O cancelar manualmente desde Admin UI
```

### Worker Fails

```bash
# Verificar variables de entorno
echo $STORAGE_BUCKET_NAME
echo $REDIS_URL

# Verificar conectividad a S3
aws s3 ls s3://$STORAGE_BUCKET_NAME

# Verificar conectividad a Redis
redis-cli -u $REDIS_URL PING
```

### Modal Function Fails

```bash
# Ver logs de Modal
modal logs colmap-processor

# Verificar secrets
modal secret list
```

## 📚 Development

### Adding a New Stage

1. Agregar enum en `packages/db/src/presentation-schema.ts`:
```typescript
export const stageTypeEnum = pgEnum("stage_type", [
  // ... existing stages
  "MY_NEW_STAGE",
]);
```

2. Agregar al pipeline en `pipeline-creator.ts`:
```typescript
VIDEO: [
  // ... existing stages
  { stage: "MY_NEW_STAGE", mode: "AUTO", processingType: "CPU", order: 8 },
]
```

3. Crear worker/función correspondiente

4. Agregar case en `pipeline-orchestrator.ts`:
```typescript
case "MY_NEW_STAGE":
  await queues.myNewStage.add("process", jobData);
  break;
```

## 🔐 Security

- Todos los workers verifican permisos antes de procesar
- S3 keys son temporales y con permisos mínimos
- Modal secrets encriptados
- No se exponen URLs de S3 directamente al frontend

## 📝 License

MIT
