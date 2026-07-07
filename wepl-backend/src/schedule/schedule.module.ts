// =============================================================================
// ScheduleModule - 타임라인 일정 모듈
// =============================================================================

import { Module } from '@nestjs/common';
import { ScheduleController } from './schedule.controller';
import { MyScheduleController } from './my-schedule.controller';
import { ScheduleService } from './schedule.service';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [SyncModule],
  controllers: [ScheduleController, MyScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
