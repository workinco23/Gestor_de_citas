import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { AdminAuthGuard } from '../auth/admin-auth.guard.js';
import { StaffOrAdminAuthGuard } from '../auth/staff-or-admin-auth.guard.js';
import type { RequestWithUser } from '../auth/request-with-user.js';
import type { AppointmentStatus, PaymentMethod, PaymentStatus } from '@aurora/database';

/** Una especialista solo puede marcar sus propias citas como completadas o canceladas. */
const STAFF_ALLOWED_STATUSES: AppointmentStatus[] = ['completed', 'cancelled'];

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @UseGuards(StaffOrAdminAuthGuard)
  findAll(
    @Req() req: RequestWithUser,
    @Query('date') date?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('staffId') staffId?: string,
  ) {
    // Una especialista solo ve su propia agenda, sin importar qué staffId
    // haya mandado el cliente — se ignora y se fuerza al suyo.
    const effectiveStaffId = req.user?.role === 'staff' ? req.user.staffProfileId : staffId;
    return this.appointmentsService.findAll({ date, from, to, staffId: effectiveStaffId });
  }

  // Sin guard a nivel de framework: sirve tanto al cliente (createdVia=app_cliente,
  // exige JWT de OTP) como al panel admin (createdVia=admin_manual, exige JWT de
  // recepción). La distinción se resuelve dentro de AppointmentsService.resolveCustomerId.
  @Post()
  create(@Body() dto: CreateAppointmentDto, @Headers('authorization') authHeader?: string) {
    return this.appointmentsService.create(dto, authHeader);
  }

  @Patch(':id/status')
  @UseGuards(StaffOrAdminAuthGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: AppointmentStatus,
    @Req() req: RequestWithUser,
  ) {
    if (req.user?.role === 'staff') {
      if (!STAFF_ALLOWED_STATUSES.includes(status)) {
        throw new ForbiddenException('Solo podés marcar tus citas como completadas o cancelarlas');
      }
      await this.appointmentsService.assertStaffOwnsAppointment(id, req.user.staffProfileId);
    }
    return this.appointmentsService.updateStatus(id, status);
  }

  @Patch(':id/payment-status')
  @UseGuards(AdminAuthGuard)
  updatePaymentStatus(
    @Param('id') id: string,
    @Body('paymentStatus') paymentStatus: PaymentStatus,
    @Body('method') method?: PaymentMethod,
  ) {
    return this.appointmentsService.updatePaymentStatus(id, paymentStatus, method);
  }
}
