// =============================================================================
// ExpenseModule - 경비 모듈
// =============================================================================

import { Module } from '@nestjs/common';
import { ExpenseController } from './expense.controller';
import { ExpenseService } from './expense.service';
import { TripMemberGuard } from '../trip/guards/trip-member.guard';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [SyncModule],
  controllers: [ExpenseController],
  providers: [ExpenseService, TripMemberGuard],
  exports: [ExpenseService],
})
export class ExpenseModule {}
