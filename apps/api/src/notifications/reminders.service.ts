import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { WhatsappService } from './whatsapp.service.js';
import { reminder24hMessage, reminder2hMessage } from './templates.js';

const ACTIVE_STATUSES = ['pending', 'confirmed'] as const;
const HOUR_MS = 60 * 60_000;

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async sendDueReminders(): Promise<void> {
    await this.send24hReminders();
    await this.send2hReminders();
  }

  private async send24hReminders(): Promise<void> {
    const now = Date.now();
    // Ventana ancha (20h-24h10min) en vez de exacta: si el cron estuvo caído
    // un rato, igual atrapa el recordatorio en la siguiente corrida. El piso
    // de 20h evita mandar "tu cita es mañana" para algo reservado a último
    // momento y que en realidad es más pronto (ese caso lo cubre el de 2h).
    const windowStart = new Date(now + 20 * HOUR_MS);
    const windowEnd = new Date(now + 24 * HOUR_MS + 10 * 60_000);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        status: { in: [...ACTIVE_STATUSES] },
        reminder24hSentAt: null,
        startsAt: { gte: windowStart, lt: windowEnd },
      },
      include: { customer: true, staff: true, services: { include: { service: true } } },
    });

    for (const appt of appointments) {
      await this.whatsapp.sendMessage(appt.customer.phone, reminder24hMessage(appt));
      await this.prisma.appointment.update({
        where: { id: appt.id },
        data: { reminder24hSentAt: new Date() },
      });
    }
    if (appointments.length > 0) this.logger.log(`Recordatorios 24h enviados: ${appointments.length}`);
  }

  private async send2hReminders(): Promise<void> {
    const now = Date.now();
    // Desde ahora mismo hasta 2h10min: cubre tanto la cita "normal" (reservada
    // con más de 2h de anticipación) como una reservada de último momento
    // (menos de 20h antes, que no pasó por el recordatorio de 24h).
    const windowStart = new Date(now);
    const windowEnd = new Date(now + 2 * HOUR_MS + 10 * 60_000);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        status: { in: [...ACTIVE_STATUSES] },
        reminder2hSentAt: null,
        startsAt: { gte: windowStart, lt: windowEnd },
      },
      include: { customer: true, staff: true, services: { include: { service: true } } },
    });

    for (const appt of appointments) {
      await this.whatsapp.sendMessage(appt.customer.phone, reminder2hMessage(appt));
      await this.prisma.appointment.update({
        where: { id: appt.id },
        data: { reminder2hSentAt: new Date() },
      });
    }
    if (appointments.length > 0) this.logger.log(`Recordatorios 2h enviados: ${appointments.length}`);
  }
}
