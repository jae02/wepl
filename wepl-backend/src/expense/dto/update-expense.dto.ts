// =============================================================================
// UpdateExpenseDto - 경비 수정 요청 DTO
// CreateExpenseDto에서 splitUserIds를 제외한 나머지 필드를 선택적으로 허용
// 정산 분배(splits)는 수정 불가 — 삭제 후 재생성 필요
// =============================================================================

import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateExpenseDto } from './create-expense.dto';

export class UpdateExpenseDto extends PartialType(
  OmitType(CreateExpenseDto, ['splitUserIds'] as const),
) {}
