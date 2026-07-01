/**
 * AsyncStorage 래퍼
 * 토큰 및 사용자 정보 영속 저장을 위한 유틸리티
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TOKEN: 'wepl_token',
  USER: 'wepl_user',
} as const;

export const storage = {
  // ── 토큰 관리 ──────────────────────────────────────────────────────────────

  getToken: (): Promise<string | null> => {
    return AsyncStorage.getItem(KEYS.TOKEN);
  },

  setToken: (token: string): Promise<void> => {
    return AsyncStorage.setItem(KEYS.TOKEN, token);
  },

  removeToken: (): Promise<void> => {
    return AsyncStorage.removeItem(KEYS.TOKEN);
  },

  // ── 사용자 정보 관리 ──────────────────────────────────────────────────────

  getUser: async <T = unknown>(): Promise<T | null> => {
    try {
      const raw = await AsyncStorage.getItem(KEYS.USER);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      // JSON 파싱 실패 시 null 반환
      return null;
    }
  },

  setUser: (user: unknown): Promise<void> => {
    return AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
  },

  removeUser: (): Promise<void> => {
    return AsyncStorage.removeItem(KEYS.USER);
  },

  // ── 전체 초기화 ────────────────────────────────────────────────────────────

  clear: (): Promise<void> => {
    return AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USER]);
  },
};
