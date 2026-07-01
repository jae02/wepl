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

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(private readonly prisma: PrismaService) {}

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

    const { date, ...rest } = dto;

    const schedule = await this.prisma.$transaction(async (tx) => {
      // 일정 생성
      const newSchedule = await tx.timelineSchedule.create({
        data: {
          tripId,
          date: new Date(date),
          ...rest,
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
      `일정 생성 완료: ${schedule.id} (tripId: ${tripId}, date: ${date})`,
    );

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
        date,
      },
      include: {
        wishlistPlace: {
          select: {
            id: true,
            name: true,
            address: true,
            imageUrl: true,
            category: true,
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
    const { date, ...rest } = dto as any;
    const data: Record<string, any> = { ...rest };
    if (date !== undefined) data.date = new Date(date);

    return this.prisma.timelineSchedule.update({
      where: { id },
      data,
    });
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

    return this.prisma.timelineSchedule.update({
      where: { id },
      data: { status },
    });
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

    // 재정렬 후 해당 날짜의 일정 목록 반환
    return this.findAllByTripAndDate(tripId, date);
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
