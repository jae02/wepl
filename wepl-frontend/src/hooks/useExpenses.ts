/**
 * 정산(Expense) 관련 API 훅
 * 여행별 지출 조회, 생성, 요약, 통계, 정산 완료 토글
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── 타입 정의 ──────────────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  paidById: string;
  paidBy: {
    id: string;
    nickname: string;
    profileImageUrl: string | null;
  };
  splitWith: ExpenseSplit[];
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  userId: string;
  amount: number;
  isPaid: boolean;
  user: {
    id: string;
    nickname: string;
    profileImageUrl: string | null;
  };
}

export interface ExpenseSummary {
  from: { id: string; nickname: string };
  to: { id: string; nickname: string };
  amount: number;
}

export interface ExpenseStats {
  category: string;
  totalAmount: number;
  count: number;
  percentage: number;
}

interface CreateExpenseRequest {
  description: string;
  amount: number;
  currency?: string;
  category: string;
  splitType?: string;
  splitUserIds?: string[];
}

interface ToggleSplitPaidRequest {
  expenseId: string;
  splitId: string;
}

// ─── 쿼리 키 ────────────────────────────────────────────────────────────────────

export const expenseKeys = {
  all: ['expenses'] as const,
  list: (tripId: string, category?: string) =>
    [...expenseKeys.all, 'list', tripId, category ?? 'all'] as const,
  summary: (tripId: string) =>
    [...expenseKeys.all, 'summary', tripId] as const,
  stats: (tripId: string) =>
    [...expenseKeys.all, 'stats', tripId] as const,
};

// ─── 훅 ─────────────────────────────────────────────────────────────────────────

/**
 * 지출 목록 조회
 * category가 주어지면 해당 카테고리만 필터링
 */
export function useExpenses(tripId: string, category?: string) {
  return useQuery({
    queryKey: expenseKeys.list(tripId, category),
    queryFn: () =>
      api.get<Expense[]>(`/api/v1/trips/${tripId}/expenses`, {
        params: category ? { category } : undefined,
      }),
    enabled: !!tripId,
  });
}

/**
 * 지출 항목 생성
 */
export function useCreateExpense(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateExpenseRequest) =>
      api.post<Expense>(`/api/v1/trips/${tripId}/expenses`, data),
    onSuccess: () => {
      // 지출 관련 모든 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: [...expenseKeys.all, 'list', tripId],
      });
      queryClient.invalidateQueries({
        queryKey: expenseKeys.summary(tripId),
      });
      queryClient.invalidateQueries({
        queryKey: expenseKeys.stats(tripId),
      });
    },
  });
}

/**
 * 지출 요약 (카테고리별 합계, 멤버별 정산 현황)
 */
export function useExpenseSummary(tripId: string) {
  return useQuery({
    queryKey: expenseKeys.summary(tripId),
    queryFn: () =>
      api.get<ExpenseSummary[]>(`/api/v1/trips/${tripId}/expenses/summary`),
    enabled: !!tripId,
  });
}

/**
 * 지출 통계 (일평균, 최다 카테고리 등)
 */
export function useExpenseStats(tripId: string) {
  return useQuery({
    queryKey: expenseKeys.stats(tripId),
    queryFn: () =>
      api.get<ExpenseStats[]>(`/api/v1/trips/${tripId}/expenses/stats`),
    enabled: !!tripId,
  });
}

/**
 * 정산 완료/취소 토글
 */
export function useToggleSplitPaid(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ expenseId, splitId }: ToggleSplitPaidRequest) =>
      api.patch(`/api/v1/trips/${tripId}/expenses/${expenseId}/splits/${splitId}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...expenseKeys.all, 'list', tripId],
      });
      queryClient.invalidateQueries({
        queryKey: expenseKeys.summary(tripId),
      });
    },
  });
}

/**
 * 지출 항목 삭제
 */
export function useDeleteExpense(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expenseId: string) =>
      api.delete(`/api/v1/trips/${tripId}/expenses/${expenseId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...expenseKeys.all, 'list', tripId] });
      queryClient.invalidateQueries({ queryKey: expenseKeys.summary(tripId) });
      queryClient.invalidateQueries({ queryKey: expenseKeys.stats(tripId) });
    },
  });
}

// 화면에서 사용하는 alias
export const useAddExpense = useCreateExpense;

