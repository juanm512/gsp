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

### 1. Setup Redis (Required)

```bash
# Local development (Docker)
docker run -d -p 6379:6379 redis:7-alpine

# Production (Railway/Render)
# Add Redis addon to your app
```

### 2. Setup Environment Variables

```bash
# .env
REDIS_URL="redis://localhost:6379"
S3_BUCKET="your-bucket-name"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
S3_ENDPOINT_URL="https://your-r2-endpoint.com" # For Cloudflare R2
```

### 3. Deploy CPU Workers (Docker)

```bash
# Build Docker images
cd packages/processing/docker/frame-extractor
docker build -t frame-extractor:latest .

cd ../image-validator
docker build -t image-validator:latest .

cd ../sog-converter
docker build -t sog-converter:latest .

# Deploy to Railway/Render
# - Create new service
# - Connect to your Docker registry
# - Set environment variables
# - Deploy
```

### 4. Deploy GPU Workers (Modal)

```bash
# Install Modal CLI
pip install modal

# Setup Modal
modal setup

# Create Modal secret with S3 credentials
modal secret create aws-s3-credentials \
  S3_BUCKET=your-bucket \
  AWS_ACCESS_KEY_ID=your-key \
  AWS_SECRET_ACCESS_KEY=your-secret \
  S3_ENDPOINT_URL=your-endpoint

# Deploy Modal functions
cd packages/processing/modal
modal deploy colmap_processor.py
modal deploy brush_processor.py
```

### 5. Run Database Migration

```bash
# Apply new schema (processing_stage table)
pnpm db:push
```

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
echo $S3_BUCKET
echo $REDIS_URL

# Verificar conectividad a S3
aws s3 ls s3://$S3_BUCKET

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
