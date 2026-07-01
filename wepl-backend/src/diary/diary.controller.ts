// =============================================================================
// DiaryController - 다이어리 REST API 엔드포인트
// 다이어리 엔트리는 일정(TimelineSchedule)에 귀속되며, 여행 멤버만 접근 가능
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DiaryService } from './diary.service';
import { CreateDiaryDto } from './dto/create-diary.dto';
import { UpdateDiaryDto } from './dto/update-diary.dto';
import { AddDiaryPhotoDto } from './dto/add-diary-photo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TripMemberGuard } from '../trip/guards/trip-member.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/v1/trips/:tripId')
@UseGuards(JwtAuthGuard, TripMemberGuard)
export class DiaryController {
  constructor(private readonly diaryService: DiaryService) {}

  /**
   * POST /api/v1/trips/:tripId/schedules/:scheduleId/diary
   * 일정에 다이어리 엔트리 생성
   */
  @Post('schedules/:scheduleId/diary')
  async create(
    @Param('scheduleId') scheduleId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateDiaryDto,
  ) {
    return this.diaryService.create(scheduleId, user.id, dto);
  }

  /**
   * GET /api/v1/trips/:tripId/schedules/:scheduleId/diary
   * 일정의 모든 다이어리 엔트리 조회
   */
  @Get('schedules/:scheduleId/diary')
  async findAll(@Param('scheduleId') scheduleId: string) {
    return this.diaryService.findAllBySchedule(scheduleId);
  }

  /**
   * GET /api/v1/trips/:tripId/diary/:diaryId
   * 단일 다이어리 엔트리 조회
   */
  @Get('diary/:diaryId')
  async findOne(@Param('diaryId') diaryId: string) {
    return this.diaryService.findOne(diaryId);
  }

  /**
   * PATCH /api/v1/trips/:tripId/diary/:diaryId
   * 다이어리 엔트리 수정 (작성자 본인만 가능)
   */
  @Patch('diary/:diaryId')
  async update(
    @Param('diaryId') diaryId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateDiaryDto,
  ) {
    return this.diaryService.update(diaryId, user.id, dto);
  }

  /**
   * DELETE /api/v1/trips/:tripId/diary/:diaryId
   * 다이어리 엔트리 삭제 (작성자 본인만 가능)
   */
  @Delete('diary/:diaryId')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('diaryId') diaryId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.diaryService.remove(diaryId, user.id);
  }

  /**
   * POST /api/v1/trips/:tripId/diary/:diaryId/photos
   * 다이어리에 사진 추가
   */
  @Post('diary/:diaryId/photos')
  async addPhoto(
    @Param('diaryId') diaryId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: AddDiaryPhotoDto,
  ) {
    return this.diaryService.addPhoto(diaryId, user.id, dto);
  }

  /**
   * DELETE /api/v1/trips/:tripId/diary/photos/:photoId
   * 다이어리 사진 삭제 (업로더 본인만 가능)
   */
  @Delete('diary/photos/:photoId')
  @HttpCode(HttpStatus.OK)
  async removePhoto(
    @Param('photoId') photoId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.diaryService.removePhoto(photoId, user.id);
  }
}
