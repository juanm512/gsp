<div align="center">

# GSP · Gaussian Splatting Platform

**Plataforma web para crear, procesar, hospedar y visualizar escenas 3D con Gaussian Splatting.**

Subís un video o un set de fotos, el equipo lo procesa y obtenés una presentación 3D interactiva que podés compartir desde el navegador.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![tRPC](https://img.shields.io/badge/tRPC-11-2596BE?logo=trpc&logoColor=white)](https://trpc.io)
[![Drizzle](https://img.shields.io/badge/Drizzle_ORM-PostgreSQL-C5F74F?logo=drizzle&logoColor=black)](https://orm.drizzle.team)
[![Better Auth](https://img.shields.io/badge/Better_Auth-1.4-111827)](https://www.better-auth.com)
[![Turborepo](https://img.shields.io/badge/Turborepo-pnpm-EF4444?logo=turborepo&logoColor=white)](https://turborepo.com)
[![License: MIT](https://img.shields.io/badge/Licencia-MIT-green.svg)](./LICENSE)

</div>

---

<!-- TODO: reemplazar por una captura o GIF real del visor 3D -->
<!-- ![Demo del visor de Gaussian Splats](./docs/demo.gif) -->

## ¿Qué es esto?

**Gaussian Splatting** es una técnica de reconstrucción 3D que, a partir de un video o un conjunto de fotos, genera una escena volumétrica que se puede recorrer en tiempo real en el navegador. GSP es un SaaS que envuelve ese flujo de punta a punta:

- **Para el usuario:** crea una organización, sube su material (video, ZIP de imágenes o un archivo `.ply` / `.splat` / `.sog` ya generado), sigue el estado del procesamiento y visualiza el resultado.
- **Para el equipo de operaciones:** un panel de administración separado permite revisar el material, reclamar trabajos, subir los archivos procesados y publicar la presentación final.

## Funcionalidades

| Área               | Detalle                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Autenticación**  | Better Auth con email + contraseña, verificación de email y recuperación de contraseña vía Resend.                                                     |
| **Organizaciones** | Multi-tenant: cada usuario puede crear organizaciones, invitar miembros y gestionar roles. Notificaciones de invitaciones en el header.                |
| **Presentaciones** | Ciclo de vida completo: `draft → pending_review → approved → processing → completed`. Subida directa a almacenamiento S3/R2 mediante URLs prefirmadas. |
| **Visualizadores** | Visor de Gaussian Splats con dos motores intercambiables (**Spark** sobre Three.js y **PlayCanvas**), reproductor de video y explorador de ZIP.        |
| **Panel admin**    | App independiente con roles `admin` / `superadmin`: gestión de usuarios (ban, cambio de rol), organizaciones y cola de presentaciones.                 |
| **Facturación**    | Integración con Polar: checkout, portal del cliente, webhooks de suscripción y límites por plan (presentaciones, almacenamiento, miembros).            |
| **API tipada**     | tRPC v11 de punta a punta con procedures `public`, `protected`, `admin` y `superAdmin`.                                                                |

## Arquitectura

Monorepo con **pnpm workspaces + Turborepo**. Todo el código es TypeScript.

```text
apps/
├─ web/        Next.js 16 · App Router · aplicación principal (puerto 3000)
└─ admin/      Next.js 16 · panel de administración (puerto 3001)

packages/
├─ api/        Routers tRPC: auth, organization, presentation, billing, admin
├─ auth/       Configuración de Better Auth (organizaciones, admin, emails)
├─ db/         Drizzle ORM + esquema PostgreSQL (auth, presentaciones, uploads)
├─ billing/    Cliente de Polar, planes, límites y manejo de webhooks
├─ storage/    Cliente S3 compatible (Cloudflare R2) con URLs prefirmadas
├─ processing/ Colas BullMQ + Redis para el pipeline de procesamiento (WIP)
├─ ui/         Componentes shadcn/ui + visualizadores 3D, video y ZIP
└─ validators/ Esquemas Zod compartidos

tooling/
└─ eslint · prettier · tailwind · typescript   Configuración compartida
```

```mermaid
flowchart LR
  subgraph Apps
    W[apps/web]
    A[apps/admin]
  end
  subgraph Paquetes
    API[api · tRPC]
    AUTH[auth]
    DB[db · Drizzle]
    BILL[billing · Polar]
    STO[storage · R2]
    PROC[processing · BullMQ]
    UI[ui]
  end
  W --> API
  A --> API
  W --> UI
  A --> UI
  API --> AUTH
  API --> DB
  API --> BILL
  API --> STO
  AUTH --> DB
  PROC -.-> STO
  STO --> R2[(Cloudflare R2)]
  DB --> PG[(PostgreSQL)]
  PROC --> REDIS[(Redis)]
```

### Flujo de una presentación

```mermaid
sequenceDiagram
  actor U as Usuario
  participant W as web
  participant API as tRPC
  participant R2 as R2 Storage
  actor Op as Admin
  U->>W: Crea presentación
  W->>API: presentation.create
  U->>W: Selecciona video / ZIP / .ply
  W->>API: presentation.initiateUpload
  API-->>W: URL prefirmada
  W->>R2: PUT archivo (directo desde el navegador)
  W->>API: presentation.confirmUpload → pending_review
  Op->>API: adminClaim / adminUpdateStatus → processing
  Op->>R2: Sube .sog / .splat procesado
  Op->>API: adminSetActiveFile → completed
  U->>W: Visualiza en el visor 3D
```

## Puesta en marcha

### Requisitos

- Node.js 22 (ver `.nvmrc`)
- pnpm 10
- Docker (opcional, para PostgreSQL y Redis locales)

### Pasos

```bash
# 1. Instalar dependencias
pnpm i

# 2. Variables de entorno
cp .env.example .env
# Completar al menos POSTGRES_URL, AUTH_SECRET y RESEND_API_KEY

# 3. Levantar PostgreSQL y Redis en local
docker compose up -d

# 4. Aplicar el esquema a la base de datos
pnpm db:push

# 5. Correr las apps
pnpm dev:apps        # web en :3000 y admin en :3001
```

Otros comandos útiles:

```bash
pnpm dev:web         # solo la app principal
pnpm dev:admin       # solo el panel admin
pnpm db:studio       # Drizzle Studio
pnpm auth:generate   # regenerar el esquema de auth tras cambiar la config
pnpm typecheck       # chequeo de tipos en todo el monorepo
pnpm lint            # ESLint
pnpm format          # Prettier
pnpm ui-add          # agregar componentes de shadcn/ui
```

### Variables de entorno

| Variable                                        | Descripción                                         |
| ----------------------------------------------- | --------------------------------------------------- |
| `POSTGRES_URL`                                  | Cadena de conexión a PostgreSQL.                    |
| `REDIS_URL`                                     | Conexión a Redis para BullMQ.                       |
| `AUTH_SECRET`                                   | Secreto de Better Auth (`openssl rand -base64 32`). |
| `AUTH_URL`                                      | URL base de la app para callbacks de auth.          |
| `RESEND_API_KEY`                                | API key de Resend para emails transaccionales.      |
| `POLAR_ACCESS_TOKEN` / `POLAR_WEBHOOK_SECRET`   | Credenciales de Polar para facturación.             |
| `STORAGE_*`                                     | Credenciales y bucket S3/R2 para los uploads.       |
| `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_ADMIN_URL` | URLs públicas de cada app.                          |

## Roadmap

- [x] Auth, organizaciones e invitaciones
- [x] Panel de administración con roles
- [x] Facturación con Polar y límites por plan
- [x] Ciclo de vida de presentaciones y uploads a R2
- [x] Visor de Gaussian Splats con Spark y PlayCanvas
- [ ] Pipeline automático de procesamiento (extracción de frames, COLMAP, entrenamiento) sobre BullMQ
- [ ] OAuth con Google
- [ ] Páginas públicas de presentaciones compartibles
- [ ] Tests end-to-end

## Decisiones técnicas

- **Uploads directos al bucket** con URLs prefirmadas: el servidor nunca recibe el archivo, lo que mantiene la API liviana ante videos de varios GB.
- **Dos motores de render** detrás de una misma interfaz `GSViewer`: permite comparar rendimiento y compatibilidad de formatos (`.ply`, `.splat`, `.sog`) sin tocar la app.
- **Procesamiento asistido por un operador** como primera etapa: el flujo de estados ya contempla la automatización, pero la revisión manual permite validar el material antes de invertir cómputo.
- **Monorepo con paquetes chicos y explícitos** para que auth, storage y billing sean reemplazables sin arrastrar el resto.

## Licencia

[MIT](./LICENSE) © Juan Manuel Vila

> Basado inicialmente en [create-t3-turbo](https://github.com/t3-oss/create-t3-turbo).
