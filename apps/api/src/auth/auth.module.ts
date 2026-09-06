import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { OtpService } from './otp.service.js';
import { WhatsappService } from './whatsapp.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { AdminAuthGuard } from './admin-auth.guard.js';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '30d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, WhatsappService, JwtAuthGuard, AdminAuthGuard],
  exports: [JwtModule, JwtAuthGuard, AdminAuthGuard],
})
export class AuthModule {}
