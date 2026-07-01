// =============================================================================
// AuthService - 인증 비즈니스 로직
// 회원가입, 로그인, 사용자 검증 처리
// =============================================================================

import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

/** JWT 페이로드 타입 */
interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // ---------------------------------------------------------------------------
  // 회원가입
  // ---------------------------------------------------------------------------

  /**
   * 이메일 회원가입
   * 1. 이메일 중복 확인
   * 2. 비밀번호 bcrypt 해싱 (10 salt rounds)
   * 3. 사용자 생성
   * 4. JWT 토큰 발급
   */
  async signup(dto: SignUpDto): Promise<AuthResponseDto> {
    // 이메일 중복 확인
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    // 비밀번호 해싱 (10 salt rounds)
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 사용자 생성
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        nickname: dto.nickname,
        provider: 'EMAIL',
      },
    });

    this.logger.log(`새 사용자 가입: ${user.email} (${user.id})`);

    // JWT 토큰 발급 및 응답 생성
    return this.buildAuthResponse(user);
  }

  // ---------------------------------------------------------------------------
  // 로그인
  // ---------------------------------------------------------------------------

  /**
   * 이메일 로그인
   * 1. 이메일로 사용자 조회
   * 2. 비밀번호 검증
   * 3. JWT 토큰 발급
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // 사용자 조회
    const user = await this.validateUser(dto.email, dto.password);

    this.logger.log(`사용자 로그인: ${user.email} (${user.id})`);

    // JWT 토큰 발급 및 응답 생성
    return this.buildAuthResponse(user);
  }

  // ---------------------------------------------------------------------------
  // 사용자 검증
  // ---------------------------------------------------------------------------

  /**
   * 이메일과 비밀번호로 사용자 검증
   * 로그인 시 호출되며, 실패 시 UnauthorizedException을 던짐
   */
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // 사용자가 없거나 비밀번호 해시가 없는 경우 (소셜 로그인 전용 계정)
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    // 비밀번호 비교
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    return user;
  }

  // ---------------------------------------------------------------------------
  // 내부 헬퍼
  // ---------------------------------------------------------------------------

  /**
   * JWT 토큰 생성 및 AuthResponseDto 구성
   * passwordHash를 제외한 사용자 정보를 응답에 포함
   */
  private buildAuthResponse(user: {
    id: string;
    email: string;
    nickname: string;
    profileImageUrl: string | null;
    provider: string;
    createdAt: Date;
  }): AuthResponseDto {
    // JWT 페이로드 생성
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        profileImageUrl: user.profileImageUrl,
        provider: user.provider,
        createdAt: user.createdAt,
      },
    };
  }
}
