import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [CustomersController],
})
export class CustomersModule {}
