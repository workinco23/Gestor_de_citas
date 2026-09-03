import { Injectable, NotFoundException } from '@nestjs/common';
import { fromZonedTime } from 'date-fns-tz';
import { PrismaService } from '../prisma/prisma.service.js';

const TIMEZONE = 'America/Lima';
const SLOT_STEP_MINUTES = 15;

interface AvailabilityParams {
  staffId: string;
  serviceIds: string[];
  /** YYYY-MM-DD, interpretada en America/Lima */
  date: string;
}

function parseHHmm(value: string): { hours: number; minutes: number } {
  const [hours, minutes] = value.split(':').map(Number);
  return { hours, minutes };
}

/** Convierte una fecha (YYYY-MM-DD) + hora local "HH:mm" en Lima a un Date UTC. */
function limaLocalToUtc(date: string, hhmm: string): Date {
  const { hours, minutes } = parseHHmm(hhmm);
  const iso = `${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  return fromZonedTime(iso, TIMEZONE);
}

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getAvailableSlots({ staffId, serviceIds, date }: AvailabilityParams) {
    const staff = await this.prisma.staffProfile.findUnique({ where: { id: staffId } });
    if (!staff) throw new NotFoundException('Especialista no encontrado');

    const services = await this.prisma.service.findMany({
      where: { id: { in: serviceIds } },
    });
    if (services.length !== serviceIds.length) {
      throw new NotFoundException('Uno o más servicios no existen');
    }
    const totalDurationMinutes = services.reduce((sum, s) => sum + s.durationMinutes, 0);

    const weekday = fromZonedTime(`${date}T12:00:00`, TIMEZONE).getUTCDay();
    // Nota: usamos mediodía para evitar problemas de borde de día al calcular el weekday.

    const [schedules, exceptions, existingAppointments] = await Promise.all([
      this.prisma.staffSchedule.findMany({ where: { staffId, weekday } }),
      this.prisma.staffScheduleException.findMany({
        where: { staffId, date: new Date(`${date}T00:00:00Z`) },
      }),
      this.prisma.appointment.findMany({
        where: {
          staffId,
          status: { not: 'cancelled' },
          startsAt: {
            gte: limaLocalToUtc(date, '00:00'),
            lt: limaLocalToUtc(date, '23:59'),
          },
        },
        select: { startsAt: true, endsAt: true },
      }),
    ]);

    // Bloqueo de día completo (excepción sin horas específicas).
    if (exceptions.some((e) => !e.startTime && !e.endTime)) {
      return [];
    }

    const slots: { startsAt: string; endsAt: string }[] = [];

    for (const schedule of schedules) {
      let cursor = limaLocalToUtc(date, schedule.startTime);
      const scheduleEnd = limaLocalToUtc(date, schedule.endTime);

      while (cursor.getTime() + totalDurationMinutes * 60_000 <= scheduleEnd.getTime()) {
        const slotStart = cursor;
        const slotEnd = new Date(cursor.getTime() + totalDurationMinutes * 60_000);

        const overlapsAppointment = existingAppointments.some(
          (a) => slotStart < a.endsAt && slotEnd > a.startsAt,
        );

        const overlapsException = exceptions.some((e) => {
          if (!e.startTime || !e.endTime) return false;
          const excStart = limaLocalToUtc(date, e.startTime);
          const excEnd = limaLocalToUtc(date, e.endTime);
          return slotStart < excEnd && slotEnd > excStart;
        });

        if (!overlapsAppointment && !overlapsException) {
          slots.push({ startsAt: slotStart.toISOString(), endsAt: slotEnd.toISOString() });
        }

        cursor = new Date(cursor.getTime() + SLOT_STEP_MINUTES * 60_000);
      }
    }

    return slots;
  }
}
