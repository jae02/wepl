// =============================================================================
// JwtStrategy - Passport JWT 인증 전략
// Authorization: Bearer <token> 헤더에서 토큰을 추출하고
// payload의 sub(userId)로 DB에서 사용자를 조회하여 request.user에 첨부
// =============================================================================

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

/** JWT 페이로드 타입 */
interface JwtPayload {
  sub: string;   // userId
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET 환경 변수가 설정되지 않았습니다.');
    }

    super({
      // Authorization: Bearer <token> 헤더에서 토큰 추출
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 만료된 토큰 거부
      ignoreExpiration: false,
      // 환경 변수에서 JWT 시크릿 로드
      secretOrKey: secret,
    });
  }

  /**
   * JWT 페이로드 검증 및 사용자 조회
   * 이 메서드의 반환값이 request.user에 첨부됨
   */
  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('존재하지 않는 사용자입니다.');
    }

    // passwordHash는 request.user에 포함하지 않음
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
