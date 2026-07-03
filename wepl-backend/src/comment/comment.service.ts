// =============================================================================
// CommentService - 댓글 / 꿀팁 스레드 비즈니스 로직
// =============================================================================

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { SyncGateway } from '../sync/sync.gateway';


/** 댓글·대댓글에 포함할 작성자 정보 select 옵션 */
const USER_SELECT = {
  id: true,
  nickname: true,
  profileImageUrl: true,
} as const;

@Injectable()
export class CommentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly syncGateway: SyncGateway,
  ) {}

  // ---------------------------------------------------------------------------
  // 댓글 생성 (대댓글 포함)
  // ---------------------------------------------------------------------------
  async create(wishlistPlaceId: string, userId: string, dto: CreateCommentDto) {
    // 부모 댓글이 지정된 경우 유효성 검증
    if (dto.parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
      });

      if (!parentComment) {
        throw new NotFoundException('부모 댓글을 찾을 수 없습니다.');
      }

      // 부모 댓글이 같은 위시리스트 장소에 속하는지 확인
      if (parentComment.wishlistPlaceId !== wishlistPlaceId) {
        throw new BadRequestException(
          '부모 댓글이 해당 위시리스트 장소에 속하지 않습니다.',
        );
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        wishlistPlaceId,
        userId,
        content: dto.content,
        parentId: dto.parentId ?? null,
      },
      include: {
        user: { select: USER_SELECT },
      },
    });

    const place = await this.prisma.wishlistPlace.findUnique({
      where: { id: wishlistPlaceId },
      select: { tripId: true },
    });
    if (place) {
      this.syncGateway.server.to(`trip_${place.tripId}`).emit('commentUpdated');
    }

    return comment;
  }

  // ---------------------------------------------------------------------------
  // 위시리스트 장소의 모든 댓글 조회 (최상위 + 대댓글 중첩)
  // ---------------------------------------------------------------------------
  async findAllByWishlistPlace(wishlistPlaceId: string) {
    // 최상위 댓글만 조회 (parentId === null)
    // 대댓글은 replies 관계를 통해 중첩하여 포함
    return this.prisma.comment.findMany({
      where: {
        wishlistPlaceId,
        parentId: null, // 최상위 댓글만
      },
      include: {
        user: { select: USER_SELECT },
        replies: {
          include: {
            user: { select: USER_SELECT },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ---------------------------------------------------------------------------
  // 댓글 수정 (작성자만 가능)
  // ---------------------------------------------------------------------------
  async update(commentId: string, userId: string, dto: UpdateCommentDto) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    // 작성자 본인만 수정 가능
    if (comment.userId !== userId) {
      throw new ForbiddenException('본인이 작성한 댓글만 수정할 수 있습니다.');
    }

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { content: dto.content },
      include: {
        user: { select: USER_SELECT },
      },
    });

    const place = await this.prisma.wishlistPlace.findUnique({
      where: { id: comment.wishlistPlaceId },
      select: { tripId: true },
    });
    if (place) {
      this.syncGateway.server.to(`trip_${place.tripId}`).emit('commentUpdated');
    }

    return updated;
  }

  // ---------------------------------------------------------------------------
  // 댓글 삭제 (작성자만 가능, 부모 댓글 삭제 시 대댓글도 함께 삭제)
  // ---------------------------------------------------------------------------
  async remove(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    // 작성자 본인만 삭제 가능
    if (comment.userId !== userId) {
      throw new ForbiddenException('본인이 작성한 댓글만 삭제할 수 있습니다.');
    }

    // 부모 댓글인 경우 대댓글(replies)을 먼저 삭제한 후 부모 댓글 삭제
    // (Prisma 스키마에 onDelete: Cascade가 없으므로 수동 삭제)
    await this.prisma.$transaction(async (tx) => {
      // 대댓글 일괄 삭제
      await tx.comment.deleteMany({
        where: { parentId: commentId },
      });

      // 해당 댓글 삭제
      await tx.comment.delete({
        where: { id: commentId },
      });
    });

    const place = await this.prisma.wishlistPlace.findUnique({
      where: { id: comment.wishlistPlaceId },
      select: { tripId: true },
    });

    if (place) {
      this.syncGateway.server.to(`trip_${place.tripId}`).emit('commentUpdated');
    }

    return { message: '댓글이 삭제되었습니다.' };
  }
}
