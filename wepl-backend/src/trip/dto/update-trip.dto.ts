// =============================================================================
// UpdateTripDto - 여행 수정 요청 DTO
// PartialType을 사용하여 모든 필드를 선택적으로 만듦
// =============================================================================

import { PartialType } from '@nestjs/mapped-types';
import { CreateTripDto } from './create-trip.dto';

export class UpdateTripDto extends PartialType(CreateTripDto) {}
