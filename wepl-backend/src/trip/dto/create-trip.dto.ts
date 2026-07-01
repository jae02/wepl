// =============================================================================
// CreateTripDto - 여행 생성 요청 DTO
// =============================================================================

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateTripDto {
  /** 여행 제목 (필수) - 예: "오사카 먹방 투어 2026" */
  @IsString()
  @IsNotEmpty({ message: '여행 제목은 필수입니다.' })
  @MaxLength(100, { message: '여행 제목은 100자 이내여야 합니다.' })
  title: string;

  /** 테마 태그 (선택) - 예: "먹방", "힐링", "액티비티" */
  @IsString()
  @IsOptional()
  @MaxLength(50)
  theme?: string;

  /** 여행 시작일 (선택) - ISO 8601 형식 */
  @IsDateString({}, { message: '올바른 날짜 형식이 아닙니다.' })
  @IsOptional()
  startDate?: string;

  /** 여행 종료일 (선택) - ISO 8601 형식 */
  @IsDateString({}, { message: '올바른 날짜 형식이 아닙니다.' })
  @IsOptional()
  endDate?: string;

  /** 여행지 타임존 (선택) - 기본값: "Asia/Seoul" */
  @IsString()
  @IsOptional()
  timezone?: string;

  /** 기본 통화 (선택) - 기본값: "KRW" */
  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string;
}
