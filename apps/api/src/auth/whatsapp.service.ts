import { Injectable, Logger } from '@nestjs/common';
import Twilio from 'twilio';

/**
 * Envía el código OTP por WhatsApp vía Twilio. Sin credenciales de Twilio
 * configuradas (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN), cae a un modo de
 * desarrollo que solo loguea el código — así el flujo completo se puede
 * probar en local sin cuenta de Twilio. AuthService decide si además debe
 * devolver el código en la respuesta HTTP (solo en ese mismo modo dev).
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
        'TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN no configurados: los OTP solo se loguearán en consola (modo desarrollo).',
      );
    }
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  async sendOtp(phone: string, code: string): Promise<void> {
    const body = `Tu código de verificación de Aurora Beauty Lounge es: ${code}. Vence en 5 minutos.`;

    if (!this.client || !this.fromNumber) {
      this.logger.warn(`[DEV] OTP para ${phone}: ${code}`);
      return;
    }

    await this.client.messages.create({
      from: this.fromNumber,
      to: `whatsapp:${phone}`,
      body,
    });
  }
}
