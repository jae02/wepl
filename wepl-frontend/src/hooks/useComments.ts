/**
 * 코멘트(Comment) 관련 API 훅
 * 위시리스트 장소별 코멘트 조회, 생성, 수정, 삭제 (대댓글 지원)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── 타입 정의 ──────────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  content: string;
  wishlistPlaceId: string;
  authorId: string;
  parentId: string | null;
  author: {
    id: string;
    nickname: string;
    profileImageUrl: string | null;
  };
  children?: Comment[];
  createdAt: string;
  updatedAt: string;
}

interface CreateCommentRequest {
  content: string;
  parentId?: string;
}

interface UpdateCommentRequest {
  content: string;
}

// ─── 쿼리 키 ────────────────────────────────────────────────────────────────────

export const commentKeys = {
  all: ['comments'] as const,
  list: (tripId: string, wishlistId: string) =>
    [...commentKeys.all, 'list', tripId, wishlistId] as const,
};

// ─── 훅 ─────────────────────────────────────────────────────────────────────────

/**
 * 위시리스트 장소의 코멘트 목록 조회 (대댓글 중첩 포함)
 */
export function useComments(tripId: string, wishlistId: string) {
  return useQuery({
    queryKey: commentKeys.list(tripId, wishlistId),
    queryFn: () =>
      api.get<Comment[]>(
        `/api/v1/trips/${tripId}/wishlist/${wishlistId}/comments`,
      ),
    enabled: !!tripId && !!wishlistId,
  });
}

/**
 * 코멘트 생성 (대댓글 시 parentId 포함)
 */
export function useCreateComment(tripId: string, wishlistId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCommentRequest) =>
      api.post<Comment>(
        `/api/v1/trips/${tripId}/wishlist/${wishlistId}/comments`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: commentKeys.list(tripId, wishlistId),
      });
    },
  });
}

/**
 * 코멘트 수정 (작성자 본인만)
 */
export function useUpdateComment(tripId: string, wishlistId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, data }: { commentId: string; data: UpdateCommentRequest }) =>
      api.patch<Comment>(
        `/api/v1/trips/${tripId}/comments/${commentId}`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: commentKeys.list(tripId, wishlistId),
      });
    },
  });
}

/**
 * 코멘트 삭제 (작성자 본인만, 대댓글도 함께 삭제)
 */
export function useDeleteComment(tripId: string, wishlistId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) =>
      api.delete(`/api/v1/trips/${tripId}/comments/${commentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: commentKeys.list(tripId, wishlistId),
      });
    },
  });
}
