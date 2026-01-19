# 🛠️ Setup Local - Development Guide

Guía completa para correr todo el sistema de procesamiento en tu máquina local.

## 📋 Prerequisites

- Docker Desktop instalado
- Node.js 20+
- Python 3.11+
- pnpm

## 🚀 Setup Rápido (15 minutos)

### 1. Start Redis Local (2 min)

```bash
# Con Docker
docker run -d -p 6379:6379 --name redis-local redis:7-alpine

# Verificar que está corriendo
docker ps | grep redis
```

### 2. Setup Base de Datos (3 min)

**Opción A: Usar Supabase existente** (recomendado)
```bash
# Ya tienes POSTGRES_URL en .env
# Solo aplicar el schema
pnpm db:push
```

**Opción B: PostgreSQL Local**
```bash
# Con Docker
docker run -d \
  -p 5432:5432 \
  --name postgres-local \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=gsp \
  postgres:15

# Agregar a .env.local
POSTGRES_URL="postgresql://postgres:postgres@localhost:5432/gsp"

# Aplicar schema
pnpm db:push
```

### 3. Install Python Dependencies (3 min)

```bash
# Para CPU workers
pip install \
  boto3==1.34.* \
  opencv-python-headless==4.9.* \
  pillow==10.2.* \
  numpy==1.26.*

# Verificar FFmpeg (necesario para frame extraction)
ffmpeg -version
# Si no está instalado:
# macOS: brew install ffmpeg
# Ubuntu: sudo apt install ffmpeg
# Windows: choco install ffmpeg
```

### 4. Configure Environment (2 min)

Crear `.env.local` en la raíz del proyecto:

```bash
# Redis (local)
REDIS_URL="redis://localhost:6379"

# Database (usar tu Supabase o local)
POSTGRES_URL="tu-supabase-url"

# S3/R2 (puedes usar el real para testing)
S3_BUCKET="your-bucket"
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"
S3_ENDPOINT_URL="https://your-r2-endpoint"

# Modal (para testing, podemos mockear)
MODAL_COLMAP_URL="http://localhost:8001/colmap"
MODAL_BRUSH_URL="http://localhost:8002/brush"
MODAL_TOKEN="local-dev-token"

# Auth (tu config existente)
AUTH_SECRET="your-secret"
AUTH_DISCORD_ID="your-discord-id"
AUTH_DISCORD_SECRET="your-discord-secret"
```

### 5. Start Workers (5 min)

**Terminal 1 - CPU Workers:**
```bash
cd packages/processing
pnpm start:cpu
```

Deberías ver:
```
Starting processing workers...
Redis URL: redis://localhost:6379
Starting workers: frame-extractor, image-validator, sog-converter
✓ Frame Extractor worker started
✓ Image Validator worker started
✓ SOG Converter worker started

✓ All workers started successfully
Waiting for jobs...
```

**Terminal 2 - GPU Workers (Mock):**
```bash
cd packages/processing
pnpm start:gpu
```

**Terminal 3 - Next.js App:**
```bash
# En la raíz del proyecto
pnpm dev:next
```

## 🧪 Testing Local

### Test 1: Upload Flow Completo

1. Ir a `http://localhost:3000`
2. Login con Discord
3. Crear organización
4. Subir un video pequeño (< 10MB)
5. Confirmar upload
6. Ver en Admin Panel que se crean los stages

### Test 2: Monitorear Jobs

**Ver jobs en Redis:**
```bash
# Conectar a Redis
docker exec -it redis-local redis-cli

# Ver todas las colas
KEYS bull:*

# Ver jobs pendientes en una cola
LRANGE bull:extract-frames:waiting 0 -1

# Ver job details
HGETALL bull:extract-frames:1
```

**Ver logs de workers:**
Los workers logean en la terminal donde los corriste:
```
[FrameExtractor] Processing job 1
[FrameExtractor] Downloading video from S3...
[FrameExtractor] Extracting frames...
[FrameExtractor] Uploading ZIP to S3...
[FrameExtractor] Job 1 completed
```

### Test 3: Database Stages

```sql
-- Conectar a tu DB (Supabase SQL Editor o psql)

-- Ver todos los stages de una presentation
SELECT * FROM processing_stage
WHERE presentation_id = 'your-presentation-id'
ORDER BY "order";

-- Ver stages por status
SELECT status, stage, COUNT(*)
FROM processing_stage
GROUP BY status, stage;
```

## 🔧 Mock GPU Workers (Opcional)

Si quieres testear sin deployar Modal, puedes crear mocks locales:

**packages/processing/src/mocks/modal-server.ts:**

