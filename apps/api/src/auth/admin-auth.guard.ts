import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verifyRole } from './verify-role.js';
import type { RequestWithUser } from './request-with-user.js';

const ADMIN_ROLES = ['admin', 'reception'];

/** Exige un JWT válido con role=admin o reception. Usar en endpoints del dashboard. */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    request.user = await verifyRole(this.jwt, request.headers.authorization, ADMIN_ROLES);
    return true;
  }
}
