// =============================================================================
// Settlement Service - 최소 송금 경로 알고리즘 기반 N빵 정산
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

// ─────────────────────────────────────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────────────────────────────────────

/** 정산 결과: "A → B에게 X원 보내기" */
export interface SettlementTransaction {
  fromUserId: string;
  fromNickname: string;
  toUserId: string;
  toNickname: string;
  amount: number;
  currency: string;
}

/** 사용자별 정산 요약 */
export interface UserSettlementSummary {
  userId: string;
  nickname: string;
  totalPaid: number;       // 총 결제 금액
  totalOwed: number;       // 총 부담 금액 (분담금 합계)
  netBalance: number;      // 순 잔액 (양수: 받을 돈, 음수: 보낼 돈)
}

/** 카테고리별 지출 통계 */
export interface CategoryExpenseStat {
  category: string;
  totalAmount: number;
  percentage: number;
  count: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 💰 최소 송금 경로 계산 (Greedy Algorithm)
   *
   * 1. 각 참여자의 순 잔액(Net Balance) 계산
   *    - Net = 총 결제 금액 - 총 분담 금액
   *    - 양수: 더 많이 낸 사람 (받을 돈 있음)
   *    - 음수: 덜 낸 사람 (보낼 돈 있음)
   *
   * 2. 탐욕 알고리즘으로 최소 송금 횟수 도출
   *    - 가장 많이 빚진 사람 → 가장 많이 받을 사람에게 송금
   *    - 둘 중 작은 금액만큼 정산 후 반복
   */
  async calculateSettlements(tripId: string): Promise<{
    transactions: SettlementTransaction[];
    summaries: UserSettlementSummary[];
    categoryStats: CategoryExpenseStat[];
    totalExpense: number;
  }> {
    // 1. 여행 멤버 정보 조회
    const members = await this.prisma.tripMember.findMany({
      where: { tripId },
      include: { user: { select: { id: true, nickname: true } } },
    });

    const memberMap = new Map(
      members.map((m) => [m.userId, m.user.nickname]),
    );

    // 2. 모든 지출 + 분담 데이터 조회
    const expenses = await this.prisma.expense.findMany({
      where: { tripId },
      include: {
        splits: true,
        paidBy: { select: { id: true, nickname: true } },
      },
    });

    if (expenses.length === 0) {
      return {
        transactions: [],
        summaries: members.map((m) => ({
          userId: m.userId,
          nickname: m.user.nickname,
          totalPaid: 0,
          totalOwed: 0,
          netBalance: 0,
        })),
        categoryStats: [],
        totalExpense: 0,
      };
    }

    const currency = expenses[0].currency;

    // 3. 사용자별 순 잔액 계산
    const balances = new Map<string, number>(); // userId → netBalance

    for (const member of members) {
      balances.set(member.userId, 0);
    }

    const userPaid = new Map<string, number>();
    const userOwed = new Map<string, number>();

    for (const expense of expenses) {
      const amount = Number(expense.amount);

      // 결제자: 양수 (받을 돈)
      const currentPaid = userPaid.get(expense.paidById) || 0;
      userPaid.set(expense.paidById, currentPaid + amount);

      const currentBalance = balances.get(expense.paidById) || 0;
      balances.set(expense.paidById, currentBalance + amount);

      // 분담자: 음수 (보낼 돈)
      for (const split of expense.splits) {
        const splitAmount = Number(split.amount);
        const currentOwed = userOwed.get(split.userId) || 0;
        userOwed.set(split.userId, currentOwed + splitAmount);

        const currentBal = balances.get(split.userId) || 0;
        balances.set(split.userId, currentBal - splitAmount);
      }
    }

    // 4. 순 잔액 요약
    const summaries: UserSettlementSummary[] = members.map((m) => ({
      userId: m.userId,
      nickname: m.user.nickname,
      totalPaid: userPaid.get(m.userId) || 0,
      totalOwed: userOwed.get(m.userId) || 0,
      netBalance: Math.round((balances.get(m.userId) || 0) * 100) / 100,
    }));

    // 5. 최소 송금 경로 계산 (Greedy)
    const transactions = this.calculateMinTransfers(balances, memberMap, currency);

    // 6. 카테고리별 통계
    const totalExpense = expenses.reduce(
      (sum, e) => sum + Number(e.amount),
      0,
    );

    const categoryMap = new Map<string, { total: number; count: number }>();
    for (const expense of expenses) {
      const current = categoryMap.get(expense.category) || {
        total: 0,
        count: 0,
      };
      current.total += Number(expense.amount);
      current.count += 1;
      categoryMap.set(expense.category, current);
    }

    const categoryStats: CategoryExpenseStat[] = Array.from(
      categoryMap.entries(),
    ).map(([category, { total, count }]) => ({
      category,
      totalAmount: Math.round(total * 100) / 100,
      percentage: Math.round((total / totalExpense) * 10000) / 100,
      count,
    }));

    return {
      transactions,
      summaries,
      categoryStats: categoryStats.sort((a, b) => b.totalAmount - a.totalAmount),
      totalExpense: Math.round(totalExpense * 100) / 100,
    };
  }

  /**
   * 🧮 최소 송금 횟수 계산 (Greedy Algorithm)
   *
   * 시간복잡도: O(N log N) (정렬 후 투 포인터)
   *
   * 예시:
   * A: +30,000 (3만원 받을 돈)
   * B: -20,000 (2만원 보낼 돈)
   * C: -10,000 (1만원 보낼 돈)
   * → B → A: 20,000원, C → A: 10,000원 (최소 2회 송금)
   */
  private calculateMinTransfers(
    balances: Map<string, number>,
    memberMap: Map<string, string>,
    currency: string,
  ): SettlementTransaction[] {
    // 잔액이 0이 아닌 사용자만 추출
    const debtors: { userId: string; amount: number }[] = []; // 보낼 사람
    const creditors: { userId: string; amount: number }[] = []; // 받을 사람

    for (const [userId, balance] of balances.entries()) {
      const rounded = Math.round(balance * 100) / 100;
      if (rounded < -0.01) {
        debtors.push({ userId, amount: Math.abs(rounded) });
      } else if (rounded > 0.01) {
        creditors.push({ userId, amount: rounded });
      }
    }

    // 금액 내림차순 정렬 (큰 금액부터 처리)
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const transactions: SettlementTransaction[] = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const transferAmount = Math.min(debtors[i].amount, creditors[j].amount);

      if (transferAmount > 0.01) {
        transactions.push({
          fromUserId: debtors[i].userId,
          fromNickname: memberMap.get(debtors[i].userId) || '알 수 없음',
          toUserId: creditors[j].userId,
          toNickname: memberMap.get(creditors[j].userId) || '알 수 없음',
          amount: Math.round(transferAmount * 100) / 100,
          currency,
        });
      }

      debtors[i].amount -= transferAmount;
      creditors[j].amount -= transferAmount;

      if (debtors[i].amount < 0.01) i++;
      if (creditors[j].amount < 0.01) j++;
    }

    return transactions;
  }
}
