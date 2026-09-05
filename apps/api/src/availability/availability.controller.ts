import { BadRequestException, Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';
import { AvailabilityService } from './availability.service.js';
import { SlotHoldsService } from './slot-holds.service.js';
import { HoldSlotDto } from './dto/hold-slot.dto.js';

@Controller('availability')
export class AvailabilityController {
  constructor(
    private readonly availabilityService: AvailabilityService,
    private readonly slotHolds: SlotHoldsService,
  ) {}

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

  /**
   * Aparta un slot por 5 minutos mientras el cliente completa el checkout.
   * No reemplaza la validación de solapamiento al crear la cita (ver
   * AppointmentsService.create) — es solo para que el slot desaparezca del
   * calendario de otros clientes navegando en simultáneo.
   */
  @Post('hold')
  hold(@Body() dto: HoldSlotDto) {
    return this.slotHolds.hold(dto.staffId, dto.startsAt);
  }

  @Delete('hold')
  release(@Query('staffId') staffId: string, @Query('startsAt') startsAt: string) {
    if (!staffId || !startsAt) {
      throw new BadRequestException('staffId y startsAt son requeridos');
    }
    this.slotHolds.release(staffId, startsAt);
    return { released: true };
  }
}
