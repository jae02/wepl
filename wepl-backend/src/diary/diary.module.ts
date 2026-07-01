// =============================================================================
// DiaryModule - 다이어리 모듈
// =============================================================================

import { Module } from '@nestjs/common';
import { DiaryController } from './diary.controller';
import { DiaryService } from './diary.service';
import { TripMemberGuard } from '../trip/guards/trip-member.guard';

@Module({
  controllers: [DiaryController],
  providers: [DiaryService, TripMemberGuard],
  exports: [DiaryService],
})
export class DiaryModule {}
