const DEFAULT_ORIGINS = ['http://localhost:3101', 'http://localhost:3102'];

/**
 * Orígenes permitidos para CORS (HTTP) y para el WebSocket gateway.
 * En producción se configuran con ALLOWED_ORIGINS (URLs separadas por coma,
 * ej. "https://aurora-beauty-cliente.netlify.app,https://aurora-beauty-admin.netlify.app").
 * Sin esa variable, cae a los puertos locales de desarrollo.
 */
export function getAllowedOrigins(): string[] {
  const fromEnv = process.env.ALLOWED_ORIGINS?.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_ORIGINS;
}
