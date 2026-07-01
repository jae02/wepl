// =============================================================================
// TripController - 여행 REST API 엔드포인트
// Base path: /api/v1/trips
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
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { TripService } from './trip.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { JoinTripDto } from './dto/join-trip.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TripMemberGuard } from './guards/trip-member.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TripRole } from '@prisma/client';

@Controller('api/v1/trips')
@UseGuards(JwtAuthGuard)
export class TripController {
  constructor(private readonly tripService: TripService) {}

  /**
   * POST /api/v1/trips
   * 새 여행 생성 (로그인 필수)
   */
  @Post()
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateTripDto,
  ) {
    return this.tripService.create(user.id, dto);
  }

  /**
   * GET /api/v1/trips
   * 내가 참여 중인 여행 목록 조회
   */
  @Get()
  async findAll(@CurrentUser() user: { id: string }) {
    return this.tripService.findAllByUser(user.id);
  }

  /**
   * POST /api/v1/trips/join
   * 초대 코드로 여행 참여
   * 주의: :tripId 파라미터를 사용하는 라우트보다 먼저 선언해야 함
   */
  @Post('join')
  async join(
    @CurrentUser() user: { id: string },
    @Body() dto: JoinTripDto,
  ) {
    return this.tripService.join(user.id, dto.inviteCode);
  }

  /**
   * GET /api/v1/trips/:tripId
   * 여행 상세 조회 (멤버만 접근 가능)
   */
  @Get(':tripId')
  @UseGuards(JwtAuthGuard, TripMemberGuard)
  async findOne(@Param('tripId') tripId: string) {
    return this.tripService.findOne(tripId);
  }

  /**
   * PATCH /api/v1/trips/:tripId
   * 여행 정보 수정 (멤버만 접근 가능)
   */
  @Patch(':tripId')
  @UseGuards(JwtAuthGuard, TripMemberGuard)
  async update(
    @Param('tripId') tripId: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.tripService.update(tripId, dto);
  }

  /**
   * DELETE /api/v1/trips/:tripId
   * 여행 삭제 (OWNER만 가능)
   */
  @Delete(':tripId')
  @UseGuards(JwtAuthGuard, TripMemberGuard)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('tripId') tripId: string, @Req() req: any) {
    // OWNER 권한 확인 (TripMemberGuard가 request.tripMembership에 멤버십 정보를 추가함)
    if (req.tripMembership?.role !== TripRole.OWNER) {
      throw new ForbiddenException('방장만 여행을 삭제할 수 있습니다.');
    }
    return this.tripService.remove(tripId);
  }

  /**
   * DELETE /api/v1/trips/:tripId/leave
   * 여행 탈퇴 (로그인 필수)
   */
  @Delete(':tripId/leave')
  @HttpCode(HttpStatus.OK)
  async leave(
    @CurrentUser() user: { id: string },
    @Param('tripId') tripId: string,
  ) {
    return this.tripService.leave(user.id, tripId);
  }

  /**
   * GET /api/v1/trips/:tripId/members
   * 여행 멤버 목록 조회 (멤버만 접근 가능)
   */
  @Get(':tripId/members')
  @UseGuards(JwtAuthGuard, TripMemberGuard)
  async getMembers(@Param('tripId') tripId: string) {
    return this.tripService.getMembers(tripId);
  }
}
