// =============================================================================
// WishlistService - 위시리스트 장소 비즈니스 로직
// 생성, 조회(목록/단건), 수정, 삭제
// =============================================================================

import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import { WishlistQueryDto } from './dto/wishlist-query.dto';
import { Prisma } from '@prisma/client';
import { SyncGateway } from '../sync/sync.gateway';

@Injectable()
export class WishlistService {
  private readonly logger = new Logger(WishlistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncGateway: SyncGateway,
  ) {}

  /**
   * 위시리스트 장소 생성
   * tripId와 생성자 userId는 컨트롤러에서 주입
   */
  async create(tripId: string, userId: string, dto: CreateWishlistDto) {
    const place = await this.prisma.wishlistPlace.create({
      data: {
        tripId,
        createdById: userId,
        name: dto.name,
        category: dto.category,
        address: dto.address,
        description: dto.description,
        imageUrl: dto.imageUrl,
        externalUrl: dto.externalUrl,
        googlePlaceId: dto.googlePlaceId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        rating: dto.rating,
        priceLevel: dto.priceLevel,
        comments: dto.comment
          ? {
              create: {
                userId,
                content: dto.comment,
              },
            }
          : undefined,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            nickname: true,
            profileImageUrl: true,
          },
        },
      },
    });

    this.logger.log(
      `위시리스트 장소 생성: ${place.id} (여행: ${tripId}, 작성자: ${userId})`,
    );

    this.syncGateway.server.to(`trip_${tripId}`).emit('wishlistUpdated');

    return place;
  }

  /**
   * 여행의 위시리스트 장소 목록 조회
   * 카테고리, isPlaced 필터 지원 / 작성자 정보 + 댓글 수, 좋아요 수, 본인 좋아요 여부 포함
   */
  async findAllByTrip(tripId: string, query: WishlistQueryDto | undefined, userId: string) {
    // 동적 where 조건 구성
    const where: Prisma.WishlistPlaceWhereInput = { tripId };

    if (query?.category) {
      where.category = query.category;
    }
    if (query?.isPlaced !== undefined) {
      where.isPlaced = query.isPlaced;
    }

    return this.prisma.wishlistPlace.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            nickname: true,
            profileImageUrl: true,
          },
        },
        _count: {
          select: { comments: true, likes: true },
        },
        likes: {
          where: { userId },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 위시리스트 장소 단건 조회
   * 작성자 정보 + 1단계 댓글(대댓글 제외) 포함
   */
  async findOne(id: string, userId: string) {
    const place = await this.prisma.wishlistPlace.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            nickname: true,
            profileImageUrl: true,
          },
        },
        comments: {
          where: { parentId: null }, // 최상위 댓글만 (1단계)
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                profileImageUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { likes: true, comments: true },
        },
        likes: {
          where: { userId },
          select: { id: true },
        },
      },
    });

    if (!place) {
      throw new NotFoundException('위시리스트 장소를 찾을 수 없습니다.');
    }

    return place;
  }

  /**
   * 위시리스트 장소 수정
   */
  async update(id: string, dto: UpdateWishlistDto) {
    // 존재 여부 확인
    const existing = await this.prisma.wishlistPlace.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('위시리스트 장소를 찾을 수 없습니다.');
    }

    const updated = await this.prisma.wishlistPlace.update({
      where: { id },
      data: { ...dto },
      include: {
        createdBy: {
          select: {
            id: true,
            nickname: true,
            profileImageUrl: true,
          },
        },
      },
    });

    this.syncGateway.server.to(`trip_${existing.tripId}`).emit('wishlistUpdated');

    return updated;
  }

  /**
   * 위시리스트 장소 삭제
   * 권한 확인은 컨트롤러에서 처리 (작성자 본인 또는 OWNER만 가능)
   */
  async remove(id: string) {
    const existing = await this.prisma.wishlistPlace.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('위시리스트 장소를 찾을 수 없습니다.');
    }

    await this.prisma.wishlistPlace.delete({
      where: { id },
    });

    this.logger.log(`위시리스트 장소 삭제: ${id}`);

    this.syncGateway.server.to(`trip_${existing.tripId}`).emit('wishlistUpdated');

    return { deleted: true };
  }

  /**
   * 좋아요 토글 (Like / Unlike)
   */
  async toggleLike(wishlistId: string, userId: string) {
    const existing = await this.prisma.wishlistPlace.findUnique({
      where: { id: wishlistId },
    });

    if (!existing) {
      throw new NotFoundException('위시리스트 장소를 찾을 수 없습니다.');
    }

    const like = await this.prisma.wishlistLike.findUnique({
      where: {
        wishlistPlaceId_userId: {
          wishlistPlaceId: wishlistId,
          userId,
        },
      },
    });

    if (like) {
      // 이미 있으면 취소
      await this.prisma.wishlistLike.delete({
        where: { id: like.id },
      });
    } else {
      // 없으면 생성
      await this.prisma.wishlistLike.create({
        data: {
          wishlistPlaceId: wishlistId,
          userId,
        },
      });
    }

    this.syncGateway.server.to(`trip_${existing.tripId}`).emit('wishlistUpdated');

    return { liked: !like };
  }

  /**
   * 위치 기반 추천 장소 (Haversine formula)
   */
  async recommendPlaces(tripId: string, lat: number, lng: number, radiusMeters: number) {
    const places = await this.prisma.$queryRaw`
      SELECT * FROM (
        SELECT id, name, address, latitude, longitude, category, "image_url" AS "imageUrl",
          (6371000 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(${lat}::float)) * cos(radians(latitude)) * 
              cos(radians(longitude) - radians(${lng}::float)) + 
              sin(radians(${lat}::float)) * sin(radians(latitude))
            ))
          )) AS distance
        FROM "wishlist_places"
        WHERE "trip_id" = ${tripId}
          AND latitude IS NOT NULL
          AND longitude IS NOT NULL
      ) AS sub
      WHERE distance <= ${radiusMeters}
      ORDER BY distance ASC
      LIMIT 10
    `;
    return places;
  }
}
