// =============================================================================
// UpdateChecklistDto - 체크리스트 항목 수정 요청 DTO
// CreateChecklistDto의 모든 필드를 선택적으로 허용
// =============================================================================

import { PartialType } from '@nestjs/mapped-types';
import { CreateChecklistDto } from './create-checklist.dto';

export class UpdateChecklistDto extends PartialType(CreateChecklistDto) {}
