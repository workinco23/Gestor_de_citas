import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
}
