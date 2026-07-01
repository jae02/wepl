// =============================================================================
// WishlistQueryDto - 위시리스트 목록 필터링 쿼리 DTO
// 카테고리, 타임라인 배치 여부로 필터링 가능
// =============================================================================

import { IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { PlaceCategory } from '@prisma/client';

export class WishlistQueryDto {
  /** 카테고리 필터 (선택) */
  @IsOptional()
  @IsEnum(PlaceCategory, {
    message: `카테고리는 다음 중 하나여야 합니다: ${Object.values(PlaceCategory).join(', ')}`,
  })
  category?: PlaceCategory;

  /** 타임라인 배치 여부 필터 (선택) - 쿼리스트링 "true"/"false" → boolean 변환 */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'isPlaced는 true 또는 false여야 합니다.' })
  isPlaced?: boolean;
}
