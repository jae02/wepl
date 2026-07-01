// =============================================================================
// AuthModule - 인증 모듈
// JwtModule, PassportModule, JWT 전략, 컨트롤러, 서비스를 한데 묶어 구성
// =============================================================================

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    // Passport 기본 전략 설정
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JWT 모듈 비동기 등록 (환경 변수에서 시크릿 로드)
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '7d', // 토큰 만료 기간: 7일
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  // 다른 모듈에서 JwtAuthGuard를 사용할 수 있도록 내보내기
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
