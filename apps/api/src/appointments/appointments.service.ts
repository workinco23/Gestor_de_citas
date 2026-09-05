import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppointmentsGateway } from './appointments.gateway.js';
import { SlotHoldsService } from '../availability/slot-holds.service.js';
import type { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import type { AppointmentStatus, PaymentStatus } from '@aurora/database';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AppointmentsGateway,
    private readonly slotHolds: SlotHoldsService,
  ) {}

  async findAll(params: { date?: string; staffId?: string }) {
    return this.prisma.appointment.findMany({
      where: {
        ...(params.staffId ? { staffId: params.staffId } : {}),
        ...(params.date
          ? {
              startsAt: {
                gte: new Date(`${params.date}T00:00:00.000Z`),
                lt: new Date(`${params.date}T23:59:59.999Z`),
              },
            }
          : {}),
      },
      include: { services: { include: { service: true } }, customer: true, staff: true },
      orderBy: { startsAt: 'asc' },
    });
  }

  async create(dto: CreateAppointmentDto) {
    const services = await this.prisma.service.findMany({
      where: { id: { in: dto.serviceIds } },
    });
    if (services.length !== dto.serviceIds.length) {
      throw new NotFoundException('Uno o más servicios no existen');
    }
    const totalDurationMinutes = services.reduce((sum, s) => sum + s.durationMinutes, 0);
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(startsAt.getTime() + totalDurationMinutes * 60_000);

    // Revalidación de disponibilidad dentro de la transacción para cerrar la
    // ventana de condición de carrera entre GET /availability y este POST.
    // La defensa final (a nivel de BD) es el EXCLUDE constraint descrito en
    // schema.prisma; esto además da un error de negocio legible al cliente.
    return this.prisma.$transaction(async (tx) => {
      const overlapping = await tx.appointment.findFirst({
        where: {
          staffId: dto.staffId,
          status: { not: 'cancelled' },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
      });
      if (overlapping) {
        throw new ConflictException('El horario seleccionado ya no está disponible');
      }

      const appointment = await tx.appointment.create({
        data: {
          customerId: dto.customerId,
          staffId: dto.staffId,
          startsAt,
          endsAt,
          notes: dto.notes,
          createdVia: dto.createdVia,
          services: {
            create: services.map((s) => ({
              serviceId: s.id,
              priceCentsAtBooking: s.priceCents,
            })),
          },
        },
        include: { services: { include: { service: true } }, customer: true, staff: true },
      });

      this.slotHolds.release(dto.staffId, startsAt.toISOString());
      this.gateway.emitAppointmentCreated(appointment);
      return appointment;
    });
  }

  async updateStatus(id: string, status: AppointmentStatus) {
    const appointment = await this.prisma.appointment.update({
      where: { id },
      data: { status },
    });
    this.gateway.emitAppointmentUpdated(appointment);
    return appointment;
  }

  async updatePaymentStatus(id: string, paymentStatus: PaymentStatus) {
    const appointment = await this.prisma.appointment.update({
      where: { id },
      data: { paymentStatus },
    });
    this.gateway.emitAppointmentUpdated(appointment);
    return appointment;
  }
}
