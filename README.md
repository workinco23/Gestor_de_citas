# Aurora Beauty Lounge — Monorepo

Sistema de gestión de citas para el centro estético Aurora Beauty Lounge. Ver [`../PRD_AuroraBeautyLounge.md`](../PRD_AuroraBeautyLounge.md) para la arquitectura y el PRD completos.

Repositorio: https://github.com/workinco23/Gestor_de_citas
Base de datos: proyecto Supabase "Gestor_de_citas"

## Estructura

```
apps/
  web-cliente/       Next.js — PWA de reservas para clientes (puerto 3101)
  dashboard-admin/    Next.js — panel de administración/recepción (puerto 3102)
  api/                NestJS — API + WebSocket de disponibilidad en tiempo real (puerto 3103)
packages/
  database/           Prisma schema + client compartido (@aurora/database)
  shared-types/        Tipos TS compartidos entre frontend y backend (@aurora/shared-types)
```

## Setup inicial

### 1. Base de datos (Supabase, plan gratuito)

1. Crear un proyecto en [supabase.com](https://supabase.com) (gratis).
2. En **Project Settings → Database → Connection string**, copiar:
   - La cadena con **pooling** (puerto 6543) → `DATABASE_URL`
   - La cadena **directa** (puerto 5432) → `DIRECT_URL` (Prisma la necesita para migraciones)
3. Copiar `.env.example` a `.env` en la raíz y completar ambas URLs (con la contraseña real del proyecto).

### 2. Redis (no hace falta todavía)

El lock temporal de slots durante checkout (`POST/DELETE /api/availability/hold`) está implementado en memoria dentro de `SlotHoldsService` — funciona bien con una sola instancia de la API. No requiere Redis hoy. Si el sistema escala a múltiples instancias del API, reemplazar ese Map por Redis (`SET key EX 300 NX`), por ejemplo con [Upstash](https://upstash.com) (plan gratuito) — la interfaz del servicio no debería cambiar.

### 3. Instalar dependencias

```bash
npm install
```

### 4. Generar el cliente de Prisma y correr la migración inicial

```bash
# Copiar el .env de la raíz al paquete de base de datos (Prisma lee el .env local al paquete)
cp .env packages/database/.env

npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
```

**Importante:** las columnas de fecha (`starts_at`, `ends_at`, `created_at`, `paid_at`) deben quedar como `TIMESTAMPTZ`, no `TIMESTAMP` — por eso el schema usa `@db.Timestamptz(3)` en esos campos. Si se agrega un nuevo campo `DateTime` que represente un instante (no una fecha de calendario), agregar el mismo atributo.

El `EXCLUDE` constraint de Postgres que impide citas solapadas a nivel de base de datos no lo soporta Prisma de forma nativa, así que se aplica a mano una sola vez después de la migración inicial:

```bash
npx prisma db execute --file prisma/manual/001_exclude_overlapping_appointments.sql --schema prisma/schema.prisma
```

(ejecutar desde `packages/database/`; ya está aplicado en la base de Supabase del proyecto — este paso solo hace falta al levantar una base nueva, ej. para otro entorno)

### 5. Levantar todo en desarrollo

```bash
# Copiar .env también a apps/api (o exportar las variables antes de correr)
cp .env apps/api/.env

npm run dev
```

Esto levanta con Turborepo:
- `web-cliente` → http://localhost:3101
- `dashboard-admin` → http://localhost:3102
- `api` → http://localhost:3103/api

**Nota Windows:** si arrancás los tres con `npm run dev` desde una sesión de Bash/Claude Code, el proceso muere apenas termina esa sesión (el `&`/`disown` de Bash no desengancha de verdad el proceso en Windows). Para dejarlo corriendo de forma independiente, lanzarlo con PowerShell `Start-Process` envolviendo `cmd.exe`, no con Bash en segundo plano.

### 6. Autenticación de clientes (OTP por WhatsApp)

La app cliente pide un código de 6 dígitos por WhatsApp (`POST /api/auth/otp/request`), lo verifica (`POST /api/auth/otp/verify`) y recibe un JWT de 30 días que se guarda en `localStorage`. Sin `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN` configurados, el código no se envía por WhatsApp real: se loguea en la consola del API y además se devuelve como `devCode` en la respuesta de `otp/request`, para poder probar el flujo completo en local sin cuenta de Twilio. La UI de `web-cliente` muestra ese `devCode` con una etiqueta "Modo desarrollo" cuando está presente — dejará de aparecer solo en cuanto se configuren las credenciales de Twilio en `.env`.

`POST /api/appointments` con `createdVia: "app_cliente"` ahora exige el header `Authorization: Bearer <token>` — el `customerId` se toma del JWT, nunca del body. El endpoint `POST /api/customers/upsert-by-phone` sigue existiendo pero solo lo usa el panel admin (reservas manuales de recepción), no la app del cliente.

### 7. Login del panel admin (recepción)

Un solo usuario compartido (`POST /api/auth/admin/login`, JWT de 12h). Credenciales creadas por seed — pedirle al dueño del repo el usuario/contraseña vigente (se rota manualmente en Supabase, no está en este archivo). `GET/PATCH /api/appointments` y `POST /api/customers/upsert-by-phone` exigen ese token; `AdminAuthGuard` verifica que el JWT tenga `role: admin | reception` — un token de cliente (OTP) no sirve acá aunque esté vigente.

## Pendientes conocidos (antes de producción)

- **Pagos (Culqi/Yape)**: solo existe el modelo `Payment` en el schema; falta la integración con la pasarela.
- **Notificaciones WhatsApp (Twilio)**: confirmaciones/recordatorios de cita, no implementado todavía (el envío de OTP sí usa Twilio/WhatsApp, ver sección 6).
- **Íconos PWA**: `web-cliente/public/manifest.json` referencia `icon-192.png` e `icon-512.png` que aún no existen — agregar el logo real de la marca.

## Puertos

Ver [`../PORTS.md`](../PORTS.md) — este proyecto usa 3101 (web-cliente), 3102 (dashboard-admin) y 3103 (api).
