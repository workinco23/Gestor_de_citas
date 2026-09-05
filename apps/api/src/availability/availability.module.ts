import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability.controller.js';
import { AvailabilityService } from './availability.service.js';
import { SlotHoldsService } from './slot-holds.service.js';

@Module({
  controllers: [AvailabilityController],
  providers: [AvailabilityService, SlotHoldsService],
  exports: [AvailabilityService, SlotHoldsService],
})
export class AvailabilityModule {}
