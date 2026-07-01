// =============================================================================
// ReorderScheduleDto - 타임라인 일정 순서 변경 요청 DTO
// 같은 날짜 내 여러 일정의 orderIndex를 한 번에 업데이트
// =============================================================================

import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

/** 개별 재정렬 항목 */
export class ReorderItemDto {
  /** 일정 ID */
  @IsString({ message: '일정 ID는 문자열이어야 합니다.' })
  id: string;

  /** 새 정렬 순서 */
  @IsInt({ message: '정렬 순서는 정수여야 합니다.' })
  @Min(0, { message: '정렬 순서는 0 이상이어야 합니다.' })
  orderIndex: number;
}

export class ReorderScheduleDto {
  /** 재정렬할 일정 목록 */
  @IsArray({ message: '항목 목록은 배열이어야 합니다.' })
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items: ReorderItemDto[];
}
