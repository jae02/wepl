// =============================================================================
// CreateChecklistDto - 체크리스트 항목 생성 요청 DTO
// =============================================================================

import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';

export class CreateChecklistDto {
  /** 체크리스트 항목 내용 (1 ~ 500자) */
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content: string;

  /** 담당자 사용자 ID (선택) */
  @IsOptional()
  @IsString()
  assignedToUserId?: string;

  /** 정렬 순서 (기본값 0) */
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number = 0;
}
