import { Body, Controller, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpsertCustomerDto } from './dto/upsert-customer.dto.js';

@Controller('customers')
export class CustomersController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Usado únicamente por el panel admin (recepción registrando una cita
   * manual por teléfono/WhatsApp/presencial) — ver QuickAppointmentForm en
   * dashboard-admin. El flujo de reserva del cliente YA NO usa este
   * endpoint: se autentica por OTP (ver AuthModule) y el customerId sale
   * del JWT, no de un teléfono sin verificar.
   *
   * Este endpoint sigue sin auth porque el dashboard admin todavía no
   * tiene login propio (pendiente separado). Cuando se agregue, protegerlo
   * con el guard de sesión de recepción/admin.
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
