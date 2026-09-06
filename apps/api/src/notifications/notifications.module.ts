import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service.js';
import { RemindersService } from './reminders.service.js';

@Module({
  providers: [WhatsappService, RemindersService],
  exports: [WhatsappService],
})
export class NotificationsModule {}
