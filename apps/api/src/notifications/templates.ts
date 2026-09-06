import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';

const TIMEZONE = 'America/Lima';

interface AppointmentForMessage {
  startsAt: Date;
  staff: { displayName: string };
  services: { service: { name: string } }[];
}

function formatWhen(startsAt: Date): string {
  return formatInTimeZone(startsAt, TIMEZONE, "EEEE d 'de' MMMM 'a las' HH:mm 'hrs'", { locale: es });
}

function serviceList(appt: AppointmentForMessage): string {
  return appt.services.map((s) => s.service.name).join(', ');
}

export function confirmationMessage(appt: AppointmentForMessage, paymentNote?: string): string {
  const base =
    `¡Hola! Tu cita en Aurora Beauty Lounge quedó reservada 💅\n\n` +
    `Servicio(s): ${serviceList(appt)}\n` +
    `Especialista: ${appt.staff.displayName}\n` +
    `Fecha: ${formatWhen(appt.startsAt)}\n`;
  return paymentNote ? base + `\n${paymentNote}` : base;
}

export function cancellationMessage(appt: AppointmentForMessage): string {
  return (
    `Tu cita en Aurora Beauty Lounge del ${formatWhen(appt.startsAt)} fue cancelada.\n` +
    `Si fue un error o querés reagendar, contactanos o volvé a reservar desde la app.`
  );
}

export function reminder24hMessage(appt: AppointmentForMessage): string {
  return (
    `Te recordamos tu cita mañana en Aurora Beauty Lounge 💅\n\n` +
    `Servicio(s): ${serviceList(appt)}\n` +
    `Especialista: ${appt.staff.displayName}\n` +
    `Fecha: ${formatWhen(appt.startsAt)}\n\n` +
    `Si no podés asistir, por favor avisanos con anticipación.`
  );
}

export function reminder2hMessage(appt: AppointmentForMessage): string {
  return (
    `¡Tu cita en Aurora Beauty Lounge es en 2 horas! (${formatWhen(appt.startsAt)})\n` +
    `Especialista: ${appt.staff.displayName}. ¡Te esperamos!`
  );
}

export function paymentInstructionsNote(depositSoles: string, phone: string, holderName: string): string {
  return (
    `Para asegurar tu cita, podés adelantar S/ ${depositSoles} por Yape o Plin al número ${phone} ` +
    `(a nombre de ${holderName}) y avisarnos por acá, o pagar el total en el local.`
  );
}
