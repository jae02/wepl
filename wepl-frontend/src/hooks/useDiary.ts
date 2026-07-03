/**
 * 다이어리(Diary) 관련 API 훅
 * 일정(TimelineSchedule)별 다이어리 조회, 생성, 수정, 삭제
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── 타입 정의 ──────────────────────────────────────────────────────────────────

export interface DiaryPhoto {
  id: string;
  diaryEntryId: string;
  imageUrl: string;
  caption: string | null;
  orderIndex: number;
  createdAt: string;
}

export interface DiaryEntry {
  id: string;
  scheduleId: string;
  authorId: string;
  content: string;
  mood: string | null;
  author: {
    id: string;
    nickname: string;
    profileImageUrl: string | null;
  };
  photos: DiaryPhoto[];
  createdAt: string;
  updatedAt: string;
}

interface CreateDiaryRequest {
  content: string;
  mood?: string;
}

interface UpdateDiaryRequest {
  content?: string;
  mood?: string;
}

// ─── 쿼리 키 ────────────────────────────────────────────────────────────────────

export const diaryKeys = {
  all: ['diary'] as const,
  list: (tripId: string, scheduleId: string) =>
    [...diaryKeys.all, 'list', tripId, scheduleId] as const,
  detail: (tripId: string, diaryId: string) =>
    [...diaryKeys.all, 'detail', tripId, diaryId] as const,
};

// ─── 훅 ─────────────────────────────────────────────────────────────────────────

/**
 * 일정의 다이어리 엔트리 목록 조회
 */
export function useDiary(tripId: string, scheduleId: string) {
  return useQuery({
    queryKey: diaryKeys.list(tripId, scheduleId),
    queryFn: () =>
      api.get<DiaryEntry[]>(
        `/api/v1/trips/${tripId}/schedules/${scheduleId}/diary`,
      ),
    enabled: !!tripId && !!scheduleId,
  });
}

/**
 * 다이어리 엔트리 생성
 */
export function useCreateDiary(tripId: string, scheduleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDiaryRequest) =>
      api.post<DiaryEntry>(
        `/api/v1/trips/${tripId}/schedules/${scheduleId}/diary`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: diaryKeys.list(tripId, scheduleId),
      });
    },
  });
}

/**
 * 다이어리 엔트리 수정 (작성자 본인만)
 */
export function useUpdateDiary(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ diaryId, data }: { diaryId: string; data: UpdateDiaryRequest }) =>
      api.patch<DiaryEntry>(
        `/api/v1/trips/${tripId}/diary/${diaryId}`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...diaryKeys.all],
      });
    },
  });
}

/**
 * 다이어리 엔트리 삭제 (작성자 본인만)
 */
export function useDeleteDiary(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (diaryId: string) =>
      api.delete(`/api/v1/trips/${tripId}/diary/${diaryId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...diaryKeys.all],
      });
    },
  });
}
