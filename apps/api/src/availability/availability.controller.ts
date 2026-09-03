import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { AvailabilityService } from './availability.service.js';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  async getAvailability(
    @Query('staffId') staffId: string,
    @Query('serviceIds') serviceIds: string,
    @Query('date') date: string,
  ) {
    if (!staffId || !serviceIds || !date) {
      throw new BadRequestException('staffId, serviceIds y date son requeridos');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('date debe tener formato YYYY-MM-DD');
    }

    return this.availabilityService.getAvailableSlots({
      staffId,
      serviceIds: serviceIds.split(','),
      date,
    });
  }
}
