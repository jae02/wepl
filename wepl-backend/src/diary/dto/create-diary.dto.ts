// =============================================================================
// CreateDiaryDto - 다이어리 엔트리 생성 요청 DTO
// =============================================================================

import { IsString, MaxLength, IsOptional, IsEnum } from 'class-validator';
import { Mood } from '@prisma/client';

export class CreateDiaryDto {
  /** 다이어리 내용 (최대 5000자, 선택) */
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  /** 기분 (선택) */
  @IsOptional()
  @IsEnum(Mood)
  mood?: Mood;
}
