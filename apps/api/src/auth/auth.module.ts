import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { OtpService } from './otp.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { AdminAuthGuard } from './admin-auth.guard.js';
import { StaffOrAdminAuthGuard } from './staff-or-admin-auth.guard.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    NotificationsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '30d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, JwtAuthGuard, AdminAuthGuard, StaffOrAdminAuthGuard],
  exports: [JwtModule, JwtAuthGuard, AdminAuthGuard, StaffOrAdminAuthGuard],
})
export class AuthModule {}
