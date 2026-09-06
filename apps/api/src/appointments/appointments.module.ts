import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller.js';
import { AppointmentsService } from './appointments.service.js';
import { AppointmentsGateway } from './appointments.gateway.js';
import { AvailabilityModule } from '../availability/availability.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AvailabilityModule, AuthModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentsGateway],
})
export class AppointmentsModule {}
