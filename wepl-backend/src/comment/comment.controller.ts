// =============================================================================
// CommentController - 댓글 / 꿀팁 스레드 REST API 엔드포인트
// 댓글은 위시리스트 장소에 귀속되며, 여행 멤버만 접근 가능
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TripMemberGuard } from '../trip/guards/trip-member.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/v1/trips/:tripId')
@UseGuards(JwtAuthGuard, TripMemberGuard)
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  /**
   * POST /api/v1/trips/:tripId/wishlist/:wishlistId/comments
   * 위시리스트 장소에 댓글 생성 (대댓글 시 parentId 포함)
   */
  @Post('wishlist/:wishlistId/comments')
  async create(
    @Param('wishlistId') wishlistPlaceId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentService.create(wishlistPlaceId, user.id, dto);
  }

  /**
   * GET /api/v1/trips/:tripId/wishlist/:wishlistId/comments
   * 위시리스트 장소의 모든 댓글 조회 (최상위 + 대댓글 중첩)
   */
  @Get('wishlist/:wishlistId/comments')
  async findAll(@Param('wishlistId') wishlistPlaceId: string) {
    return this.commentService.findAllByWishlistPlace(wishlistPlaceId);
  }

  /**
   * PATCH /api/v1/trips/:tripId/comments/:commentId
   * 댓글 수정 (작성자 본인만 가능)
   */
  @Patch('comments/:commentId')
  async update(
    @Param('commentId') commentId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentService.update(commentId, user.id, dto);
  }

  /**
   * DELETE /api/v1/trips/:tripId/comments/:commentId
   * 댓글 삭제 (작성자 본인만 가능, 부모 댓글 삭제 시 대댓글도 삭제)
   */
  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('commentId') commentId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.commentService.remove(commentId, user.id);
  }
}
