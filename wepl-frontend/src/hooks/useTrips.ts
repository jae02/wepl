/**
 * 여행(Trip) 관련 API 훅
 * 여행 목록 조회, 상세 조회, 생성, 참여, 멤버 조회
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── 타입 정의 ──────────────────────────────────────────────────────────────────

export interface Trip {
  id: string;
  title: string;
  theme: string | null;
  coverImageUrl: string | null;
  startDate: string;
  endDate: string;
  timezone: string;
  currency: string;
  inviteCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface TripMember {
  id: string;
  userId: string;
  tripId: string;
  role: 'OWNER' | 'EDITOR' | 'MEMBER';
  joinedAt: string;
  user: {
    id: string;
    nickname: string;
    profileImageUrl: string | null;
  };
}

interface CreateTripRequest {
  title: string;
  theme?: string;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  currency?: string;
}

interface JoinTripRequest {
  inviteCode: string;
}

// ─── 쿼리 키 ────────────────────────────────────────────────────────────────────

export const tripKeys = {
  all: ['trips'] as const,
  lists: () => [...tripKeys.all, 'list'] as const,
  detail: (tripId: string) => [...tripKeys.all, 'detail', tripId] as const,
  members: (tripId: string) => [...tripKeys.all, 'members', tripId] as const,
};

// ─── 훅 ─────────────────────────────────────────────────────────────────────────

/**
 * 내 여행 목록 조회
 */
export function useTrips() {
  return useQuery({
    queryKey: tripKeys.lists(),
    queryFn: () => api.get<Trip[]>('/api/v1/trips'),
  });
}

/**
 * 여행 상세 조회
 */
export function useTrip(tripId: string) {
  return useQuery({
    queryKey: tripKeys.detail(tripId),
    queryFn: () => api.get<Trip>(`/api/v1/trips/${tripId}`),
    enabled: !!tripId,
  });
}

/**
 * 여행 생성
 */
export function useCreateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTripRequest) =>
      api.post<Trip>('/api/v1/trips', data),
    onSuccess: () => {
      // 목록 갱신
      queryClient.invalidateQueries({ queryKey: tripKeys.lists() });
    },
  });
}

/**
 * 초대 코드로 여행 참여
 */
export function useJoinTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: JoinTripRequest) =>
      api.post<Trip>('/api/v1/trips/join', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.lists() });
    },
  });
}

/**
 * 여행 멤버 목록 조회
 */
export function useTripMembers(tripId: string) {
  return useQuery({
    queryKey: tripKeys.members(tripId),
    queryFn: () => api.get<TripMember[]>(`/api/v1/trips/${tripId}/members`),
    enabled: !!tripId,
  });
}

/**
 * 여행 삭제
 */
export function useDeleteTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tripId: string) =>
      api.delete(`/api/v1/trips/${tripId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.lists() });
    },
  });
}
