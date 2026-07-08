// =============================================================================
// WishlistController - 위시리스트 장소 REST API 엔드포인트
// Base path: /api/v1/trips/:tripId/wishlist
// 모든 엔드포인트는 JWT 인증 + 여행 멤버 가드 적용
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import { WishlistQueryDto } from './dto/wishlist-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TripMemberGuard } from '../trip/guards/trip-member.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TripRole } from '@prisma/client';

@Controller('api/v1/trips/:tripId/wishlist')
@UseGuards(JwtAuthGuard, TripMemberGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  /**
   * POST /api/v1/trips/:tripId/wishlist
   * 위시리스트 장소 추가 (여행 멤버만 가능)
   */
  @Post()
  async create(
    @Param('tripId') tripId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateWishlistDto,
  ) {
    return this.wishlistService.create(tripId, user.id, dto);
  }

  /**
   * GET /api/v1/trips/:tripId/wishlist
   * 위시리스트 목록 조회 (카테고리, isPlaced 필터 가능)
   */
  @Get()
  async findAll(
    @Param('tripId') tripId: string,
    @Query() query: WishlistQueryDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.wishlistService.findAllByTrip(tripId, query, user.id);
  }

  /**
   * GET /api/v1/trips/:tripId/wishlist/recommend
   * 위치 기반 추천 장소
   */
  @Get('recommend')
  async recommend(
    @Param('tripId') tripId: string,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius: string,
  ) {
    return this.wishlistService.recommendPlaces(
      tripId,
      parseFloat(lat),
      parseFloat(lng),
      radius ? parseFloat(radius) : 1000,
    );
  }

  /**
   * GET /api/v1/trips/:tripId/wishlist/:wishlistId
   * 위시리스트 장소 상세 조회 (댓글 포함)
   */
  @Get(':wishlistId')
  async findOne(
    @Param('wishlistId') wishlistId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.wishlistService.findOne(wishlistId, user.id);
  }

  /**
   * POST /api/v1/trips/:tripId/wishlist/:wishlistId/like
   * 위시리스트 장소 좋아요 토글
   */
  @Post(':wishlistId/like')
  async toggleLike(
    @Param('wishlistId') wishlistId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.wishlistService.toggleLike(wishlistId, user.id);
  }

  /**
   * PATCH /api/v1/trips/:tripId/wishlist/:wishlistId
   * 위시리스트 장소 수정
   */
  @Patch(':wishlistId')
  async update(
    @Param('wishlistId') wishlistId: string,
    @Body() dto: UpdateWishlistDto,
  ) {
    return this.wishlistService.update(wishlistId, dto);
  }

  /**
   * DELETE /api/v1/trips/:tripId/wishlist/:wishlistId
   * 위시리스트 장소 삭제 (작성자 본인 또는 방장만 가능)
   */
  @Delete(':wishlistId')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('wishlistId') wishlistId: string,
    @CurrentUser() user: { id: string },
    @Req() req: any,
  ) {
    // 삭제할 장소 정보를 먼저 조회하여 작성자 확인
    const place = await this.wishlistService.findOne(wishlistId, user.id);

    // 작성자 본인이 아니고, 방장도 아닌 경우 삭제 불가
    const isCreator = place.createdById === user.id;
    const isOwner = req.tripMembership?.role === TripRole.OWNER;

    if (!isCreator && !isOwner) {
      throw new ForbiddenException(
        '위시리스트 장소는 작성자 본인 또는 방장만 삭제할 수 있습니다.',
      );
    }

    return this.wishlistService.remove(wishlistId);
  }
}
