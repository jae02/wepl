/**
 * 인증 관련 API 훅
 * React Query + API 클라이언트를 사용한 로그인, 회원가입, 내 정보 조회
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore, type User } from '@/stores/auth.store';

// ─── 타입 정의 ──────────────────────────────────────────────────────────────────

interface LoginRequest {
  email: string;
  password: string;
}

interface SignupRequest {
  email: string;
  password: string;
  nickname: string;
}

interface AuthResponse {
  accessToken: string;
  user: User;
}

// ─── 쿼리 키 ────────────────────────────────────────────────────────────────────

export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
};

// ─── 훅 ─────────────────────────────────────────────────────────────────────────

/**
 * 이메일 로그인
 */
export function useLogin() {
  const login = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: (data: LoginRequest) =>
      api.post<AuthResponse>('/api/v1/auth/login', data),
    onSuccess: async (response) => {
      await login(response.accessToken, response.user);
    },
  });
}

/**
 * 이메일 회원가입
 */
export function useSignup() {
  const login = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: (data: SignupRequest) =>
      api.post<AuthResponse>('/api/v1/auth/signup', data),
    onSuccess: async (response) => {
      // 회원가입 후 자동 로그인 처리
      await login(response.accessToken, response.user);
    },
  });
}

/**
 * 내 정보 조회
 * 인증된 상태에서만 활성화됨
 */
export function useMe() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: authKeys.me(),
    queryFn: () => api.get<User>('/api/v1/auth/me'),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
    onSuccess: (data: User) => {
      // 스토어의 사용자 정보 동기화
      setUser(data);
    },
  } as Parameters<typeof useQuery>[0]);
}
