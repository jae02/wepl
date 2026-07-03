/**
 * 체크리스트(Checklist) 관련 API 훅
 * 일정(TimelineSchedule)별 체크리스트 조회, 생성, 토글, 수정, 삭제
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── 타입 정의 ──────────────────────────────────────────────────────────────────

export interface ChecklistItem {
  id: string;
  scheduleId: string;
  title: string;
  isChecked: boolean;
  assigneeId: string | null;
  assignee: {
    id: string;
    nickname: string;
    profileImageUrl: string | null;
  } | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateChecklistRequest {
  title: string;
  assigneeId?: string;
}

interface UpdateChecklistRequest {
  title?: string;
  assigneeId?: string | null;
}

// ─── 쿼리 키 ────────────────────────────────────────────────────────────────────

export const checklistKeys = {
  all: ['checklist'] as const,
  list: (tripId: string, scheduleId: string) =>
    [...checklistKeys.all, 'list', tripId, scheduleId] as const,
};

// ─── 훅 ─────────────────────────────────────────────────────────────────────────

/**
 * 일정의 체크리스트 목록 조회
 */
export function useChecklist(tripId: string, scheduleId: string) {
  return useQuery({
    queryKey: checklistKeys.list(tripId, scheduleId),
    queryFn: () =>
      api.get<ChecklistItem[]>(
        `/api/v1/trips/${tripId}/schedules/${scheduleId}/checklist`,
      ),
    enabled: !!tripId && !!scheduleId,
  });
}

/**
 * 체크리스트 항목 생성
 */
export function useCreateChecklistItem(tripId: string, scheduleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChecklistRequest) =>
      api.post<ChecklistItem>(
        `/api/v1/trips/${tripId}/schedules/${scheduleId}/checklist`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: checklistKeys.list(tripId, scheduleId),
      });
    },
  });
}

/**
 * 체크리스트 항목 체크/해제 토글
 */
export function useToggleChecklistItem(tripId: string, scheduleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) =>
      api.patch<ChecklistItem>(
        `/api/v1/trips/${tripId}/checklist/${itemId}/toggle`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: checklistKeys.list(tripId, scheduleId),
      });
    },
  });
}

/**
 * 체크리스트 항목 수정
 */
export function useUpdateChecklistItem(tripId: string, scheduleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: UpdateChecklistRequest }) =>
      api.patch<ChecklistItem>(
        `/api/v1/trips/${tripId}/checklist/${itemId}`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: checklistKeys.list(tripId, scheduleId),
      });
    },
  });
}

/**
 * 체크리스트 항목 삭제
 */
export function useDeleteChecklistItem(tripId: string, scheduleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) =>
      api.delete(`/api/v1/trips/${tripId}/checklist/${itemId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: checklistKeys.list(tripId, scheduleId),
      });
    },
  });
}
