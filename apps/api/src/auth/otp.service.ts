import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomInt } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { WhatsappService } from './whatsapp.service.js';

const OTP_TTL_MS = 5 * 60_000;
const MIN_SECONDS_BETWEEN_REQUESTS = 45;
const MAX_VERIFY_ATTEMPTS = 5;

function hashCode(phone: string, code: string): string {
  const pepper = process.env.JWT_SECRET ?? 'dev-pepper';
  return createHash('sha256').update(`${phone}:${code}:${pepper}`).digest('hex');
}

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
  ) {}

  async requestOtp(phone: string): Promise<{ challengeId: string; devCode?: string }> {
    const lastChallenge = await this.prisma.otpChallenge.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });
    if (lastChallenge) {
      const secondsSinceLast = (Date.now() - lastChallenge.createdAt.getTime()) / 1000;
      if (secondsSinceLast < MIN_SECONDS_BETWEEN_REQUESTS) {
        throw new HttpException(
          `Esperá ${Math.ceil(MIN_SECONDS_BETWEEN_REQUESTS - secondsSinceLast)}s antes de pedir otro código`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const challenge = await this.prisma.otpChallenge.create({
      data: {
        phone,
        codeHash: hashCode(phone, code),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    await this.whatsapp.sendOtp(phone, code);

    return {
      challengeId: challenge.id,
      // Solo en modo desarrollo (sin Twilio configurado) para poder probar
      // el flujo end-to-end sin recibir el WhatsApp real.
      ...(this.whatsapp.isConfigured ? {} : { devCode: code }),
    };
  }

  async verifyOtp(challengeId: string, code: string, phone: string): Promise<void> {
    const challenge = await this.prisma.otpChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge || challenge.phone !== phone) {
      throw new UnauthorizedException('Código inválido');
    }
    if (challenge.consumedAt) {
      throw new UnauthorizedException('Este código ya fue usado');
    }
    if (challenge.expiresAt < new Date()) {
      throw new UnauthorizedException('El código venció, pedí uno nuevo');
    }
    if (challenge.attempts >= MAX_VERIFY_ATTEMPTS) {
      throw new UnauthorizedException('Demasiados intentos, pedí un código nuevo');
    }

    if (challenge.codeHash !== hashCode(phone, code)) {
      await this.prisma.otpChallenge.update({
        where: { id: challengeId },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Código inválido');
    }

    await this.prisma.otpChallenge.update({
      where: { id: challengeId },
      data: { consumedAt: new Date() },
    });
  }
}
