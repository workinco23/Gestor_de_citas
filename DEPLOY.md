# Guía de despliegue — Aurora Beauty Lounge

Objetivo: que Leslye (y quien atienda recepción) puedan ver la agenda desde
cualquier navegador, y que los clientes reserven desde un link público — sin
depender de que la laptop de casa esté prendida y corriendo `npm run dev`.

Arquitectura de despliegue:

| Componente | Dónde | Por qué |
|---|---|---|
| `apps/web-cliente` | Netlify | Ya tenés cuenta, gratis, ideal para Next.js |
| `apps/dashboard-admin` | Netlify | Mismo motivo — un sitio de Netlify separado del anterior |
| `apps/api` | Render (free tier) | Necesita quedar corriendo todo el tiempo (WebSocket + el cron de recordatorios), no sirve un hosting "serverless" como Netlify Functions |
| Base de datos | Supabase (ya está) | Sin cambios |

El plan free de Render "duerme" el servidor a los 15 min sin tráfico y tarda
~1 min en despertar. Para que no afecte los recordatorios automáticos de
WhatsApp, al final se configura un ping gratuito externo (cron-job.org) que
lo mantiene despierto.

---

## 1. Desplegar la API en Render

1. Entrar a [render.com](https://render.com) y crear cuenta (con GitHub alcanza, es gratis, no pide tarjeta para el free tier).
2. **New +** → **Web Service** → conectar el repo `workinco23/Gestor_de_citas`.
3. Configuración del servicio:
   - **Name**: `aurora-beauty-api` (o el que prefieras — define la URL, ej. `aurora-beauty-api.onrender.com`)
   - **Region**: la más cercana a Perú disponible (Oregon suele ser la opción US más común)
   - **Branch**: `main`
   - **Root Directory**: dejar vacío (raíz del repo)
   - **Runtime**: Node
   - **Build Command**:
     ```
     npm install && npm run db:generate && npm run build --workspace=api
     ```
   - **Start Command**:
     ```
     npm run start:prod --workspace=api
     ```
   - **Instance Type**: Free
4. **Environment Variables** (Advanced → Add Environment Variable) — cargar estas, con los valores reales del `.env` local (pedime los valores si no los tenés a mano, o copialos de `apps/api/.env`):
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `JWT_SECRET`
   - `TWILIO_ACCOUNT_SID` (vacío está bien por ahora — sigue en modo desarrollo, loguea los OTP)
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_FROM`
   - `PAYMENT_YAPE_PLIN_PHONE` = `942774205`
   - `PAYMENT_YAPE_PLIN_HOLDER` = `Vincenzo Alessandro Cruces Ugarte`
   - `PAYMENT_DEPOSIT_CENTS` = `2000`
   - `ALLOWED_ORIGINS` = (completar en el paso 3, con las URLs de Netlify una vez creadas)
   - **NO hace falta** setear `PORT` — Render lo inyecta solo.
5. Deploy. Cuando termine, anotar la URL pública (algo como `https://aurora-beauty-api.onrender.com`) — se usa en el paso 2.
6. Probar que responde: abrir `https://aurora-beauty-api.onrender.com/api/services` en el navegador — debería devolver la lista de servicios en JSON.

## 2. Desplegar el frontend del cliente en Netlify

1. En Netlify: **Add new site** → **Import an existing project** → conectar el repo `workinco23/Gestor_de_citas`.
2. Configuración del sitio:
   - **Base directory**: `apps/web-cliente`
   - **Build command**: `npm run build` (ya viene definido en `apps/web-cliente/netlify.toml`, no hace falta tocarlo)
   - **Publish directory**: `.next` (también ya está en el `netlify.toml`)
3. **Site settings → Environment variables** → agregar:
   - `NEXT_PUBLIC_API_URL` = la URL de Render del paso 1 (ej. `https://aurora-beauty-api.onrender.com`)
4. Deploy. Anotar la URL del sitio (ej. `https://aurora-beauty-cliente.netlify.app` — se puede personalizar el subdominio en Site settings → Domain management → Options → Edit site name).

## 3. Desplegar el dashboard admin en Netlify

Mismo proceso que el paso 2, pero:
- **Base directory**: `apps/dashboard-admin`
- Mismo `NEXT_PUBLIC_API_URL` (la de Render).
- Es un **sitio de Netlify separado** del de web-cliente (dos sitios del mismo repo, cada uno con su propio "Base directory").

Anotar también esta URL (ej. `https://aurora-beauty-admin.netlify.app`).

## 4. Conectar todo: actualizar ALLOWED_ORIGINS en Render

Volver a Render → el servicio de la API → Environment → editar `ALLOWED_ORIGINS` con las dos URLs de Netlify separadas por coma, sin espacios ni barra final:

```
ALLOWED_ORIGINS=https://aurora-beauty-cliente.netlify.app,https://aurora-beauty-admin.netlify.app
```

Guardar — Render redeploya solo al cambiar una variable de entorno. Sin esto, el navegador va a bloquear los pedidos a la API por CORS.

## 5. Evitar que la API se duerma (cron-job.org, gratis)

1. Crear cuenta gratis en [cron-job.org](https://cron-job.org).
2. **Create cronjob**:
   - **URL**: `https://aurora-beauty-api.onrender.com/api/services` (la URL real de Render + `/api/services`)
   - **Schedule**: cada 10 minutos
3. Guardar. Esto mantiene la API despierta las 24h y de paso asegura que el cron de recordatorios de WhatsApp (que corre cada 10 min dentro de la API) tenga chance de ejecutarse siempre.

## 6. Actualizar el seed de recepción (opcional pero recomendado)

Las credenciales de recepción (`recepcion@aurorabeauty.pe`) viven en la base de Supabase, que es la misma en local y en producción — no hay que hacer nada extra, el login va a funcionar igual una vez desplegado.

## Verificación final

- [ ] Abrir la URL de `web-cliente` en el celular de un cliente de prueba y hacer una reserva completa (OTP incluido).
- [ ] Abrir la URL de `dashboard-admin` desde otra computadora/celular, loguearse con las credenciales de recepción, y confirmar que la cita de prueba aparece.
- [ ] Verificar que no haya errores de CORS en la consola del navegador (F12 → Console) en ninguna de las dos apps.
- [ ] Avisarle a Leslye la URL del dashboard y las credenciales de recepción.

## Costos

Todo lo de arriba es **US$0/mes** con las salvedades ya mencionadas (Render se duerme sin el ping, que también es gratis). Si en el futuro el tráfico crece o el delay de "despertar" de Render molesta, la alternativa es pasar la API a Railway (~US$5/mes, sin duermes) sin tocar nada de Netlify ni Supabase.
