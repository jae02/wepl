// =============================================================================
// JwtAuthGuard - JWT 인증 가드
// 보호가 필요한 엔드포인트에 @UseGuards(JwtAuthGuard) 데코레이터로 적용
// =============================================================================

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
