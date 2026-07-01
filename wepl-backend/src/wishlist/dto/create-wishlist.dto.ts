// =============================================================================
// CreateWishlistDto - 위시리스트 장소 생성 DTO
// 장소 이름은 필수, 나머지 세부 정보는 선택적으로 입력
// =============================================================================

import {
  IsString,
  IsEnum,
  IsOptional,
  IsUrl,
  IsNumber,
  IsInt,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { PlaceCategory } from '@prisma/client';

export class CreateWishlistDto {
  /** 장소 이름 (필수) */
  @IsString()
  @MinLength(1, { message: '장소 이름은 최소 1자 이상이어야 합니다.' })
  @MaxLength(100, { message: '장소 이름은 최대 100자까지 가능합니다.' })
  name: string;

  /** 카테고리 (필수) */
  @IsEnum(PlaceCategory, {
    message: `카테고리는 다음 중 하나여야 합니다: ${Object.values(PlaceCategory).join(', ')}`,
  })
  category: PlaceCategory;

  /** 주소 (선택) */
  @IsOptional()
  @IsString()
  address?: string;

  /** 설명 / 메모 (선택) */
  @IsOptional()
  @IsString()
  description?: string;

  /** 대표 이미지 URL (선택) */
  @IsOptional()
  @IsUrl({}, { message: '유효한 이미지 URL을 입력해 주세요.' })
  imageUrl?: string;

  /** 외부 링크 - 네이버/구글 맵 등 (선택) */
  @IsOptional()
  @IsUrl({}, { message: '유효한 외부 URL을 입력해 주세요.' })
  externalUrl?: string;

  /** Google Places API ID (선택) */
  @IsOptional()
  @IsString()
  googlePlaceId?: string;

  /** 위도 (선택) */
  @IsOptional()
  @IsNumber({}, { message: '위도는 숫자여야 합니다.' })
  latitude?: number;

  /** 경도 (선택) */
  @IsOptional()
  @IsNumber({}, { message: '경도는 숫자여야 합니다.' })
  longitude?: number;

  /** 평점 1~5 (선택) */
  @IsOptional()
  @IsNumber({}, { message: '평점은 숫자여야 합니다.' })
  @Min(1, { message: '평점은 최소 1 이상이어야 합니다.' })
  @Max(5, { message: '평점은 최대 5까지 가능합니다.' })
  rating?: number;

  /** 가격대 1~4 (선택) */
  @IsOptional()
  @IsInt({ message: '가격대는 정수여야 합니다.' })
  @Min(1, { message: '가격대는 최소 1 이상이어야 합니다.' })
  @Max(4, { message: '가격대는 최대 4까지 가능합니다.' })
  priceLevel?: number;
}
