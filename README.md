# Aurora Beauty Lounge — Monorepo

Sistema de gestión de citas para el centro estético Aurora Beauty Lounge. Ver [`../PRD_AuroraBeautyLounge.md`](../PRD_AuroraBeautyLounge.md) para la arquitectura y el PRD completos.

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

### 2. Redis (opcional en esta etapa)

El lock temporal de slots durante checkout todavía no está implementado (ver sección "Pendientes" abajo); Redis no es necesario para levantar el sistema hoy. Cuando se implemente, usar [Upstash](https://upstash.com) (plan gratuito).

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

La migración inicial **no** incluye todavía el `EXCLUDE` constraint de Postgres que impide citas solapadas a nivel de base de datos (Prisma no lo soporta de forma nativa). Después de la primera migración, agregar manualmente:

```sql
ALTER TABLE appointments ADD CONSTRAINT no_overlapping_appointments
  EXCLUDE USING gist (staff_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
  WHERE (status != 'cancelled');
```

(requiere la extensión `btree_gist`: `CREATE EXTENSION IF NOT EXISTS btree_gist;`)

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

## Pendientes conocidos (antes de producción)

- **Autenticación real de clientes**: hoy el endpoint `POST /api/customers/upsert-by-phone` identifica/crea clientes por número de celular sin verificación (OTP). Reemplazar por autenticación real (OTP por SMS/WhatsApp) antes de ir a producción — ver PRD sección 2.1.
- **Constraint `EXCLUDE` de Postgres**: agregar manualmente tras la primera migración (ver arriba). Sin este constraint, la única defensa contra citas duplicadas es la revalidación dentro de la transacción de `AppointmentsService.create`.
- **Lock temporal de slots (Redis)**: el PRD prevé apartar un slot ~5 min mientras el cliente completa el pago; no implementado todavía.
- **Pagos (Culqi/Yape)**: solo existe el modelo `Payment` en el schema; falta la integración con la pasarela.
- **Notificaciones WhatsApp (Twilio)**: no implementado todavía.
- **Roles y permisos**: el dashboard no tiene login todavía; toda la agenda es de acceso libre en local.
- **Íconos PWA**: `web-cliente/public/manifest.json` referencia `icon-192.png` e `icon-512.png` que aún no existen — agregar el logo real de la marca.

## Puertos

Ver [`../PORTS.md`](../PORTS.md) — este proyecto usa 3101 (web-cliente), 3102 (dashboard-admin) y 3103 (api).
