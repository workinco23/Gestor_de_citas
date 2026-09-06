import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpsertCustomerDto } from './dto/upsert-customer.dto.js';
import { AdminAuthGuard } from '../auth/admin-auth.guard.js';

@Controller('customers')
export class CustomersController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Usado únicamente por el panel admin (recepción registrando una cita
   * manual por teléfono/WhatsApp/presencial) — ver QuickAppointmentForm en
   * dashboard-admin. El flujo de reserva del cliente NO usa este endpoint:
   * se autentica por OTP (ver AuthModule) y el customerId sale del JWT.
   */
  @Post('upsert-by-phone')
  @UseGuards(AdminAuthGuard)
  upsertByPhone(@Body() dto: UpsertCustomerDto) {
    return this.prisma.user.upsert({
      where: { phone: dto.phone },
      update: { fullName: dto.fullName },
      create: { phone: dto.phone, fullName: dto.fullName, role: 'customer' },
    });
  }
}
