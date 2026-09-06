import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { AppointmentsService } from './appointments.service.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import type { AppointmentStatus, PaymentStatus } from '@aurora/database';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  findAll(@Query('date') date?: string, @Query('staffId') staffId?: string) {
    return this.appointmentsService.findAll({ date, staffId });
  }

  @Post()
  create(@Body() dto: CreateAppointmentDto, @Headers('authorization') authHeader?: string) {
    return this.appointmentsService.create(dto, authHeader);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: AppointmentStatus) {
    return this.appointmentsService.updateStatus(id, status);
  }

  @Patch(':id/payment-status')
  updatePaymentStatus(@Param('id') id: string, @Body('paymentStatus') paymentStatus: PaymentStatus) {
    return this.appointmentsService.updatePaymentStatus(id, paymentStatus);
  }
}
