// =============================================================================
// UpdateCommentDto - 댓글 수정 요청 DTO
// content는 수정 시 항상 필수 (PartialType 사용하지 않음)
// =============================================================================

import { IsString, MinLength, MaxLength } from 'class-validator';

export class UpdateCommentDto {
  /** 수정할 댓글 내용 (1 ~ 2000자) */
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}
