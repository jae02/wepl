// =============================================================================
// UpdateDiaryDto - 다이어리 엔트리 수정 요청 DTO
// CreateDiaryDto의 모든 필드를 선택적으로 허용
// =============================================================================

import { PartialType } from '@nestjs/mapped-types';
import { CreateDiaryDto } from './create-diary.dto';

export class UpdateDiaryDto extends PartialType(CreateDiaryDto) {}
