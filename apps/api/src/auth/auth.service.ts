import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verifyPassword } from '@aurora/database';
import { PrismaService } from '../prisma/prisma.service.js';
import { OtpService } from './otp.service.js';

export interface JwtPayload {
  sub: string;
  phone: string;
  role: string;
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

  async adminLogin(email: string, password: string) {
    const user = await this.prisma.user.findFirst({ where: { email } });
    if (!user?.passwordHash || !['admin', 'reception'].includes(user.role)) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }
    if (!verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    const payload: JwtPayload = { sub: user.id, phone: user.phone, role: user.role };
    // Sesión de recepción más corta que la del cliente: es un dispositivo/credencial
    // compartida en el mostrador, conviene forzar login de nuevo cada turno.
    const token = await this.jwt.signAsync(payload, { expiresIn: '12h' });

    return { token, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } };
  }
}
