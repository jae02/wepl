// =============================================================================
// LBS (Location-Based Service) - 위치 기반 위시리스트 추천 서비스
// PostGIS ST_DWithin + ST_Distance를 활용한 공간 쿼리
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlaceCategory } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────
export interface NearbyPlaceQuery {
  tripId: string;
  latitude: number;    // 사용자 현재 위도
  longitude: number;   // 사용자 현재 경도
  radiusMeters?: number;     // 검색 반경 (기본: 2km)
  categories?: PlaceCategory[]; // 필터링할 카테고리 (기본: RESTAURANT, CAFE)
  limit?: number;      // 최대 결과 수 (기본: 20)
  excludePlaced?: boolean; // 이미 타임라인에 배치된 장소 제외 여부
}

export interface NearbyPlaceResult {
  id: string;
  name: string;
  category: PlaceCategory;
  address: string | null;
  description: string | null;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  distanceMeters: number; // 현재 위치로부터의 거리 (미터)
  rating: number | null;
  priceLevel: number | null;
  isPlaced: boolean;
  commentCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────
@Injectable()
export class LbsService {
  private readonly logger = new Logger(LbsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 🔍 주변 위시리스트 장소 검색 (PostGIS 공간 쿼리)
   *
   * ST_DWithin: 지정 반경 내 장소 필터링 (GEOGRAPHY 타입이므로 미터 단위)
   * ST_Distance: 정확한 거리 계산 (측지 거리, 미터 단위)
   *
   * GEOGRAPHY 타입을 사용하므로 지구 곡률을 자동 고려합니다.
   * (GEOMETRY와 달리 별도의 좌표계 변환이 필요 없음)
   */
  async findNearbyPlaces(query: NearbyPlaceQuery): Promise<NearbyPlaceResult[]> {
    const {
      tripId,
      latitude,
      longitude,
      radiusMeters = 2000,       // 기본 2km
      categories = ['RESTAURANT', 'CAFE'],
      limit = 20,
      excludePlaced = false,
    } = query;

    // 입력값 유효성 검증
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new Error('유효하지 않은 좌표입니다.');
    }

    this.logger.log(
      `주변 장소 검색: trip=${tripId}, 위치=(${latitude}, ${longitude}), 반경=${radiusMeters}m`,
    );

    // ─────────────────────────────────────────────────────────────────────
    // 방법 1: PostGIS 공간 쿼리 (권장 - 고성능)
    // ─────────────────────────────────────────────────────────────────────
    const results = await this.prisma.$queryRaw<NearbyPlaceResult[]>`
      SELECT
        wp.id,
        wp.name,
        wp.category::TEXT as "category",
        wp.address,
        wp.description,
        wp.image_url as "imageUrl",
        wp.latitude,
        wp.longitude,
        wp.rating,
        wp.price_level as "priceLevel",
        wp.is_placed as "isPlaced",
        -- 현재 위치와의 거리 (미터 단위, 소수 첫째자리 반올림)
        ROUND(
          ST_Distance(
            wp.location,
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::GEOGRAPHY
          )::NUMERIC, 1
        ) as "distanceMeters",
        -- 코멘트 수 (서브쿼리)
        (SELECT COUNT(*)::INT FROM comments c WHERE c.wishlist_place_id = wp.id) as "commentCount"
      FROM wishlist_places wp
      WHERE
        -- 같은 여행 방의 장소만
        wp.trip_id = ${tripId}
        -- 위치 데이터가 있는 장소만
        AND wp.location IS NOT NULL
        -- 지정 반경 내 (ST_DWithin은 인덱스를 사용하여 빠름)
        AND ST_DWithin(
          wp.location,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::GEOGRAPHY,
          ${radiusMeters}
        )
        -- 카테고리 필터
        AND wp.category::TEXT = ANY(${categories}::TEXT[])
        -- 이미 배치된 장소 제외 옵션
        AND (${excludePlaced} = false OR wp.is_placed = false)
      ORDER BY "distanceMeters" ASC
      LIMIT ${limit}
    `;

    this.logger.log(`${results.length}개 주변 장소 발견`);
    return results;
  }

  /**
   * 🗺️ 위시리스트 전체 장소의 거리 계산 (PostGIS 없이 Haversine)
   *
   * PostGIS가 설치되지 않은 환경을 위한 폴백 메서드.
   * Prisma ORM을 통해 데이터를 가져온 후 애플리케이션 레벨에서 거리를 계산합니다.
   */
  async findNearbyPlacesFallback(query: NearbyPlaceQuery): Promise<NearbyPlaceResult[]> {
    const {
      tripId,
      latitude,
      longitude,
      radiusMeters = 2000,
      categories = ['RESTAURANT', 'CAFE'],
      limit = 20,
      excludePlaced = false,
    } = query;

    // Prisma ORM으로 후보 장소 조회 (위치 데이터가 있는 것만)
    const places = await this.prisma.wishlistPlace.findMany({
      where: {
        tripId,
        category: { in: categories },
        latitude: { not: null },
        longitude: { not: null },
        ...(excludePlaced ? { isPlaced: false } : {}),
      },
      include: {
        _count: {
          select: { comments: true },
        },
      },
    });

    // Haversine 공식으로 거리 계산 후 필터링 & 정렬
    const results = places
      .map((place) => ({
        id: place.id,
        name: place.name,
        category: place.category,
        address: place.address,
        description: place.description,
        imageUrl: place.imageUrl,
        latitude: place.latitude!,
        longitude: place.longitude!,
        rating: place.rating,
        priceLevel: place.priceLevel,
        isPlaced: place.isPlaced,
        distanceMeters: this.haversineDistance(
          latitude,
          longitude,
          place.latitude!,
          place.longitude!,
        ),
        commentCount: place._count.comments,
      }))
      .filter((p) => p.distanceMeters <= radiusMeters)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, limit);

    return results;
  }

  /**
   * 📏 Haversine 거리 공식 (미터 단위)
   *
   * 두 위·경도 좌표 사이의 대원 거리(Great-circle distance)를 계산합니다.
   * PostGIS가 없는 환경에서의 폴백용입니다.
   */
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // 지구 반지름 (미터)
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c * 10) / 10; // 소수 첫째자리까지
  }

  /**
   * 📊 반경별 장소 밀도 분석 (현재 위치 기준)
   *
   * 500m, 1km, 2km, 5km 반경별로 위시리스트 장소 수를 집계합니다.
   * 프론트엔드에서 "주변에 N개의 맛집이 있어요!" 같은 넛지 UI에 활용합니다.
   */
  async getPlaceDensity(
    tripId: string,
    latitude: number,
    longitude: number,
  ): Promise<{ radius: number; count: number }[]> {
    const radii = [500, 1000, 2000, 5000]; // 미터

    const densityResults = await Promise.all(
      radii.map(async (radius) => {
        const result = await this.prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*)::INT as count
          FROM wishlist_places wp
          WHERE
            wp.trip_id = ${tripId}
            AND wp.location IS NOT NULL
            AND ST_DWithin(
              wp.location,
              ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::GEOGRAPHY,
              ${radius}
            )
        `;
        return { radius, count: Number(result[0].count) };
      }),
    );

    return densityResults;
  }
}
