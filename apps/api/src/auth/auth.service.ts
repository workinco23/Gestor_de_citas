import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verifyPassword } from '@aurora/database';
import { PrismaService } from '../prisma/prisma.service.js';
import { OtpService } from './otp.service.js';

export interface JwtPayload {
  sub: string;
  phone: string;
  role: string;
  /** Solo presente cuando role="staff" — la especialista solo ve/gestiona sus propias citas. */
  staffProfileId?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly jwt: JwtService,
  ) {}

  requestOtp(phone: string) {
    return this.otp.requestOtp(phone);
  }

  async verifyOtp(challengeId: string, code: string, phone: string, fullName: string) {
    await this.otp.verifyOtp(challengeId, code, phone);

    const user = await this.prisma.user.upsert({
      where: { phone },
      update: { fullName },
      create: { phone, fullName, role: 'customer' },
    });

    const payload: JwtPayload = { sub: user.id, phone: user.phone, role: user.role };
    const token = await this.jwt.signAsync(payload);

    return { token, user };
  }

  /**
   * Login compartido para recepción/admin y para cada especialista (ej.
   * Leslye) — todas usan email+password sobre la misma tabla User, la
   * diferencia de permisos se resuelve por role en los guards.
   */
  async adminLogin(email: string, password: string) {
    const user = await this.prisma.user.findFirst({ where: { email } });
    if (!user?.passwordHash || !['admin', 'reception', 'staff'].includes(user.role)) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }
    if (!verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    let staffProfileId: string | undefined;
    if (user.role === 'staff') {
      const staffProfile = await this.prisma.staffProfile.findUnique({ where: { userId: user.id } });
      if (!staffProfile) throw new UnauthorizedException('Esta cuenta no tiene un perfil de especialista asociado');
      staffProfileId = staffProfile.id;
    }

    const payload: JwtPayload = { sub: user.id, phone: user.phone, role: user.role, staffProfileId };
    // Sesión corta: es una credencial personal pero conviene forzar login de
    // nuevo cada turno (dispositivo compartido en el mostrador, o celular).
    const token = await this.jwt.signAsync(payload, { expiresIn: '12h' });

    return {
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, staffProfileId },
    };
  }
}
