# 🚀 Deployment Guide - Pipeline Processing System

Guía rápida para deployar el sistema completo de procesamiento.

## ✅ Checklist Pre-Deployment

Antes de comenzar, asegúrate de tener:

- [x] Cuenta en Supabase (PostgreSQL)
- [x] Cuenta en Cloudflare R2 (S3-compatible storage)
- [x] Cuenta en Upstash (Redis gratis)
- [ ] Cuenta en Modal (GPU compute)
- [ ] Cuenta en Railway o Render (CPU workers)

## 📋 Deployment en 30 Minutos

### x 1. Base de Datos (5 min)

```bash
# En la raíz del proyecto
pnpm db:push
```

Verifica en Supabase que la tabla `processing_stage` se creó correctamente.

### x 2. Redis (5 min)

1. Ir a [upstash.com](https://upstash.com)
2. Create Database → Redis
3. Copiar `REDIS_URL`
4. Agregar a `.env`:
   ```
   REDIS_URL="redis://default:xxx@xxx.upstash.io:6379"
   ```

### 3. Modal GPU Workers (10 min)

```bash
# Instalar Modal
pip install modal

# Autenticar
modal setup

# Crear secret
modal secret create storage-credentials \
  STORAGE_BUCKET_NAME=your-bucket \
  STORAGE_ACCESS_KEY_ID=your-key \
  STORAGE_SECRET_ACCESS_KEY=your-secret \
  STORAGE_ENDPOINT=https://your-r2-url

# Deploy
cd packages/processing/modal
modal deploy colmap_processor.py
modal deploy brush_processor.py

# Copiar las URLs que te da Modal
```

Agregar a `.env`:
```
MODAL_COLMAP_URL="https://..."
MODAL_BRUSH_URL="https://..."
MODAL_TOKEN="..." # Desde Modal dashboard
```

### 4. Railway CPU Workers (10 min)

```bash
# Instalar Railway CLI
npm i -g @railway/cli
railway login

# Desde la raíz del proyecto
cd packages/processing
railway init

# Agregar variables de entorno en Railway dashboard:
# - REDIS_URL
# - STORAGE_BUCKET_NAME
# - STORAGE_ACCESS_KEY_ID
# - STORAGE_SECRET_ACCESS_KEY
# - STORAGE_ENDPOINT
# - POSTGRES_URL

# Deploy
railway up
```

Railway detectará el `Dockerfile` automáticamente.

### 5. Vercel Environment Variables (5 min)

Agregar en Vercel dashboard:

```
REDIS_URL=...
MODAL_COLMAP_URL=...
MODAL_BRUSH_URL=...
MODAL_TOKEN=...
STORAGE_BUCKET_NAME=...
STORAGE_ACCESS_KEY_ID=...
STORAGE_SECRET_ACCESS_KEY=...
STORAGE_ENDPOINT=...
POSTGRES_URL=... (ya existe)
```

Redeploy Vercel para aplicar cambios.

## 🧪 Testing

1. Subir un video en la UI
2. Verificar en admin panel que los stages se crean
3. Ver logs:
   ```bash
   # Railway
   railway logs

   # Modal
   modal app logs
   ```

## 🐛 Troubleshooting

### Worker no procesa jobs

**Verificar Redis**:
```bash
# Conectar a Upstash Redis
redis-cli -u $REDIS_URL
PING
# Debería responder PONG

# Ver jobs pendientes
KEYS bull:*
```

**Verificar logs del worker**:
```bash
railway logs --tail
```

### Modal function falla

**Ver logs detallados**:
```bash
modal app logs --follow
```

**Verificar secrets**:
```bash
modal secret list
```

### Stage stuck en IN_PROGRESS

1. Ir al admin panel
2. Cancelar el stage
3. Retry

O directamente en la DB:
```sql
UPDATE processing_stage
SET status = 'FAILED',
    error_message = 'Manual reset'
WHERE id = 'stage-id';
```

## 💰 Costos

Con usage bajo-medio (10-20 processos/día):

| Servicio | Costo/mes |
|----------|-----------|
| Upstash Redis (Free) | $0 |
| Railway (Hobby) | $5 |
| Modal (~10 jobs/día) | $5-10 |
| Cloudflare R2 (Free tier) | $0 |
| **Total** | **$10-15** |

## 📈 Scaling

### Más CPU capacity
```bash
# En Railway, agregar más replicas del worker service
railway scale --replicas 3
```

### Más GPU capacity
Modal escala automáticamente. Solo pagas por uso.

### Más Redis capacity
Upstash Free: 10k commands/day
Upstash Pro: 100k+ commands/day ($10/mes)

## 🔒 Security Checklist

- [ ] Redis URL no expuesto en frontend
- [ ] Modal token no expuesto en frontend
- [ ] S3 credentials solo en workers/backend
- [ ] POSTGRES_URL solo en backend
- [ ] Verificar que todos los secrets están en `.gitignore`

## 📚 Recursos

- [BullMQ Docs](https://docs.bullmq.io/)
- [Modal Docs](https://modal.com/docs)
- [Railway Docs](https://docs.railway.app/)
- [Upstash Redis Docs](https://docs.upstash.com/redis)

## 🆘 Soporte

Si algo falla:

1. Revisar logs de Railway/Modal
2. Verificar variables de entorno
3. Verificar conectividad a Redis (Upstash dashboard)
4. Verificar conectividad a S3 (Cloudflare R2 dashboard)
5. Verificar DB schema (Supabase dashboard)
