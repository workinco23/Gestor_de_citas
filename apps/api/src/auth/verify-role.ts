import { UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { extractBearerToken } from './jwt-auth.guard.js';
import type { JwtPayload } from './auth.service.js';

export async function verifyRole(
  jwt: JwtService,
  authorizationHeader: string | undefined,
  allowedRoles: string[],
): Promise<JwtPayload> {
  const token = extractBearerToken(authorizationHeader);
  if (!token) throw new UnauthorizedException('Iniciá sesión para acceder al panel');

  let payload: JwtPayload;
  try {
    payload = await jwt.verifyAsync<JwtPayload>(token);
  } catch {
    throw new UnauthorizedException('Sesión inválida o vencida, iniciá sesión de nuevo');
  }

  if (!allowedRoles.includes(payload.role)) {
    throw new UnauthorizedException('No tenés permisos para esta acción');
  }
  return payload;
}
