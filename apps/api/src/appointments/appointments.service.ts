import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppointmentsGateway } from './appointments.gateway.js';
import { SlotHoldsService } from '../availability/slot-holds.service.js';
import { extractBearerToken } from '../auth/jwt-auth.guard.js';
import type { JwtPayload } from '../auth/auth.service.js';
import type { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import type { AppointmentStatus, PaymentStatus } from '@aurora/database';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AppointmentsGateway,
    private readonly slotHolds: SlotHoldsService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Las reservas hechas desde la app del cliente ("app_cliente") deben venir
   * autenticadas por OTP: el customerId se toma del JWT, nunca del body, así
   * un cliente no puede reservar a nombre de otro. Las reservas manuales de
   * recepción ("admin_manual") exigen un JWT de rol admin/reception (login
   * del dashboard) y sí toman el customerId del body, ya que ahí el cliente
   * todavía no tiene cuenta propia — recepción lo identifica por teléfono.
   */
  private async resolveCustomerId(dto: CreateAppointmentDto, authHeader?: string): Promise<string> {
    const token = extractBearerToken(authHeader);
    if (!token) throw new UnauthorizedException('Iniciá sesión para reservar una cita');

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Sesión inválida o vencida, iniciá sesión de nuevo');
    }

    if (dto.createdVia === 'admin_manual') {
      if (!['admin', 'reception'].includes(payload.role)) {
        throw new UnauthorizedException('No tenés permisos para registrar citas manuales');
      }
      if (!dto.customerId) throw new UnauthorizedException('customerId es requerido para citas manuales');
      return dto.customerId;
    }

    return payload.sub;
  }

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

  async create(dto: CreateAppointmentDto, authHeader?: string) {
    const customerId = await this.resolveCustomerId(dto, authHeader);

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
          customerId,
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
