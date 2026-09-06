# Guía de despliegue — Aurora Beauty Lounge

Objetivo: que Leslye y quien atienda recepción puedan ver la agenda desde
cualquier navegador — sin depender de que la laptop de casa esté prendida y
corriendo `npm run dev`.

Decisión del negocio (por ahora): las clientas escriben por WhatsApp/Instagram
y recepción registra la cita manualmente. La app de auto-reserva del cliente
(`apps/web-cliente`) sigue existiendo y funcionando en el repo, pero **no se
despliega todavía** — se puede activar más adelante sin tocar nada de esto.

Arquitectura de despliegue:

| Componente | Dónde | Por qué |
|---|---|---|
| `apps/dashboard-admin` | Netlify | Ya tenés cuenta, gratis, ideal para Next.js. Lo usan recepción/admin (ven y gestionan todo) y Leslye (ve y gestiona solo su propia agenda) |
| `apps/api` | Render (free tier) | Necesita quedar corriendo todo el tiempo (WebSocket + el cron de recordatorios), no sirve un hosting "serverless" como Netlify Functions |
| Base de datos | Supabase (ya está) | Sin cambios |
| `apps/web-cliente` | — (no desplegado por ahora) | Pendiente para cuando el negocio quiera abrir la auto-reserva al público |

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
   - `ALLOWED_ORIGINS` = (completar en el paso 3, con la URL de Netlify una vez creada)
   - **NO hace falta** setear `PORT` — Render lo inyecta solo.
5. Deploy. Cuando termine, anotar la URL pública (algo como `https://aurora-beauty-api.onrender.com`).
6. Probar que responde: abrir `https://aurora-beauty-api.onrender.com/api/services` en el navegador — debería devolver la lista de servicios en JSON. (`https://.../` sola da "Cannot GET /" — es normal, todo vive bajo `/api/...`.)

✅ **Ya hecho** — este paso lo completaste y funciona: `https://gestor-de-citas-vmak.onrender.com`.

## 2. Configurar el sitio de Netlify (dashboard admin)

Ya creaste el sitio en Netlify; solo falta apuntarlo a la carpeta correcta:

1. En el sitio ya creado: **Site configuration** → **Build & deploy** → **Build settings** → **Edit settings** (o "Configure").
2. **Base directory**: `apps/dashboard-admin`
3. **Build command**: `npm run build` (ya viene definido en `apps/dashboard-admin/netlify.toml`, no hace falta tocarlo)
4. **Publish directory**: `.next` (también ya está en el `netlify.toml`)
5. **Site configuration → Environment variables** → agregar:
   - `NEXT_PUBLIC_API_URL` = `https://gestor-de-citas-vmak.onrender.com`
6. Guardar → **Deploys** → **Trigger deploy** → **Clear cache and deploy site** (importante limpiar caché para no reusar el intento fallido anterior).
7. Anotar la URL del sitio (ej. `https://aurora-beauty-admin.netlify.app` — se puede personalizar el subdominio en Site configuration → Domain management → Options → Edit site name).

## 3. Conectar todo: actualizar ALLOWED_ORIGINS en Render

Volver a Render → el servicio de la API → Environment → editar `ALLOWED_ORIGINS` con la URL de Netlify del paso 2, sin espacios ni barra final:

```
ALLOWED_ORIGINS=https://aurora-beauty-admin.netlify.app
```

Guardar — Render redeploya solo al cambiar una variable de entorno. Sin esto, el navegador va a bloquear los pedidos a la API por CORS.

## 4. Evitar que la API se duerma (cron-job.org, gratis)

1. Crear cuenta gratis en [cron-job.org](https://cron-job.org).
2. **Create cronjob**:
   - **URL**: `https://gestor-de-citas-vmak.onrender.com/api/services`
   - **Schedule**: cada 10 minutos
3. Guardar. Esto mantiene la API despierta las 24h y de paso asegura que el cron de recordatorios de WhatsApp (que corre cada 10 min dentro de la API) tenga chance de ejecutarse siempre.

## Verificación final

- [ ] Abrir la URL de `dashboard-admin` desde el celular/compu de Leslye, loguearse con `leslye@aurorabeauty.pe` y confirmar que ve su agenda semanal.
- [ ] Loguearse también con las credenciales de recepción y confirmar que ve todo.
- [ ] Verificar que no haya errores de CORS en la consola del navegador (F12 → Console).
- [ ] Avisarle a Leslye la URL del dashboard y su usuario/contraseña.

## Para más adelante: activar la app del cliente

Cuando el negocio quiera que las clientas reserven solas (sin pasar por WhatsApp), desplegar `apps/web-cliente` en un segundo sitio de Netlify con `Base directory: apps/web-cliente` y el mismo `NEXT_PUBLIC_API_URL`, y sumar esa URL a `ALLOWED_ORIGINS` en Render (separada por coma). No requiere ningún otro cambio.

## Costos

Todo lo de arriba es **US$0/mes** con las salvedades ya mencionadas (Render se duerme sin el ping, que también es gratis). Si en el futuro el tráfico crece o el delay de "despertar" de Render molesta, la alternativa es pasar la API a Railway (~US$5/mes, sin duermes) sin tocar nada de Netlify ni Supabase.
