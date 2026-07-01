// =============================================================================
// ChecklistService - 체크리스트 비즈니스 로직
// =============================================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';

/** 체크리스트 항목에 포함할 작성자 정보 select 옵션 */
const CREATOR_SELECT = {
  id: true,
  nickname: true,
} as const;

@Injectable()
export class ChecklistService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // 체크리스트 항목 생성
  // ---------------------------------------------------------------------------
  async create(scheduleId: string, userId: string, dto: CreateChecklistDto) {
    return this.prisma.checklistItem.create({
      data: {
        scheduleId,
        createdById: userId,
        content: dto.content,
        assignedToUserId: dto.assignedToUserId ?? null,
        orderIndex: dto.orderIndex ?? 0,
      },
      include: {
        createdBy: { select: CREATOR_SELECT },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 스케줄에 속한 모든 체크리스트 항목 조회 (orderIndex 기준 정렬)
  // ---------------------------------------------------------------------------
  async findAllBySchedule(scheduleId: string) {
    return this.prisma.checklistItem.findMany({
      where: { scheduleId },
      include: {
        createdBy: { select: CREATOR_SELECT },
      },
      orderBy: { orderIndex: 'asc' },
    });
  }

  // ---------------------------------------------------------------------------
  // 체크리스트 항목 토글 (isChecked 반전)
  // ---------------------------------------------------------------------------
  async toggle(id: string) {
    const item = await this.prisma.checklistItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('체크리스트 항목을 찾을 수 없습니다.');
    }

    return this.prisma.checklistItem.update({
      where: { id },
      data: { isChecked: !item.isChecked },
      include: {
        createdBy: { select: CREATOR_SELECT },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 체크리스트 항목 수정 (content, assignedToUserId, orderIndex)
  // ---------------------------------------------------------------------------
  async update(id: string, dto: UpdateChecklistDto) {
    const item = await this.prisma.checklistItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('체크리스트 항목을 찾을 수 없습니다.');
    }

    return this.prisma.checklistItem.update({
      where: { id },
      data: {
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.assignedToUserId !== undefined && {
          assignedToUserId: dto.assignedToUserId,
        }),
        ...(dto.orderIndex !== undefined && { orderIndex: dto.orderIndex }),
      },
      include: {
        createdBy: { select: CREATOR_SELECT },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 체크리스트 항목 삭제
  // ---------------------------------------------------------------------------
  async remove(id: string) {
    const item = await this.prisma.checklistItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('체크리스트 항목을 찾을 수 없습니다.');
    }

    await this.prisma.checklistItem.delete({
      where: { id },
    });

    return { message: '체크리스트 항목이 삭제되었습니다.' };
  }
}
