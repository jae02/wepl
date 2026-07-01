// =============================================================================
// TripMemberGuard - 여행 멤버 여부 확인 가드
// 라우트 파라미터 :tripId에 해당하는 여행의 멤버인지 검증
// =============================================================================

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TripMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tripId = request.params.tripId;

    // tripId가 라우트 파라미터에 없으면 가드 통과 (다른 엔드포인트에서 사용 가능)
    if (!tripId) {
      return true;
    }

    // 여행이 존재하는지 확인
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      throw new NotFoundException('여행을 찾을 수 없습니다.');
    }

    // 현재 사용자가 해당 여행의 멤버인지 확인
    const membership = await this.prisma.tripMember.findUnique({
      where: {
        userId_tripId: {
          userId: user.id,
          tripId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('해당 여행의 멤버가 아닙니다.');
    }

    // 멤버십 정보를 request에 추가하여 컨트롤러에서 활용 가능하도록 함
    request.tripMembership = membership;

    return true;
  }
}
