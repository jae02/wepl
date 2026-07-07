import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ScheduleService } from './schedule.service';

@Controller('api/v1/schedules/my')
@UseGuards(JwtAuthGuard)
export class MyScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  /**
   * GET /api/v1/schedules/my?date=2026-01-15
   * 사용자가 속한 모든 여행의 특정 날짜 일정 목록 조회
   */
  @Get()
  async getMySchedules(
    @CurrentUser('id') userId: string,
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

    return this.scheduleService.getMySchedulesByDate(userId, date);
  }
}
