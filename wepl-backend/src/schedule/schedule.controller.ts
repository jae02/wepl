// =============================================================================
// ScheduleController - 타임라인 일정 REST API 엔드포인트
// Base path: /api/v1/trips/:tripId/schedules
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ReorderScheduleDto } from './dto/reorder-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TripMemberGuard } from '../trip/guards/trip-member.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ScheduleStatus } from '@prisma/client';

@Controller('api/v1/trips/:tripId/schedules')
@UseGuards(JwtAuthGuard, TripMemberGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  /**
   * POST /api/v1/trips/:tripId/schedules
   * 새 타임라인 일정 생성
   */
  @Post()
  async create(
    @Param('tripId') tripId: string,
    @Body() dto: CreateScheduleDto,
  ) {
    return this.scheduleService.create(tripId, dto);
  }

  /**
   * GET /api/v1/trips/:tripId/schedules/dates
   * 일정이 있는 날짜 목록 조회 (캘린더 뷰 용)
   * 주의: :scheduleId 파라미터를 사용하는 라우트보다 먼저 선언해야 함
   */
  @Get('dates')
  async getDates(@Param('tripId') tripId: string) {
    return this.scheduleService.getDates(tripId);
  }

  /**
   * GET /api/v1/trips/:tripId/schedules?date=2026-01-15
   * 특정 날짜의 일정 목록 조회
   */
  @Get()
  async findAllByDate(
    @Param('tripId') tripId: string,
    @Query('date') dateStr: string,
  ) {
    if (!dateStr) {
      throw new BadRequestException(
        'date 쿼리 파라미터는 필수입니다. (예: ?date=2026-01-15)',
      );
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('올바른 날짜 형식이 아닙니다.');
    }

    return this.scheduleService.findAllByTripAndDate(tripId, date);
  }

  /**
   * GET /api/v1/trips/:tripId/schedules/:scheduleId
   * 일정 상세 조회
   */
  @Get(':scheduleId')
  async findOne(@Param('scheduleId') scheduleId: string) {
    return this.scheduleService.findOne(scheduleId);
  }

  /**
   * PATCH /api/v1/trips/:tripId/schedules/:scheduleId
   * 일정 수정
   */
  @Patch(':scheduleId')
  async update(
    @Param('scheduleId') scheduleId: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.scheduleService.update(scheduleId, dto);
  }

  /**
   * PATCH /api/v1/trips/:tripId/schedules/:scheduleId/status
   * 일정 상태만 변경 (PLANNED → ONGOING → COMPLETED / SKIPPED)
   */
  @Patch(':scheduleId/status')
  async updateStatus(
    @Param('scheduleId') scheduleId: string,
    @Body('status') status: ScheduleStatus,
  ) {
    if (!status || !Object.values(ScheduleStatus).includes(status)) {
      throw new BadRequestException(
        '올바른 상태값이 아닙니다. (PLANNED, ONGOING, COMPLETED, SKIPPED)',
      );
    }

    return this.scheduleService.updateStatus(scheduleId, status);
  }

  /**
   * DELETE /api/v1/trips/:tripId/schedules/:scheduleId
   * 일정 삭제
   */
  @Delete(':scheduleId')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('scheduleId') scheduleId: string) {
    return this.scheduleService.remove(scheduleId);
  }

  /**
   * PUT /api/v1/trips/:tripId/schedules/reorder?date=2026-01-15
   * 같은 날짜 내 일정 순서 재정렬 (드래그 앤 드롭)
   */
  @Put('reorder')
  async reorder(
    @Param('tripId') tripId: string,
    @Query('date') dateStr: string,
    @Body() dto: ReorderScheduleDto,
  ) {
    if (!dateStr) {
      throw new BadRequestException(
        'date 쿼리 파라미터는 필수입니다. (예: ?date=2026-01-15)',
      );
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('올바른 날짜 형식이 아닙니다.');
    }

    return this.scheduleService.reorder(tripId, date, dto.items);
  }
}
