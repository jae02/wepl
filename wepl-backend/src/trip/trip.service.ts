// =============================================================================
// TripService - 여행 비즈니스 로직
// 생성, 조회, 수정, 삭제, 초대 코드 참여, 탈퇴, 멤버 관리
// =============================================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { nanoid } from 'nanoid';
import { TripRole } from '@prisma/client';

@Injectable()
export class TripService {
  private readonly logger = new Logger(TripService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 여행 생성 + 생성자를 OWNER로 추가
   * 트랜잭션으로 원자적 처리
   */
  async create(userId: string, dto: CreateTripDto) {
    const inviteCode = nanoid(8);

    const trip = await this.prisma.$transaction(async (tx) => {
      // 여행 생성
      const newTrip = await tx.trip.create({
        data: {
          title: dto.title,
          theme: dto.theme,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          timezone: dto.timezone ?? 'Asia/Seoul',
          currency: dto.currency ?? 'KRW',
          inviteCode,
        },
      });

      // 생성자를 OWNER 멤버로 추가
      await tx.tripMember.create({
        data: {
          userId,
          tripId: newTrip.id,
          role: TripRole.OWNER,
        },
      });

      return newTrip;
    });

    this.logger.log(`여행 생성 완료: ${trip.id} (초대코드: ${inviteCode})`);

    return trip;
  }

  /**
   * 사용자가 참여 중인 모든 여행 목록 조회 (멤버 수 포함)
   */
  async findAllByUser(userId: string) {
    const memberships = await this.prisma.tripMember.findMany({
      where: { userId },
      include: {
        trip: {
          include: {
            _count: {
              select: { members: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    // 응답 형태를 정리하여 trip 정보 + 역할 + 멤버 수 반환
    return memberships.map((m) => ({
      ...m.trip,
      memberCount: m.trip._count.members,
      myRole: m.role,
    }));
  }

  /**
   * 여행 단건 조회 (멤버 목록 + 사용자 정보 포함)
   */
  async findOne(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                nickname: true,
                profileImageUrl: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('여행을 찾을 수 없습니다.');
    }

    return trip;
  }

  /**
   * 여행 정보 수정
   */
  async update(tripId: string, dto: UpdateTripDto) {
    // 여행 존재 여부 확인
    const existing = await this.prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!existing) {
      throw new NotFoundException('여행을 찾을 수 없습니다.');
    }

    // PartialType에서 오는 필드를 안전하게 매핑
    const { startDate, endDate, ...rest } = dto as any;
    const data: Record<string, any> = { ...rest };
    if (startDate !== undefined) data.startDate = new Date(startDate);
    if (endDate !== undefined) data.endDate = new Date(endDate);

    return this.prisma.trip.update({
      where: { id: tripId },
      data,
    });
  }

  /**
   * 여행 삭제 (OWNER만 가능 - 컨트롤러에서 권한 체크)
   */
  async remove(tripId: string) {
    const existing = await this.prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!existing) {
      throw new NotFoundException('여행을 찾을 수 없습니다.');
    }

    await this.prisma.trip.delete({
      where: { id: tripId },
    });

    this.logger.log(`여행 삭제 완료: ${tripId}`);

    return { deleted: true };
  }

  /**
   * 초대 코드로 여행 참여
   * 이미 참여 중인 경우 ConflictException 발생
   */
  async join(userId: string, inviteCode: string) {
    // 초대 코드로 여행 찾기
    const trip = await this.prisma.trip.findUnique({
      where: { inviteCode },
    });

    if (!trip) {
      throw new NotFoundException('유효하지 않은 초대 코드입니다.');
    }

    // 이미 참여 중인지 확인
    const existingMember = await this.prisma.tripMember.findUnique({
      where: {
        userId_tripId: {
          userId,
          tripId: trip.id,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('이미 참여 중인 여행입니다.');
    }

    // 멤버로 추가
    await this.prisma.tripMember.create({
      data: {
        userId,
        tripId: trip.id,
        role: TripRole.MEMBER,
      },
    });

    this.logger.log(`여행 참여 완료: userId=${userId}, tripId=${trip.id}`);

    return trip;
  }

  /**
   * 여행 탈퇴
   * OWNER는 탈퇴 불가 (삭제로 처리해야 함)
   */
  async leave(userId: string, tripId: string) {
    const membership = await this.prisma.tripMember.findUnique({
      where: {
        userId_tripId: {
          userId,
          tripId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('해당 여행의 멤버가 아닙니다.');
    }

    // OWNER는 탈퇴 불가
    if (membership.role === TripRole.OWNER) {
      throw new ForbiddenException(
        '방장은 여행을 탈퇴할 수 없습니다. 여행을 삭제하거나 방장을 위임해 주세요.',
      );
    }

    await this.prisma.tripMember.delete({
      where: { id: membership.id },
    });

    this.logger.log(`여행 탈퇴 완료: userId=${userId}, tripId=${tripId}`);

    return { left: true };
  }

  /**
   * 여행 멤버 목록 조회 (사용자 정보 포함)
   */
  async getMembers(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      throw new NotFoundException('여행을 찾을 수 없습니다.');
    }

    return this.prisma.tripMember.findMany({
      where: { tripId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            nickname: true,
            profileImageUrl: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }
}
