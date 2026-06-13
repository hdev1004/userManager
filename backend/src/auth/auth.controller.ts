import {
  Body,
  Controller,
  HttpCode,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthService } from './auth.service';
import type { AdminPayload } from './auth.service';
import { CurrentAdmin, JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto.loginId, dto.password);
  }

  @Post('logout')
  @HttpCode(204)
  logout() {
    // 클라이언트가 토큰 폐기 (stateless)
    return;
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentAdmin() admin: AdminPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(admin.sub, dto.currentPassword, dto.newPassword);
  }
}
