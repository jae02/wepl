// =============================================================================
// ChecklistController - 체크리스트 REST API 엔드포인트
// 체크리스트 항목은 일정(TimelineSchedule)에 귀속되며, 여행 멤버만 접근 가능
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
import { ChecklistService } from './checklist.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TripMemberGuard } from '../trip/guards/trip-member.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/v1/trips/:tripId')
@UseGuards(JwtAuthGuard, TripMemberGuard)
export class ChecklistController {
  constructor(private readonly checklistService: ChecklistService) {}

  /**
   * POST /api/v1/trips/:tripId/schedules/:scheduleId/checklist
   * 일정에 체크리스트 항목 생성
   */
  @Post('schedules/:scheduleId/checklist')
  async create(
    @Param('scheduleId') scheduleId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateChecklistDto,
  ) {
    return this.checklistService.create(scheduleId, user.id, dto);
  }

  /**
   * GET /api/v1/trips/:tripId/schedules/:scheduleId/checklist
   * 일정의 모든 체크리스트 항목 조회
   */
  @Get('schedules/:scheduleId/checklist')
  async findAll(@Param('scheduleId') scheduleId: string) {
    return this.checklistService.findAllBySchedule(scheduleId);
  }

  /**
   * PATCH /api/v1/trips/:tripId/checklist/:itemId
   * 체크리스트 항목 수정
   */
  @Patch('checklist/:itemId')
  async update(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateChecklistDto,
  ) {
    return this.checklistService.update(itemId, dto);
  }

  /**
   * PATCH /api/v1/trips/:tripId/checklist/:itemId/toggle
   * 체크리스트 항목 체크/해제 토글
   */
  @Patch('checklist/:itemId/toggle')
  async toggle(@Param('itemId') itemId: string) {
    return this.checklistService.toggle(itemId);
  }

  /**
   * DELETE /api/v1/trips/:tripId/checklist/:itemId
   * 체크리스트 항목 삭제
   */
  @Delete('checklist/:itemId')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('itemId') itemId: string) {
    return this.checklistService.remove(itemId);
  }
}
