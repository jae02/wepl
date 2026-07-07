// =============================================================================
// CreateScheduleDto - 타임라인 일정 생성 요청 DTO
// =============================================================================

import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  IsNumber,
  IsEnum,
  Min,
  Matches,
  IsBoolean,
} from 'class-validator';
import { ScheduleStatus } from '@prisma/client';

export class CreateScheduleDto {
  /** 일정 시작 날짜 (필수) - ISO 8601 형식 (예: "2026-01-15") */
  @IsDateString({}, { message: '올바른 날짜 형식이 아닙니다.' })
  date: string;

  /** 일정 종료 날짜 (선택) - ISO 8601 형식 (예: "2026-01-16") */
  @IsOptional()
  @IsDateString({}, { message: '올바른 날짜 형식이 아닙니다.' })
  endDate?: string;

  /** 위시리스트 장소 ID (선택) - 위시리스트 카드 연결 */
  @IsString()
  @IsOptional()
  wishlistPlaceId?: string;

  /** 시작 시간 (선택) - HH:MM 형식 (예: "09:00") */
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: '시작 시간은 HH:MM 형식이어야 합니다. (예: 09:00)',
  })
  startTime?: string;

  /** 종료 시간 (선택) - HH:MM 형식 (예: "11:30") */
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: '종료 시간은 HH:MM 형식이어야 합니다. (예: 11:30)',
  })
  endTime?: string;

  /** 같은 날짜 내 정렬 순서 (필수) */
  @IsInt({ message: '정렬 순서는 정수여야 합니다.' })
  @Min(0, { message: '정렬 순서는 0 이상이어야 합니다.' })
  orderIndex: number;

  /** 자유 메모 (선택) */
  @IsString()
  @IsOptional()
  memo?: string;

  /** 커스텀 제목 (선택) - 위시리스트 없이 직접 입력 시 */
  @IsString()
  @IsOptional()
  customTitle?: string;

  /** 커스텀 주소 (선택) */
  @IsString()
  @IsOptional()
  customAddress?: string;

  /** 커스텀 위도 (선택) */
  @IsNumber({}, { message: '위도는 숫자여야 합니다.' })
  @IsOptional()
  customLatitude?: number;

  /** 커스텀 경도 (선택) */
  @IsNumber({}, { message: '경도는 숫자여야 합니다.' })
  @IsOptional()
  customLongitude?: number;

  /** 일정 상태 (선택) - 기본값: PLANNED */
  @IsEnum(ScheduleStatus, {
    message: '올바른 상태값이 아닙니다. (PLANNED, ONGOING, COMPLETED, SKIPPED)',
  })
  @IsOptional()
  status?: ScheduleStatus = ScheduleStatus.PLANNED;

  /** 숙소 여부 (선택) - 기본값: false */
  @IsBoolean()
  @IsOptional()
  isAccommodation?: boolean = false;
}
