// =============================================================================
// CommentModule - 댓글 모듈
// =============================================================================

import { Module } from '@nestjs/common';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { TripMemberGuard } from '../trip/guards/trip-member.guard';

@Module({
  controllers: [CommentController],
  providers: [CommentService, TripMemberGuard],
  exports: [CommentService],
})
export class CommentModule {}
