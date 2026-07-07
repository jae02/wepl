// =============================================================================
// ScheduleService - 타임라인 일정 비즈니스 로직
// 생성, 조회, 수정, 삭제, 상태 변경, 재정렬, 날짜 목록 조회
// =============================================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ReorderItemDto } from './dto/reorder-schedule.dto';
import { ScheduleStatus } from '@prisma/client';
import { SyncGateway } from '../sync/sync.gateway';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncGateway: SyncGateway,
  ) {}

  /**
   * 타임라인 일정 생성
   * wishlistPlaceId가 있으면 해당 장소가 같은 여행에 속하는지 검증하고 isPlaced=true로 변경
   */
  async create(tripId: string, dto: CreateScheduleDto) {
    // 위시리스트 장소 연결 시 유효성 검증
    if (dto.wishlistPlaceId) {
      const wishlistPlace = await this.prisma.wishlistPlace.findUnique({
        where: { id: dto.wishlistPlaceId },
      });

      if (!wishlistPlace) {
        throw new NotFoundException('위시리스트 장소를 찾을 수 없습니다.');
      }

      if (wishlistPlace.tripId !== tripId) {
        throw new BadRequestException(
          '해당 위시리스트 장소는 이 여행에 속하지 않습니다.',
        );
      }
    }

    const { date, endDate, ...rest } = dto;

    // 숙소인 경우 날짜 중복 검사 (하루에 하나만 등록)
    if (dto.isAccommodation) {
      const startDateObj = new Date(date);
      const endDateObj = endDate ? new Date(endDate) : new Date(date);

      const overlapping = await this.prisma.timelineSchedule.findFirst({
        where: {
          tripId,
          isAccommodation: true,
          OR: [
            {
              date: { lte: endDateObj },
              endDate: { gte: startDateObj },
            },
            {
              date: { lte: endDateObj },
              endDate: null,
              // date >= startDateObj implies it falls within the range
              // Since endDate is null, it's just a single day accommodation.
              // A single day accommodation at `date` overlaps if `startDateObj <= date <= endDateObj`
            }
          ]
        }
      });

      // 만약 겹치는 숙소가 있다면 예외 발생
      // (정확한 쿼리를 위해 위 OR 조건을 개선)
      const existingAccommodations = await this.prisma.timelineSchedule.findMany({
        where: { tripId, isAccommodation: true }
      });
      const hasOverlap = existingAccommodations.some(acc => {
        const accStart = new Date(acc.date);
        const accEnd = acc.endDate ? new Date(acc.endDate) : new Date(acc.date);
        return accStart <= endDateObj && accEnd >= startDateObj;
      });

      if (hasOverlap) {
        throw new BadRequestException('해당 날짜에 이미 등록된 숙소가 있습니다. 기존 숙소를 먼저 삭제해 주세요.');
      }
    }

    const schedule = await this.prisma.$transaction(async (tx) => {
      // 일정 생성 (숙소든 아니든 단일 레코드로 생성, endDate 활용)
      const newSchedule = await tx.timelineSchedule.create({
        data: {
          tripId,
          date: new Date(date),
          endDate: endDate ? new Date(endDate) : undefined,
          ...rest,
          isAccommodation: dto.isAccommodation || false,
        },
      });

      // 위시리스트 장소의 isPlaced 상태 업데이트
      if (dto.wishlistPlaceId) {
        await tx.wishlistPlace.update({
          where: { id: dto.wishlistPlaceId },
          data: { isPlaced: true },
        });
      }

      return newSchedule;
    });

    this.logger.log(
      `일정 생성 완료: ${schedule.id} (tripId: ${tripId}, date: ${date}, isAccommodation: ${dto.isAccommodation})`,
    );

    this.syncGateway.server.to(`trip_${tripId}`).emit('scheduleUpdated');

    return schedule;
  }

  /**
   * 특정 여행의 특정 날짜 일정 목록 조회
   * orderIndex 기준 정렬, 위시리스트 장소 정보 및 관련 항목 수 포함
   */
  async findAllByTripAndDate(tripId: string, date: Date) {
    return this.prisma.timelineSchedule.findMany({
      where: {
        tripId,
        OR: [
          { date },
          { 
            date: { lte: date },
            endDate: { gte: date }
          }
        ]
      },
      include: {
        wishlistPlace: {
          select: {
            id: true,
            name: true,
            address: true,
            imageUrl: true,
            category: true,
            latitude: true,
            longitude: true,
          },
        },
        _count: {
          select: {
            checklistItems: true,
            diaryEntries: true,
          },
        },
      },
      orderBy: { orderIndex: 'asc' },
    });
  }

  /**
   * 특정 사용자가 속한 모든 여행에서 특정 날짜의 일정 목록 조회
   * orderIndex 기준 정렬, 위시리스트 장소 정보, 여행 정보 포함
   */
  async getMySchedulesByDate(userId: string, date: Date) {
    return this.prisma.timelineSchedule.findMany({
      where: {
        OR: [
          { date },
          { 
            date: { lte: date },
            endDate: { gte: date }
          }
        ],
        trip: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
      include: {
        trip: {
          select: {
            id: true,
            title: true,
            theme: true,
          },
        },
        wishlistPlace: {
          select: {
            id: true,
            name: true,
            address: true,
            imageUrl: true,
            category: true,
            latitude: true,
            longitude: true,
          },
        },
        _count: {
          select: { checklistItems: true, diaryEntries: true },
        },
      },
      orderBy: [
        { tripId: 'asc' },
        { orderIndex: 'asc' },
      ],
    });
  }

  /**
   * 일정 단건 조회 (상세)
   * 위시리스트 장소, 체크리스트, 다이어리 항목 포함
   */
  async findOne(id: string) {
    const schedule = await this.prisma.timelineSchedule.findUnique({
      where: { id },
      include: {
        wishlistPlace: {
          select: {
            id: true,
            name: true,
            address: true,
            imageUrl: true,
            category: true,
            latitude: true,
            longitude: true,
          },
        },
        checklistItems: {
          orderBy: { orderIndex: 'asc' },
        },
        diaryEntries: {
          include: {
            photos: {
              orderBy: { orderIndex: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException('일정을 찾을 수 없습니다.');
    }

    return schedule;
  }

  /**
   * 일정 수정
   * PartialType에서 오는 필드를 안전하게 매핑 (as any 패턴)
   */
  async update(id: string, dto: UpdateScheduleDto) {
    const existing = await this.prisma.timelineSchedule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('일정을 찾을 수 없습니다.');
    }

    // PartialType에서 오는 필드를 안전하게 매핑
    const { date, endDate, ...rest } = dto as any;
    const data: Record<string, any> = { ...rest };
    if (date !== undefined) data.date = new Date(date);
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;

    const updated = await this.prisma.timelineSchedule.update({
      where: { id },
      data,
    });

    this.syncGateway.server.to(`trip_${existing.tripId}`).emit('scheduleUpdated');

    return updated;
  }

  /**
   * 일정 상태만 변경 (PLANNED → ONGOING → COMPLETED 등)
   */
  async updateStatus(id: string, status: ScheduleStatus) {
    const existing = await this.prisma.timelineSchedule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('일정을 찾을 수 없습니다.');
    }

    const updated = await this.prisma.timelineSchedule.update({
      where: { id },
      data: { status },
    });

    this.syncGateway.server.to(`trip_${existing.tripId}`).emit('scheduleUpdated');

    return updated;
  }

  /**
   * 일정 삭제
   * 연결된 위시리스트 장소가 있으면 isPlaced=false로 복원
   */
  async remove(id: string) {
    const existing = await this.prisma.timelineSchedule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('일정을 찾을 수 없습니다.');
    }

    await this.prisma.$transaction(async (tx) => {
      // 일정 삭제
      await tx.timelineSchedule.delete({
        where: { id },
      });

      // 위시리스트 장소의 isPlaced 상태 복원
      if (existing.wishlistPlaceId) {
        // 같은 위시리스트 장소를 참조하는 다른 일정이 있는지 확인
        const otherSchedules = await tx.timelineSchedule.count({
          where: {
            wishlistPlaceId: existing.wishlistPlaceId,
            id: { not: id },
          },
        });

        // 다른 일정에서 참조하지 않을 때만 isPlaced=false로 변경
        if (otherSchedules === 0) {
          await tx.wishlistPlace.update({
            where: { id: existing.wishlistPlaceId },
            data: { isPlaced: false },
          });
        }
      }
    });

    this.logger.log(`일정 삭제 완료: ${id}`);

    this.syncGateway.server.to(`trip_${existing.tripId}`).emit('scheduleUpdated');

    return { deleted: true };
  }

  /**
   * 같은 날짜 내 일정 순서 재정렬 (드래그 앤 드롭)
   * 트랜잭션으로 여러 일정의 orderIndex를 한 번에 업데이트
   */
  async reorder(tripId: string, date: Date, items: ReorderItemDto[]) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.timelineSchedule.update({
          where: { id: item.id },
          data: { orderIndex: item.orderIndex },
        }),
      ),
    );

    this.logger.log(
      `일정 재정렬 완료: tripId=${tripId}, date=${date.toISOString()}, ${items.length}개 항목`,
    );

    this.syncGateway.server.to(`trip_${tripId}`).emit('scheduleUpdated');

    // 재정렬 후 해당 날짜의 일정 목록 반환
    return this.findAllByTripAndDate(tripId, date);
  }

  /**
   * 두 일정의 순서(orderIndex)를 맞바꿈 (위/아래 화살표 이동)
   */
  async swap(id: string, targetId: string) {
    if (id === targetId) {
      throw new BadRequestException('같은 일정끼리는 순서를 바꿀 수 없습니다.');
    }

    const [schedule1, schedule2] = await Promise.all([
      this.prisma.timelineSchedule.findUnique({ where: { id } }),
      this.prisma.timelineSchedule.findUnique({ where: { id: targetId } }),
    ]);

    if (!schedule1 || !schedule2) {
      throw new NotFoundException('일정을 찾을 수 없습니다.');
    }

    if (
      schedule1.tripId !== schedule2.tripId ||
      schedule1.date.getTime() !== schedule2.date.getTime()
    ) {
      throw new BadRequestException(
        '같은 여행, 같은 날짜의 일정만 순서를 바꿀 수 있습니다.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.timelineSchedule.update({
        where: { id: schedule1.id },
        data: { orderIndex: schedule2.orderIndex },
      }),
      this.prisma.timelineSchedule.update({
        where: { id: schedule2.id },
        data: { orderIndex: schedule1.orderIndex },
      }),
    ]);

    this.logger.log(`일정 순서 맞바꿈 완료: ${schedule1.id} <-> ${schedule2.id}`);

    this.syncGateway.server.to(`trip_${schedule1.tripId}`).emit('scheduleUpdated');

    return { success: true };
  }

  /**
   * 특정 여행에서 일정이 있는 날짜 목록 조회 (캘린더 뷰 용)
   * 중복 제거된 날짜 목록 반환
   */
  async getDates(tripId: string) {
    const schedules = await this.prisma.timelineSchedule.findMany({
      where: { tripId },
      select: { date: true },
      distinct: ['date'],
      orderBy: { date: 'asc' },
    });

    return schedules.map((s) => s.date);
  }
}
