# ⚡ Quick Start - Local Development (5 minutos)

La forma más rápida de empezar a desarrollar localmente.

## 🚀 Setup Automatizado

```bash
# 1. Clonar .env para local
cp .env.local.example .env.local
# Editar .env.local con tus credenciales

# 2. Run automated setup
cd packages/processing
pnpm dev:setup

# 3. Apply database schema
pnpm db:push
```

## 🎮 Start Everything

Abre **4 terminales**:

### Terminal 1: CPU Workers
```bash
pnpm --filter @acme/processing start:cpu
```

### Terminal 2: Mock GPU Workers
```bash
pnpm --filter @acme/processing dev:mock
```

### Terminal 3: Next.js App
```bash
pnpm dev:next
```

### Terminal 4 (Opcional): Monitoring Dashboard
```bash
# Instalar dependencias (solo primera vez)
pnpm --filter @acme/processing add -D @bull-board/api @bull-board/express

# Start dashboard
pnpm --filter @acme/processing dev:dashboard
```

## ✅ Verify Setup

1. **Redis**: `docker ps | grep redis` (debe estar corriendo)
2. **Workers**: Ver logs en Terminal 1 y 2
3. **App**: Abrir http://localhost:3000
4. **Dashboard**: Abrir http://localhost:3001/admin/queues

## 🧪 Test Pipeline

1. Login en http://localhost:3000
2. Crear organización
3. Subir video pequeño (<10MB)
4. Confirmar upload
5. Ver stages en Admin Panel
6. Ver jobs procesándose en Terminal 1

## 📊 Monitoring

**Ver jobs en Redis:**
```bash
docker exec -it redis-local redis-cli
KEYS bull:*
```

**Ver stages en DB:**
```sql
-- En Supabase SQL Editor
SELECT * FROM processing_stage
WHERE presentation_id = 'your-id'
ORDER BY "order";
```

**Ver jobs en UI:**
http://localhost:3001/admin/queues

## 🐛 Problemas Comunes

### Redis no conecta
```bash
docker start redis-local
```

### Worker crashea
```bash
# Verificar Python dependencies
pip list | grep boto3

# Verificar FFmpeg
ffmpeg -version
```

### Stage stuck
En Admin UI: Acciones → Retry o Skip

## 🧹 Cleanup

```bash
# Parar workers (Ctrl+C en cada terminal)

# Limpiar Redis
docker exec -it redis-local redis-cli FLUSHALL

# Parar Redis
docker stop redis-local
```

## 💡 Tips

- **Hot reload**: Usa `tsx --watch` para auto-restart
- **Skip GPU**: Usa mocks locales (dev:mock) para no gastar en Modal
- **Small files**: Videos <10MB para testing rápido
- **Dashboard**: Bull Board muestra todo en UI visual

---

**¿Necesitas más detalles?** Ver [LOCAL_DEV.md](./LOCAL_DEV.md) para guía completa
