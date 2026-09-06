import { Controller, Get } from '@nestjs/common';

@Controller('payment-info')
export class PaymentInfoController {
  @Get()
  get() {
    return {
      phone: process.env.PAYMENT_YAPE_PLIN_PHONE ?? '',
      holderName: process.env.PAYMENT_YAPE_PLIN_HOLDER ?? '',
      depositCents: Number(process.env.PAYMENT_DEPOSIT_CENTS ?? 2000),
    };
  }
}
