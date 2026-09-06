import type { JwtPayload } from './auth.service.js';

export interface RequestWithUser {
  headers: { authorization?: string };
  user?: JwtPayload;
}
