// =============================================================================
// AuthController - 인증 API 엔드포인트
// 모든 엔드포인트는 /api/v1/auth 경로 하위에 매핑
// =============================================================================

import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ---------------------------------------------------------------------------
  // POST /api/v1/auth/signup - 이메일 회원가입
  // ---------------------------------------------------------------------------
  @Post('signup')
  async signup(@Body() dto: SignUpDto): Promise<AuthResponseDto> {
    return this.authService.signup(dto);
  }

  // ---------------------------------------------------------------------------
  // POST /api/v1/auth/login - 이메일 로그인
  // ---------------------------------------------------------------------------
  @Post('login')
  @HttpCode(HttpStatus.OK) // POST지만 리소스 생성이 아니므로 200 반환
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  // ---------------------------------------------------------------------------
  // GET /api/v1/auth/me - 내 정보 조회 (인증 필요)
  // ---------------------------------------------------------------------------
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: any) {
    // JwtStrategy.validate()에서 passwordHash를 제외한 사용자 정보가 반환됨
    return user;
  }
}
