import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';
import { ServicesModule } from './services/services.module.js';
import { StaffModule } from './staff/staff.module.js';
import { AvailabilityModule } from './availability/availability.module.js';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { AuthModule } from './auth/auth.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ServicesModule,
    StaffModule,
    AvailabilityModule,
    AppointmentsModule,
    CustomersModule,
  ],
})
export class AppModule {}
