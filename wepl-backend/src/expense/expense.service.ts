// =============================================================================
// ExpenseService - 경비 비즈니스 로직
// 경비 CRUD, 정산 분배, 정산 요약, 카테고리 통계
// =============================================================================

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseCategory, TripRole } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/** 경비 조회 시 포함할 사용자 정보 select 옵션 */
const USER_SELECT = {
  id: true,
  nickname: true,
  profileImageUrl: true,
} as const;

@Injectable()
export class ExpenseService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // 경비 생성 (정산 분배 포함)
  // ---------------------------------------------------------------------------
  async create(tripId: string, paidByUserId: string, dto: CreateExpenseDto) {
    // 정산 대상 사용자 결정
    let splitUserIds: string[];

    if (dto.splitUserIds && dto.splitUserIds.length > 0) {
      // 지정된 사용자들이 실제 여행 멤버인지 검증
      const members = await this.prisma.tripMember.findMany({
        where: {
          tripId,
          userId: { in: dto.splitUserIds },
        },
        select: { userId: true },
      });

      const memberUserIds = members.map((m) => m.userId);
      const invalidIds = dto.splitUserIds.filter(
        (id) => !memberUserIds.includes(id),
      );

      if (invalidIds.length > 0) {
        throw new BadRequestException(
          `다음 사용자는 여행 멤버가 아닙니다: ${invalidIds.join(', ')}`,
        );
      }

      splitUserIds = dto.splitUserIds;
    } else {
      // 전체 여행 멤버로 균등 분배
      const members = await this.prisma.tripMember.findMany({
        where: { tripId },
        select: { userId: true },
      });

      splitUserIds = members.map((m) => m.userId);
    }

    if (splitUserIds.length === 0) {
      throw new BadRequestException('정산 대상 사용자가 없습니다.');
    }

    // 균등 분배 금액 계산 (Decimal 정밀 연산)
    const totalAmount = new Decimal(dto.amount);
    const participantCount = splitUserIds.length;
    const splitAmount = totalAmount.dividedBy(participantCount).toDecimalPlaces(2, Decimal.ROUND_DOWN);

    // 반올림 오차 보정: 첫 번째 참여자가 나머지 차액을 부담
    const remainder = totalAmount.minus(splitAmount.times(participantCount));

    // 트랜잭션으로 경비 + 분배 레코드 일괄 생성
    const expense = await this.prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          tripId,
          paidById: paidByUserId,
          amount: totalAmount,
          currency: dto.currency ?? 'KRW',
          description: dto.description,
          category: dto.category,
          scheduleId: dto.scheduleId ?? null,
          receiptImageUrl: dto.receiptImageUrl ?? null,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        },
      });

      // 분배 레코드 생성
      const splitData = splitUserIds.map((userId, index) => ({
        expenseId: created.id,
        userId,
        // 첫 번째 참여자가 반올림 오차를 부담
        amount: index === 0 ? splitAmount.plus(remainder) : splitAmount,
      }));

      await tx.expenseSplit.createMany({ data: splitData });

      // 생성된 경비를 관계 데이터와 함께 조회
      return tx.expense.findUnique({
        where: { id: created.id },
        include: {
          paidBy: { select: USER_SELECT },
          splits: {
            include: { user: { select: USER_SELECT } },
          },
          schedule: {
            select: { id: true, customTitle: true },
          },
        },
      });
    });

    return expense;
  }

  // ---------------------------------------------------------------------------
  // 여행의 전체 경비 목록 조회 (카테고리 필터 선택)
  // ---------------------------------------------------------------------------
  async findAllByTrip(tripId: string, category?: ExpenseCategory) {
    return this.prisma.expense.findMany({
      where: {
        tripId,
        ...(category && { category }),
      },
      include: {
        paidBy: { select: USER_SELECT },
        _count: { select: { splits: true } },
      },
      orderBy: { paidAt: 'desc' },
    });
  }

  // ---------------------------------------------------------------------------
  // 단일 경비 상세 조회
  // ---------------------------------------------------------------------------
  async findOne(id: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        paidBy: { select: USER_SELECT },
        splits: {
          include: { user: { select: USER_SELECT } },
        },
        schedule: {
          select: { id: true, customTitle: true },
        },
      },
    });

    if (!expense) {
      throw new NotFoundException('경비를 찾을 수 없습니다.');
    }

    return expense;
  }

  // ---------------------------------------------------------------------------
  // 경비 수정 (결제자 본인만 가능)
  // ---------------------------------------------------------------------------
  async update(id: string, userId: string, dto: UpdateExpenseDto) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      throw new NotFoundException('경비를 찾을 수 없습니다.');
    }

    // 결제자 본인만 수정 가능
    if (expense.paidById !== userId) {
      throw new ForbiddenException('결제자만 경비를 수정할 수 있습니다.');
    }

    const updateData = dto as any;

    return this.prisma.expense.update({
      where: { id },
      data: {
        ...(updateData.description !== undefined && {
          description: updateData.description,
        }),
        ...(updateData.amount !== undefined && {
          amount: new Decimal(updateData.amount),
        }),
        ...(updateData.category !== undefined && {
          category: updateData.category,
        }),
        ...(updateData.currency !== undefined && {
          currency: updateData.currency,
        }),
        ...(updateData.scheduleId !== undefined && {
          scheduleId: updateData.scheduleId,
        }),
        ...(updateData.receiptImageUrl !== undefined && {
          receiptImageUrl: updateData.receiptImageUrl,
        }),
        ...(updateData.paidAt !== undefined && {
          paidAt: new Date(updateData.paidAt),
        }),
      },
      include: {
        paidBy: { select: USER_SELECT },
        splits: {
          include: { user: { select: USER_SELECT } },
        },
        schedule: {
          select: { id: true, customTitle: true },
        },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 경비 삭제 (결제자 또는 여행 OWNER만 가능)
  // ---------------------------------------------------------------------------
  async remove(
    id: string,
    userId: string,
    tripMembership: { role: TripRole },
  ) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      throw new NotFoundException('경비를 찾을 수 없습니다.');
    }

    // 결제자 본인 또는 여행 OWNER만 삭제 가능
    const isOwner = tripMembership.role === TripRole.OWNER;
    const isPaidBy = expense.paidById === userId;

    if (!isPaidBy && !isOwner) {
      throw new ForbiddenException(
        '결제자 또는 여행 소유자만 경비를 삭제할 수 있습니다.',
      );
    }

    // 분배 레코드 먼저 삭제 후 경비 삭제 (트랜잭션)
    await this.prisma.$transaction(async (tx) => {
      await tx.expenseSplit.deleteMany({
        where: { expenseId: id },
      });

      await tx.expense.delete({
        where: { id },
      });
    });

    return { message: '경비가 삭제되었습니다.' };
  }

  // ---------------------------------------------------------------------------
  // 정산 분배 결제 상태 토글 (isPaid)
  // ---------------------------------------------------------------------------
  async markSplitAsPaid(splitId: string) {
    const split = await this.prisma.expenseSplit.findUnique({
      where: { id: splitId },
    });

    if (!split) {
      throw new NotFoundException('정산 분배 내역을 찾을 수 없습니다.');
    }

    return this.prisma.expenseSplit.update({
      where: { id: splitId },
      data: { isPaid: !split.isPaid },
      include: {
        user: { select: USER_SELECT },
        expense: {
          select: { id: true, description: true },
        },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 정산 요약 — 누가 누구에게 얼마를 보내야 하는지 계산
  // 그리디 알고리즘으로 거래 횟수 최소화
  // ---------------------------------------------------------------------------
  async getSettlementSummary(tripId: string) {
    // 각 사용자별 총 결제 금액 (paidBy로서 지출한 총액)
    const paidAggregation = await this.prisma.expense.groupBy({
      by: ['paidById'],
      where: { tripId },
      _sum: { amount: true },
    });

    // 각 사용자별 총 분배 금액 (split으로 부담해야 하는 총액)
    const owedAggregation = await this.prisma.expenseSplit.groupBy({
      by: ['userId'],
      where: { expense: { tripId } },
      _sum: { amount: true },
    });

    // 사용자 잔액 계산: totalPaid - totalOwed
    // 양수 → 돌려받아야 함 (채권자), 음수 → 보내야 함 (채무자)
    const balanceMap = new Map<string, Decimal>();

    for (const record of paidAggregation) {
      const current = balanceMap.get(record.paidById) ?? new Decimal(0);
      balanceMap.set(
        record.paidById,
        current.plus(record._sum.amount ?? new Decimal(0)),
      );
    }

    for (const record of owedAggregation) {
      const current = balanceMap.get(record.userId) ?? new Decimal(0);
      balanceMap.set(
        record.userId,
        current.minus(record._sum.amount ?? new Decimal(0)),
      );
    }

    // 채권자와 채무자 분리
    const creditors: { userId: string; amount: Decimal }[] = [];
    const debtors: { userId: string; amount: Decimal }[] = [];

    for (const [userId, balance] of balanceMap) {
      if (balance.greaterThan(0)) {
        creditors.push({ userId, amount: balance });
      } else if (balance.lessThan(0)) {
        debtors.push({ userId, amount: balance.abs() });
      }
    }

    // 그리디 알고리즘: 큰 금액부터 매칭하여 거래 횟수 최소화
    creditors.sort((a, b) => b.amount.minus(a.amount).toNumber());
    debtors.sort((a, b) => b.amount.minus(a.amount).toNumber());

    const settlements: { fromUserId: string; toUserId: string; amount: Decimal }[] = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const settleAmount = Decimal.min(debtors[i].amount, creditors[j].amount);

      if (settleAmount.greaterThan(0)) {
        settlements.push({
          fromUserId: debtors[i].userId,
          toUserId: creditors[j].userId,
          amount: settleAmount,
        });
      }

      debtors[i].amount = debtors[i].amount.minus(settleAmount);
      creditors[j].amount = creditors[j].amount.minus(settleAmount);

      if (debtors[i].amount.isZero()) i++;
      if (creditors[j].amount.isZero()) j++;
    }

    // 사용자 정보 조회
    const userIds = [
      ...new Set(
        settlements.flatMap((s) => [s.fromUserId, s.toUserId]),
      ),
    ];

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: USER_SELECT,
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return settlements.map((s) => ({
      from: userMap.get(s.fromUserId) ?? {
        id: s.fromUserId,
        nickname: '알 수 없음',
        profileImageUrl: null,
      },
      to: userMap.get(s.toUserId) ?? {
        id: s.toUserId,
        nickname: '알 수 없음',
        profileImageUrl: null,
      },
      amount: s.amount.toNumber(),
    }));
  }

  // ---------------------------------------------------------------------------
  // 카테고리별 통계
  // ---------------------------------------------------------------------------
  async getCategoryStats(tripId: string) {
    const stats = await this.prisma.expense.groupBy({
      by: ['category'],
      where: { tripId },
      _sum: { amount: true },
      _count: { _all: true },
    });

    // 전체 합계 계산
    const totalAmount = stats.reduce(
      (sum, s) => sum.plus(s._sum.amount ?? new Decimal(0)),
      new Decimal(0),
    );

    return stats.map((s) => {
      const categoryTotal = s._sum.amount ?? new Decimal(0);
      const percentage = totalAmount.isZero()
        ? 0
        : categoryTotal.dividedBy(totalAmount).times(100).toDecimalPlaces(1).toNumber();

      return {
        category: s.category,
        totalAmount: categoryTotal.toNumber(),
        count: s._count._all,
        percentage,
      };
    });
  }
}
