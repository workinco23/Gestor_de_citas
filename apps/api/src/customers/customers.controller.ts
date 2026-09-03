import { Body, Controller, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpsertCustomerDto } from './dto/upsert-customer.dto.js';

@Controller('customers')
export class CustomersController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Placeholder de identificación por teléfono para el MVP, sin verificación.
   * Reemplazar por autenticación real (OTP por SMS/WhatsApp) antes de producción:
   * ver PRD_AuroraBeautyLounge.md sección 2.1.
   */
  @Post('upsert-by-phone')
  upsertByPhone(@Body() dto: UpsertCustomerDto) {
    return this.prisma.user.upsert({
      where: { phone: dto.phone },
      update: { fullName: dto.fullName },
      create: { phone: dto.phone, fullName: dto.fullName, role: 'customer' },
    });
  }
}
