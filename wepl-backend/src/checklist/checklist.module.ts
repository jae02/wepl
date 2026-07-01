// =============================================================================
// ChecklistModule - 체크리스트 모듈
// =============================================================================

import { Module } from '@nestjs/common';
import { ChecklistController } from './checklist.controller';
import { ChecklistService } from './checklist.service';
import { TripMemberGuard } from '../trip/guards/trip-member.guard';

@Module({
  controllers: [ChecklistController],
  providers: [ChecklistService, TripMemberGuard],
  exports: [ChecklistService],
})
export class ChecklistModule {}
