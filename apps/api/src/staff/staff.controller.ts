import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('staff')
export class StaffController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findAll(@Query('serviceId') serviceId?: string) {
    return this.prisma.staffProfile.findMany({
      where: {
        active: true,
        ...(serviceId ? { services: { some: { serviceId } } } : {}),
      },
      orderBy: { displayName: 'asc' },
    });
  }
}
