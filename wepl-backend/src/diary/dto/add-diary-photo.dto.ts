// =============================================================================
// AddDiaryPhotoDto - 다이어리 사진 추가 요청 DTO
// =============================================================================

import {
  IsString,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';

export class AddDiaryPhotoDto {
  /** 이미지 URL (필수) */
  @IsString()
  imageUrl: string;

  /** 썸네일 URL (선택) */
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  /** 사진 캡션 (최대 500자, 선택) */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;

  /** 정렬 순서 (기본값 0) */
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number = 0;
}
