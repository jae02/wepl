/**
 * 타임라인 일정 관련 API 훅
 * 여행별 일정 조회, 생성, 수정, 삭제
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── 타입 정의 ──────────────────────────────────────────────────────────────────

export interface Schedule {
  id: string;
  tripId: string;
  wishlistPlaceId: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  orderIndex: number;
  memo: string | null;
  customTitle: string | null;
  customAddress: string | null;
  status: 'PLANNED' | 'ONGOING' | 'COMPLETED' | 'SKIPPED';
  wishlistPlace: {
    id: string;
    name: string;
    address: string | null;
    imageUrl: string | null;
    category: string;
  } | null;
  _count: {
    checklistItems: number;
    diaryEntries: number;
  };
  createdAt: string;
  updatedAt: string;
}

// ─── 쿼리 키 ────────────────────────────────────────────────────────────────────

export const scheduleKeys = {
  all: ['schedules'] as const,
  list: (tripId: string, date?: string) =>
    [...scheduleKeys.all, 'list', tripId, date ?? 'all'] as const,
  dates: (tripId: string) =>
    [...scheduleKeys.all, 'dates', tripId] as const,
  detail: (scheduleId: string) =>
    [...scheduleKeys.all, 'detail', scheduleId] as const,
};

// ─── 훅 ─────────────────────────────────────────────────────────────────────────

export function useCreateSchedule(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { date: string; wishlistPlaceId?: string; customTitle?: string }) =>
      api.post(`/api/v1/trips/${tripId}/schedules`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
}

/**
 * 특정 날짜의 일정 목록 조회
 * date가 없으면 비활성화
 */
export function useSchedules(tripId: string, date?: string) {
  return useQuery({
    queryKey: scheduleKeys.list(tripId, date),
    queryFn: () =>
      api.get<Schedule[]>(`/api/v1/trips/${tripId}/schedules`, {
        params: date ? { date } : undefined,
      }),
    enabled: !!tripId,
  });
}

/**
 * 일정이 있는 날짜 목록 조회 (캘린더 뷰 용)
 */
export function useScheduleDates(tripId: string) {
  return useQuery({
    queryKey: scheduleKeys.dates(tripId),
    queryFn: () =>
      api.get<string[]>(`/api/v1/trips/${tripId}/schedules/dates`),
    enabled: !!tripId,
  });
}

/**
 * 일정 상세 조회
 */
export function useScheduleDetail(scheduleId: string) {
  return useQuery({
    queryKey: scheduleKeys.detail(scheduleId),
    queryFn: () =>
      api.get<Schedule>(`/api/v1/trips/${scheduleId}`),
    enabled: !!scheduleId,
  });
}

/**
 * 일정 상태 변경
 */
export function useUpdateScheduleStatus(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scheduleId, status }: { scheduleId: string; status: string }) =>
      api.patch(`/api/v1/trips/${tripId}/schedules/${scheduleId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...scheduleKeys.all, 'list', tripId],
      });
    },
  });
}

/**
 * 일정 수정 (시간, 메모 등 일반 필드)
 */
export function useUpdateSchedule(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scheduleId, data }: { scheduleId: string; data: any }) =>
      api.patch(`/api/v1/trips/${tripId}/schedules/${scheduleId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
}

/**
 * 일정 순서 맞바꿈
 */
export function useSwapSchedule(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scheduleId, targetScheduleId }: { scheduleId: string; targetScheduleId: string }) =>
      api.patch(`/api/v1/trips/${tripId}/schedules/${scheduleId}/swap`, { targetScheduleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
}
