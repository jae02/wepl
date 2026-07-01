/**
 * API 클라이언트
 * fetch 기반의 HTTP 클라이언트. 인증 토큰 자동 주입 및 401 응답 시 자동 로그아웃 처리.
 */

import { useAuthStore } from '@/stores/auth.store';

const BASE_URL = 'http://localhost:3000';

// ─── 타입 정의 ──────────────────────────────────────────────────────────────────

interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

export class ApiRequestError extends Error {
  statusCode: number;
  error?: string;

  constructor(data: ApiError) {
    super(data.message);
    this.name = 'ApiRequestError';
    this.statusCode = data.statusCode;
    this.error = data.error;
  }
}

type RequestOptions = Omit<RequestInit, 'method' | 'body'> & {
  params?: Record<string, string | number | boolean | undefined>;
};

// ─── 내부 헬퍼 ──────────────────────────────────────────────────────────────────

/**
 * 쿼리 파라미터 객체를 URL 쿼리 문자열로 변환
 * undefined 값은 무시
 */
function buildQueryString(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return '';

  const entries = Object.entries(params).filter(
    (entry): entry is [string, string | number | boolean] => entry[1] !== undefined,
  );

  if (entries.length === 0) return '';

  const searchParams = new URLSearchParams();
  entries.forEach(([key, value]) => {
    searchParams.append(key, String(value));
  });

  return `?${searchParams.toString()}`;
}

/**
 * 공통 fetch 요청 처리
 */
async function request<T>(
  method: string,
  endpoint: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const { params, ...fetchOptions } = options ?? {};
  const queryString = buildQueryString(params);
  const url = `${BASE_URL}${endpoint}${queryString}`;

  // 인증 토큰 가져오기 (스토어에서 직접 읽기)
  const token = useAuthStore.getState().token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    ...fetchOptions,
  });

  // 401 Unauthorized → 자동 로그아웃
  if (response.status === 401) {
    useAuthStore.getState().logout();
    throw new ApiRequestError({
      message: '인증이 만료되었습니다. 다시 로그인해주세요.',
      statusCode: 401,
      error: 'Unauthorized',
    });
  }

  // 204 No Content 처리
  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new ApiRequestError({
      message: data.message ?? '요청 처리 중 오류가 발생했습니다.',
      statusCode: response.status,
      error: data.error,
    });
  }

  return data as T;
}

// ─── API 클라이언트 객체 ────────────────────────────────────────────────────────

const api = {
  get: <T>(endpoint: string, options?: RequestOptions): Promise<T> => {
    return request<T>('GET', endpoint, undefined, options);
  },

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> => {
    return request<T>('POST', endpoint, body, options);
  },

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> => {
    return request<T>('PATCH', endpoint, body, options);
  },

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> => {
    return request<T>('PUT', endpoint, body, options);
  },

  delete: <T>(endpoint: string, options?: RequestOptions): Promise<T> => {
    return request<T>('DELETE', endpoint, undefined, options);
  },
};

export default api;
