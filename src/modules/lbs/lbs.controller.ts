// =============================================================================
// LBS Controller - 위치 기반 API 엔드포인트
// =============================================================================

import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  ParseFloatPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { LbsService, NearbyPlaceQuery, NearbyPlaceResult } from './lbs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TripMemberGuard } from '../trip/guards/trip-member.guard';
import { PlaceCategory } from '@prisma/client';

@Controller('api/v1/trips/:tripId/nearby')
@UseGuards(JwtAuthGuard, TripMemberGuard)
export class LbsController {
  constructor(private readonly lbsService: LbsService) {}

  /**
   * GET /api/v1/trips/:tripId/nearby
   *
   * 현재 위치 기반 주변 위시리스트 장소 검색
   *
   * @query lat - 사용자 현재 위도 (필수)
   * @query lng - 사용자 현재 경도 (필수)
   * @query radius - 검색 반경 (미터, 기본: 2000)
   * @query categories - 카테고리 필터 (쉼표 구분, 기본: RESTAURANT,CAFE)
   * @query limit - 최대 결과 수 (기본: 20)
   * @query excludePlaced - 배치된 장소 제외 (기본: false)
   *
   * @example
   * GET /api/v1/trips/abc123/nearby?lat=34.6937&lng=135.5023&radius=1000&categories=RESTAURANT,CAFE
   */
  @Get()
  async findNearbyPlaces(
    @Param('tripId') tripId: string,
    @Query('lat', ParseFloatPipe) latitude: number,
    @Query('lng', ParseFloatPipe) longitude: number,
    @Query('radius', new DefaultValuePipe(2000), ParseIntPipe) radiusMeters: number,
    @Query('categories', new DefaultValuePipe('RESTAURANT,CAFE'))
    categoriesStr: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('excludePlaced', new DefaultValuePipe('false'))
    excludePlacedStr: string,
  ): Promise<{
    data: NearbyPlaceResult[];
    meta: { total: number; radiusMeters: number; center: { lat: number; lng: number } };
  }> {
    const categories = categoriesStr
      .split(',')
      .map((c) => c.trim() as PlaceCategory);

    const excludePlaced = excludePlacedStr === 'true';

    const query: NearbyPlaceQuery = {
      tripId,
      latitude,
      longitude,
      radiusMeters: Math.min(radiusMeters, 10000), // 최대 10km 제한
      categories,
      limit: Math.min(limit, 50), // 최대 50개 제한
      excludePlaced,
    };

    const data = await this.lbsService.findNearbyPlaces(query);

    return {
      data,
      meta: {
        total: data.length,
        radiusMeters: query.radiusMeters!,
        center: { lat: latitude, lng: longitude },
      },
    };
  }

  /**
   * GET /api/v1/trips/:tripId/nearby/density
   *
   * 반경별 장소 밀도 조회 (넛지 UI용)
   */
  @Get('density')
  async getPlaceDensity(
    @Param('tripId') tripId: string,
    @Query('lat', ParseFloatPipe) latitude: number,
    @Query('lng', ParseFloatPipe) longitude: number,
  ) {
    const density = await this.lbsService.getPlaceDensity(
      tripId,
      latitude,
      longitude,
    );

    return { data: density };
  }
}
