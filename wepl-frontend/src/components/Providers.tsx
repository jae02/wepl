/**
 * 앱 프로바이더 래퍼
 * React Query 등 전역 프로바이더를 구성합니다.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ─── React Query 클라이언트 설정 ────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000, // 30초간 데이터 신선도 유지
      gcTime: 5 * 60 * 1000, // 5분간 가비지 컬렉션 방지
      refetchOnWindowFocus: false, // 모바일에서는 불필요
    },
    mutations: {
      retry: 0, // 뮤테이션은 재시도하지 않음
    },
  },
});

// ─── 프로바이더 컴포넌트 ────────────────────────────────────────────────────────

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
