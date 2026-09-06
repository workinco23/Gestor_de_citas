import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AppointmentsService } from './appointments.service.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { AdminAuthGuard } from '../auth/admin-auth.guard.js';
import type { AppointmentStatus, PaymentStatus } from '@aurora/database';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @UseGuards(AdminAuthGuard)
  findAll(@Query('date') date?: string, @Query('staffId') staffId?: string) {
    return this.appointmentsService.findAll({ date, staffId });
  }

  // Sin guard a nivel de framework: sirve tanto al cliente (createdVia=app_cliente,
  // exige JWT de OTP) como al panel admin (createdVia=admin_manual, exige JWT de
  // recepción). La distinción se resuelve dentro de AppointmentsService.resolveCustomerId.
  @Post()
  create(@Body() dto: CreateAppointmentDto, @Headers('authorization') authHeader?: string) {
    return this.appointmentsService.create(dto, authHeader);
  }

  @Patch(':id/status')
  @UseGuards(AdminAuthGuard)
  updateStatus(@Param('id') id: string, @Body('status') status: AppointmentStatus) {
    return this.appointmentsService.updateStatus(id, status);
  }

  @Patch(':id/payment-status')
  @UseGuards(AdminAuthGuard)
  updatePaymentStatus(@Param('id') id: string, @Body('paymentStatus') paymentStatus: PaymentStatus) {
    return this.appointmentsService.updatePaymentStatus(id, paymentStatus);
  }
}
