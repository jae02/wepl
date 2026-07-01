// =============================================================================
// CreateCommentDto - 댓글 생성 요청 DTO
// =============================================================================

import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class CreateCommentDto {
  /** 댓글 내용 (1 ~ 2000자) */
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;

  /** 대댓글인 경우 부모 댓글 ID */
  @IsOptional()
  @IsString()
  parentId?: string;
}
