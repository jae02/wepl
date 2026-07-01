// =============================================================================
// DiaryService - 다이어리 비즈니스 로직
// =============================================================================

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiaryDto } from './dto/create-diary.dto';
import { UpdateDiaryDto } from './dto/update-diary.dto';
import { AddDiaryPhotoDto } from './dto/add-diary-photo.dto';

/** 다이어리 엔트리에 포함할 사용자 정보 select 옵션 */
const USER_SELECT = {
  id: true,
  nickname: true,
  profileImageUrl: true,
} as const;

/** 다이어리 조회 시 포함할 사진 정보 */
const PHOTOS_INCLUDE = {
  photos: {
    orderBy: { orderIndex: 'asc' as const },
  },
} as const;

@Injectable()
export class DiaryService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // 다이어리 엔트리 생성
  // ---------------------------------------------------------------------------
  async create(scheduleId: string, userId: string, dto: CreateDiaryDto) {
    return this.prisma.diaryEntry.create({
      data: {
        scheduleId,
        userId,
        content: dto.content ?? null,
        mood: dto.mood ?? null,
      },
      include: {
        user: { select: USER_SELECT },
        ...PHOTOS_INCLUDE,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 스케줄에 속한 모든 다이어리 엔트리 조회
  // ---------------------------------------------------------------------------
  async findAllBySchedule(scheduleId: string) {
    return this.prisma.diaryEntry.findMany({
      where: { scheduleId },
      include: {
        user: { select: USER_SELECT },
        ...PHOTOS_INCLUDE,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ---------------------------------------------------------------------------
  // 단일 다이어리 엔트리 조회
  // ---------------------------------------------------------------------------
  async findOne(id: string) {
    const entry = await this.prisma.diaryEntry.findUnique({
      where: { id },
      include: {
        user: { select: USER_SELECT },
        ...PHOTOS_INCLUDE,
      },
    });

    if (!entry) {
      throw new NotFoundException('다이어리 엔트리를 찾을 수 없습니다.');
    }

    return entry;
  }

  // ---------------------------------------------------------------------------
  // 다이어리 엔트리 수정 (작성자만 가능)
  // ---------------------------------------------------------------------------
  async update(id: string, userId: string, dto: UpdateDiaryDto) {
    const entry = await this.prisma.diaryEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      throw new NotFoundException('다이어리 엔트리를 찾을 수 없습니다.');
    }

    // 작성자 본인만 수정 가능
    if (entry.userId !== userId) {
      throw new ForbiddenException(
        '본인이 작성한 다이어리만 수정할 수 있습니다.',
      );
    }

    return this.prisma.diaryEntry.update({
      where: { id },
      data: {
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.mood !== undefined && { mood: dto.mood }),
      },
      include: {
        user: { select: USER_SELECT },
        ...PHOTOS_INCLUDE,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 다이어리 엔트리 삭제 (작성자만 가능, 관련 사진도 함께 삭제)
  // ---------------------------------------------------------------------------
  async remove(id: string, userId: string) {
    const entry = await this.prisma.diaryEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      throw new NotFoundException('다이어리 엔트리를 찾을 수 없습니다.');
    }

    // 작성자 본인만 삭제 가능
    if (entry.userId !== userId) {
      throw new ForbiddenException(
        '본인이 작성한 다이어리만 삭제할 수 있습니다.',
      );
    }

    // 다이어리에 속한 사진을 먼저 삭제한 후 엔트리 삭제
    await this.prisma.$transaction(async (tx) => {
      await tx.diaryPhoto.deleteMany({
        where: { diaryEntryId: id },
      });

      await tx.diaryEntry.delete({
        where: { id },
      });
    });

    return { message: '다이어리가 삭제되었습니다.' };
  }

  // ---------------------------------------------------------------------------
  // 다이어리에 사진 추가
  // ---------------------------------------------------------------------------
  async addPhoto(diaryEntryId: string, userId: string, dto: AddDiaryPhotoDto) {
    // 다이어리 엔트리 존재 여부 확인
    const entry = await this.prisma.diaryEntry.findUnique({
      where: { id: diaryEntryId },
    });

    if (!entry) {
      throw new NotFoundException('다이어리 엔트리를 찾을 수 없습니다.');
    }

    return this.prisma.diaryPhoto.create({
      data: {
        diaryEntryId,
        uploadedById: userId,
        imageUrl: dto.imageUrl,
        thumbnailUrl: dto.thumbnailUrl ?? null,
        caption: dto.caption ?? null,
        orderIndex: dto.orderIndex ?? 0,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 다이어리 사진 삭제 (업로더 본인만 가능)
  // ---------------------------------------------------------------------------
  async removePhoto(photoId: string, userId: string) {
    const photo = await this.prisma.diaryPhoto.findUnique({
      where: { id: photoId },
    });

    if (!photo) {
      throw new NotFoundException('사진을 찾을 수 없습니다.');
    }

    // 업로더 본인만 삭제 가능
    if (photo.uploadedById !== userId) {
      throw new ForbiddenException(
        '본인이 업로드한 사진만 삭제할 수 있습니다.',
      );
    }

    await this.prisma.diaryPhoto.delete({
      where: { id: photoId },
    });

    return { message: '사진이 삭제되었습니다.' };
  }
}