```typescript
import express from 'express';
import { db } from '@acme/db/client';
import { processingStage } from '@acme/db/schema';
import { eq } from 'drizzle-orm';

const app = express();
app.use(express.json());

// Mock COLMAP
app.post('/colmap', async (req, res) => {
  const { presentationId, stageId, inputFileKey } = req.body;

  console.log(`[Mock COLMAP] Processing ${stageId}`);

  // Simular procesamiento (5 segundos)
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Mock result
  const result = {
    outputKey: `colmap-output-${Date.now()}.zip`,
    outputSize: 1024 * 1024 * 50, // 50MB
    metadata: {
      imageCount: 100,
      cameraCount: 1,
      pointCount: 50000,
    },
  };

  res.json(result);
});

// Mock Brush
app.post('/brush', async (req, res) => {
  const { presentationId, stageId, inputFileKey } = req.body;

  console.log(`[Mock Brush] Processing ${stageId}`);

  // Simular procesamiento (10 segundos)
  await new Promise(resolve => setTimeout(resolve, 10000));

  const result = {
    outputKey: `brush-output-${Date.now()}.ply`,
    outputSize: 1024 * 1024 * 100, // 100MB
    metadata: {
      plyVertices: 500000,
      iterations: 30000,
      trainingCompleted: true,
    },
  };

  res.json(result);
});

app.listen(8001, () => console.log('🎭 Mock COLMAP running on :8001'));
app.listen(8002, () => console.log('🎭 Mock Brush running on :8002'));
```

**Correr el mock:**
```bash
# Terminal 4
cd packages/processing
tsx src/mocks/modal-server.ts
```

## 🐛 Troubleshooting Local

### Error: Cannot connect to Redis

```bash
# Verificar que Redis está corriendo
docker ps | grep redis

# Si no está corriendo, iniciarlo
docker start redis-local

# Ver logs
docker logs redis-local
```

### Error: Worker crashes on job processing

```bash
# Verificar que Python dependencies están instaladas
pip list | grep boto3
pip list | grep opencv

# Verificar que FFmpeg está instalado
ffmpeg -version

# Verificar que tienes acceso a S3
# Probar con AWS CLI o directamente con boto3
python3 -c "import boto3; print('boto3 OK')"
```

### Error: Stage stuck en PENDING

```bash
# Ver si el worker está corriendo
# Ver logs del worker
# Ver si hay jobs en Redis

docker exec -it redis-local redis-cli
KEYS bull:*
```

### Error: Database connection fails

```bash
# Verificar POSTGRES_URL
echo $POSTGRES_URL

# Verificar que puedes conectar
psql $POSTGRES_URL -c "SELECT 1"
```

## 📊 Monitoring Dashboard (Opcional)

Puedes instalar Bull Board para ver los jobs en UI:

```bash
pnpm add @bull-board/api @bull-board/express
```

**packages/processing/src/dashboard.ts:**
```typescript
import express from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { queues } from './config/queues';

const app = express();

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(queues.extractFrames),
    new BullMQAdapter(queues.validateOverlap),
    new BullMQAdapter(queues.colmap),
    new BullMQAdapter(queues.brushTraining),
    new BullMQAdapter(queues.convertSog),
  ],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

app.listen(3001, () => {
  console.log('📊 Bull Board running on http://localhost:3001/admin/queues');
});
```

**Correr dashboard:**
```bash
tsx src/dashboard.ts
```

Abrir `http://localhost:3001/admin/queues` para ver UI de jobs.

## 🧹 Cleanup

```bash
# Parar todos los workers (Ctrl+C en cada terminal)

# Limpiar Redis
docker exec -it redis-local redis-cli FLUSHALL

# Parar contenedores
docker stop redis-local postgres-local

# Remover contenedores (opcional)
docker rm redis-local postgres-local

# Limpiar database
# En Supabase SQL Editor:
DELETE FROM processing_stage;
```

## 🎯 Tips de Desarrollo

1. **Hot reload workers**: Usa `tsx --watch src/workers.ts` para auto-restart
2. **Debug jobs**: Agrega breakpoints en los workers con Chrome DevTools
3. **Skip stages**: En Admin UI puedes skip stages para testing
4. **Mock Modal**: Usa los mocks locales para evitar costos de GPU
5. **Small files**: Usa videos/imágenes pequeñas para testing rápido

## ✅ Checklist de Setup Completo

- [ ] Redis corriendo en :6379
- [ ] Database migrada (pnpm db:push)
- [ ] Python dependencies instaladas
- [ ] FFmpeg instalado
- [ ] `.env.local` configurado
- [ ] CPU workers corriendo
- [ ] GPU workers corriendo (real o mock)
- [ ] Next.js app corriendo en :3000
- [ ] Upload test exitoso
- [ ] Stages se crean en DB
- [ ] Worker procesa primer job

¡Todo listo para desarrollar! 🚀
