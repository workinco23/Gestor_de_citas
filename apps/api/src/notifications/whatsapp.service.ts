import { Injectable, Logger } from '@nestjs/common';
import Twilio from 'twilio';

/**
 * Envía mensajes por WhatsApp vía Twilio (OTP, confirmaciones, recordatorios,
 * cancelaciones). Sin TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN configurados, cae
 * a un modo de desarrollo que solo loguea el mensaje — así todo el flujo se
 * puede probar en local sin cuenta de Twilio.
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly client: ReturnType<typeof Twilio> | null;
  private readonly fromNumber = process.env.TWILIO_WHATSAPP_FROM;

  constructor() {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    this.client = sid && token ? Twilio(sid, token) : null;
    if (!this.client) {
      this.logger.warn(
        'TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN no configurados: los mensajes de WhatsApp solo se loguearán en consola (modo desarrollo).',
      );
    }
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  async sendMessage(phone: string, body: string): Promise<void> {
    if (!this.client || !this.fromNumber) {
      this.logger.warn(`[DEV] WhatsApp a ${phone}:\n${body}`);
      return;
    }

    try {
      await this.client.messages.create({
        from: this.fromNumber,
        to: `whatsapp:${phone}`,
        body,
      });
    } catch (err) {
      // Un fallo de envío (número inválido, etc.) no debe tumbar la operación
      // que lo disparó (crear/cancelar una cita) — solo se loguea.
      this.logger.error(`Falló el envío de WhatsApp a ${phone}: ${(err as Error).message}`);
    }
  }

  sendOtp(phone: string, code: string): Promise<void> {
    return this.sendMessage(phone, `Tu código de verificación de Aurora Beauty Lounge es: ${code}. Vence en 5 minutos.`);
  }
}
