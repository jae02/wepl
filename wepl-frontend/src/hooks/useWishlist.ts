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
  title: string;
  category: string;
  description: string | null;
  url: string | null;
  imageUrl: string | null;
  rating: number | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
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

// 화면에서 사용하는 alias
export const useAddWishlistItem = useCreateWishlistItem;

