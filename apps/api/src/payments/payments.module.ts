import { Module } from '@nestjs/common';
import { PaymentInfoController } from './payment-info.controller.js';

@Module({
  controllers: [PaymentInfoController],
})
export class PaymentsModule {}
