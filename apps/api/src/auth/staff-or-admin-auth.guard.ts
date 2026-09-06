import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verifyRole } from './verify-role.js';
import type { RequestWithUser } from './request-with-user.js';

const VIEW_ROLES = ['admin', 'reception', 'staff'];

/**
 * Exige un JWT válido con role=admin, reception o staff. Usar en endpoints
 * que una especialista también puede usar para ver/gestionar SUS PROPIAS
 * citas — la restricción de "solo lo suyo" se aplica en el controller/
 * service, este guard solo valida que la sesión sea de alguno de estos
 * roles.
 */
@Injectable()
export class StaffOrAdminAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    request.user = await verifyRole(this.jwt, request.headers.authorization, VIEW_ROLES);
    return true;
  }
}
