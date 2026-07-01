// =============================================================================
// ExpenseController - 경비 REST API 엔드포인트
// 경비는 여행(Trip)에 귀속되며, 여행 멤버만 접근 가능
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
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TripMemberGuard } from '../trip/guards/trip-member.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ExpenseCategory } from '@prisma/client';

@Controller('api/v1/trips/:tripId/expenses')
@UseGuards(JwtAuthGuard, TripMemberGuard)
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  /**
   * POST /api/v1/trips/:tripId/expenses
   * 경비 생성
   */
  @Post()
  async create(
    @Param('tripId') tripId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expenseService.create(tripId, user.id, dto);
  }

  /**
   * GET /api/v1/trips/:tripId/expenses/summary
   * 정산 요약 — 누가 누구에게 얼마를 보내야 하는지
   * ⚠️ :expenseId 라우트보다 반드시 먼저 선언되어야 함
   */
  @Get('summary')
  async getSettlementSummary(@Param('tripId') tripId: string) {
    return this.expenseService.getSettlementSummary(tripId);
  }

  /**
   * GET /api/v1/trips/:tripId/expenses/stats
   * 카테고리별 통계
   * ⚠️ :expenseId 라우트보다 반드시 먼저 선언되어야 함
   */
  @Get('stats')
  async getCategoryStats(@Param('tripId') tripId: string) {
    return this.expenseService.getCategoryStats(tripId);
  }

  /**
   * GET /api/v1/trips/:tripId/expenses
   * 여행의 전체 경비 목록 조회 (카테고리 필터 선택)
   */
  @Get()
  async findAll(
    @Param('tripId') tripId: string,
    @Query('category') category?: ExpenseCategory,
  ) {
    return this.expenseService.findAllByTrip(tripId, category);
  }

  /**
   * GET /api/v1/trips/:tripId/expenses/:expenseId
   * 단일 경비 상세 조회
   */
  @Get(':expenseId')
  async findOne(@Param('expenseId') expenseId: string) {
    return this.expenseService.findOne(expenseId);
  }

  /**
   * PATCH /api/v1/trips/:tripId/expenses/:expenseId
   * 경비 수정 (결제자 본인만)
   */
  @Patch(':expenseId')
  async update(
    @Param('expenseId') expenseId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expenseService.update(expenseId, user.id, dto);
  }

  /**
   * DELETE /api/v1/trips/:tripId/expenses/:expenseId
   * 경비 삭제 (결제자 또는 여행 OWNER)
   */
  @Delete(':expenseId')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('expenseId') expenseId: string,
    @CurrentUser() user: { id: string },
    @Req() req: any,
  ) {
    return this.expenseService.remove(expenseId, user.id, req.tripMembership);
  }

  /**
   * PATCH /api/v1/trips/:tripId/expenses/splits/:splitId/toggle
   * 정산 분배 결제 상태 토글
   */
  @Patch('splits/:splitId/toggle')
  async toggleSplitPaid(@Param('splitId') splitId: string) {
    return this.expenseService.markSplitAsPaid(splitId);
  }
}
