import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { extractBearerToken } from './jwt-auth.guard.js';
import type { JwtPayload } from './auth.service.js';

interface RequestWithUser {
  headers: { authorization?: string };
  user?: JwtPayload;
}

const ADMIN_ROLES = ['admin', 'reception'];

/** Exige un JWT válido con role=admin o reception. Usar en endpoints del dashboard. */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) throw new UnauthorizedException('Iniciá sesión para acceder al panel');

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Sesión inválida o vencida, iniciá sesión de nuevo');
    }

    if (!ADMIN_ROLES.includes(payload.role)) {
      throw new UnauthorizedException('No tenés permisos para esta acción');
    }
    request.user = payload;
    return true;
  }
}
