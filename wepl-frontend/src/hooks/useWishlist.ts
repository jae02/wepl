/**
 * 위시리스트 관련 API 훅
 * 여행별 위시리스트 아이템 조회, 생성, 삭제
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── 타입 정의 ──────────────────────────────────────────────────────────────────

export interface WishlistItem {
  id: string;
  tripId: string;
  name: string;
  category: string;
  address?: string;
  description: string | null;
  url: string | null;
  imageUrl: string | null;
  rating: number | null;
  latitude?: number;
  longitude?: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  _count?: { comments: number; likes: number };
  likes?: { id: string }[];
}

interface CreateWishlistItemRequest {
  name: string;
  category: string;
  address?: string;
  description?: string;
  imageUrl?: string;
  externalUrl?: string;
  googlePlaceId?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  priceLevel?: number;
  comment?: string;
}

// ─── 쿼리 키 ────────────────────────────────────────────────────────────────────

export const wishlistKeys = {
  all: ['wishlist'] as const,
  list: (tripId: string, category?: string) =>
    [...wishlistKeys.all, 'list', tripId, category ?? 'all'] as const,
};

// ─── 훅 ─────────────────────────────────────────────────────────────────────────

/**
 * 위시리스트 목록 조회
 * category가 주어지면 해당 카테고리만 필터링
 */
export function useWishlist(tripId: string, category?: string) {
  return useQuery({
    queryKey: wishlistKeys.list(tripId, category),
    queryFn: () =>
      api.get<WishlistItem[]>(`/api/v1/trips/${tripId}/wishlist`, {
        params: category ? { category } : undefined,
      }),
    enabled: !!tripId,
  });
}

/**
 * 위시리스트 아이템 생성
 */
export function useCreateWishlistItem(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWishlistItemRequest) =>
      api.post<WishlistItem>(`/api/v1/trips/${tripId}/wishlist`, data),
    onSuccess: () => {
      // 모든 위시리스트 쿼리 무효화 (카테고리 필터 포함)
      queryClient.invalidateQueries({
        queryKey: [...wishlistKeys.all, 'list', tripId],
      });
    },
  });
}

/**
 * 위시리스트 아이템 삭제
 */
export function useDeleteWishlistItem(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) =>
      api.delete(`/api/v1/trips/${tripId}/wishlist/${itemId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...wishlistKeys.all, 'list', tripId],
      });
    },
  });
}

/**
 * 주변 추천 장소 조회
 */
export function useRecommendPlaces(tripId: string, lat?: number, lng?: number, radius?: number) {
  return useQuery({
    queryKey: [...wishlistKeys.all, 'recommend', tripId, lat, lng, radius],
    queryFn: () =>
      api.get<WishlistItem[]>(`/api/v1/trips/${tripId}/wishlist/recommend`, {
        params: { lat, lng, radius },
      }),
    enabled: !!tripId && lat !== undefined && lng !== undefined,
  });
}

export const useAddWishlistItem = useCreateWishlistItem;

/**
 * 위시리스트 아이템 좋아요 토글
 */
export function useToggleLike(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) =>
      api.post<{ liked: boolean }>(`/api/v1/trips/${tripId}/wishlist/${itemId}/like`),
    onSuccess: () => {
      // 위시리스트 관련 쿼리 무효화하여 좋아요 수 업데이트
      queryClient.invalidateQueries({
        queryKey: [...wishlistKeys.all, 'list', tripId],
      });
      // 단건 조회도 무효화 가능 (필요시 구현)
    },
  });
}

