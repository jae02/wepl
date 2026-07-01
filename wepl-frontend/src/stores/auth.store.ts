/**
 * 인증 상태 관리 스토어 (Zustand)
 * 로그인, 로그아웃, 토큰 복원 등 인증 관련 전역 상태를 관리합니다.
 */

import { create } from 'zustand';
import { storage } from '@/lib/storage';

// ─── 타입 정의 ──────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  nickname: string;
  profileImageUrl: string | null;
  provider: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean; // 앱 시작 시 토큰 복원 중 여부
  isRestoring: boolean; // isLoading alias (화면 호환성)

  // 액션
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
  setUser: (user: User) => void;
}

// ─── 스토어 생성 ────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  isRestoring: true,

  /**
   * 로그인 처리
   * 토큰과 사용자 정보를 스토어 및 AsyncStorage에 저장
   */
  login: async (token: string, user: User) => {
    await Promise.all([
      storage.setToken(token),
      storage.setUser(user),
    ]);

    set({
      token,
      user,
      isAuthenticated: true,
      isLoading: false,
      isRestoring: false,
    });
  },

  /**
   * 로그아웃 처리
   * 스토어 초기화 및 AsyncStorage에서 인증 정보 제거
   */
  logout: async () => {
    await storage.clear();

    set({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isRestoring: false,
    });
  },

  /**
   * 앱 시작 시 토큰/사용자 정보 복원
   * AsyncStorage에서 저장된 인증 정보를 불러옴
   */
  restore: async () => {
    try {
      const [token, user] = await Promise.all([
        storage.getToken(),
        storage.getUser<User>(),
      ]);

      if (token && user) {
        set({
          token,
          user,
          isAuthenticated: true,
          isLoading: false,
          isRestoring: false,
        });
      } else {
        // 토큰 또는 유저 정보가 없으면 인증 해제
        await storage.clear();
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isRestoring: false,
        });
      }
    } catch {
      // 복원 실패 시 안전하게 초기화
      await storage.clear();
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isRestoring: false,
      });
    }
  },

  /**
   * 사용자 정보만 갱신 (프로필 수정 시 등)
   */
  setUser: (user: User) => {
    storage.setUser(user);
    set({ user });
  },
}));
