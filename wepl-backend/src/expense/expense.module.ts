// =============================================================================
// ExpenseModule - 경비 모듈
// =============================================================================

import { Module } from '@nestjs/common';
import { ExpenseController } from './expense.controller';
import { ExpenseService } from './expense.service';
import { TripMemberGuard } from '../trip/guards/trip-member.guard';

@Module({
  controllers: [ExpenseController],
  providers: [ExpenseService, TripMemberGuard],
  exports: [ExpenseService],
})
export class ExpenseModule {}
