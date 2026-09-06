import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import path from 'node:path';
import { getAllowedOrigins } from './cors.js';

// Carga apps/api/.env de forma explícita y ANTES de importar AppModule: los
// providers (JwtModule.register, WhatsappService, etc.) leen process.env al
// registrarse, no al arrancar la request, así que si el .env se cargara
// después de que ese árbol de módulos ya se evaluó, verían valores vacíos.
// Un import estático de AppModule se evalúa antes que cualquier statement de
// este archivo (los imports se hoistean), por eso AppModule se importa acá
// de forma dinámica, después de cargar el .env.
try {
  process.loadEnvFile(path.resolve(import.meta.dirname, '../.env'));
} catch {
  // Sin .env local (ej. producción, donde las variables las inyecta la
  // plataforma de hosting directamente) — seguir con process.env tal cual.
}

const { AppModule } = await import('./app.module.js');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: getAllowedOrigins() });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3103);
}
await bootstrap();
