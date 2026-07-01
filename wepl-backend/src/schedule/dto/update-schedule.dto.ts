// =============================================================================
// UpdateScheduleDto - 타임라인 일정 수정 요청 DTO
// PartialType을 사용하여 모든 필드를 선택적으로 만듦
// =============================================================================

import { PartialType } from '@nestjs/mapped-types';
import { CreateScheduleDto } from './create-schedule.dto';

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {}
