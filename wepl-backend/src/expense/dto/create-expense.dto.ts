// =============================================================================
// CreateExpenseDto - 경비 생성 요청 DTO
// =============================================================================

import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  IsDateString,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { ExpenseCategory } from '@prisma/client';

export class CreateExpenseDto {
  /** 경비 설명 (필수, 1~200자) */
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description: string;

  /** 금액 (필수, 소수점 2자리까지) */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;

  /** 카테고리 (필수) */
  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  /** 통화 코드 (선택, 기본값 KRW) */
  @IsOptional()
  @IsString()
  currency?: string;

  /** 연결할 일정 ID (선택) */
  @IsOptional()
  @IsString()
  scheduleId?: string;

  /** 영수증 이미지 URL (선택) */
  @IsOptional()
  @IsString()
  receiptImageUrl?: string;

  /** 결제 일시 (선택, ISO 날짜 문자열) */
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  /**
   * 정산 대상 사용자 ID 목록 (선택)
   * 미지정 시 여행 멤버 전원으로 균등 분배
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  splitUserIds?: string[];
}
