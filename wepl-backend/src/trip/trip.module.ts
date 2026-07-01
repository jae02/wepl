// =============================================================================
// TripModule - 여행 모듈
// =============================================================================

import { Module } from '@nestjs/common';
import { TripController } from './trip.controller';
import { TripService } from './trip.service';
import { TripMemberGuard } from './guards/trip-member.guard';

@Module({
  controllers: [TripController],
  providers: [TripService, TripMemberGuard],
  exports: [TripService],
})
export class TripModule {}
