// =============================================================================
// useTimelineSync - 타임라인 실시간 동기화 커스텀 훅
// Zustand 상태 관리 + Socket.io 실시간 이벤트 바인딩
// =============================================================================

import { useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { nanoid } from 'nanoid';

// ─────────────────────────────────────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────────────────────────────────────

interface ScheduleCard {
  id: string;
  wishlistPlaceId?: string;
  date: string;         // ISO date
  startTime?: string;
  endTime?: string;
  orderIndex: number;
  memo?: string;
  customTitle?: string;
  wishlistPlace?: {
    name: string;
    category: string;
    address?: string;
    imageUrl?: string;
    latitude?: number;
    longitude?: number;
  };
}

interface EditLock {
  scheduleId: string;
  userId: string;
  nickname: string;
}

interface OnlineUser {
  userId: string;
  nickname: string;
}

interface PendingOperation {
  optimisticId: string;
  type: 'move' | 'edit' | 'place';
  rollback: () => void; // 실패 시 롤백 함수
}

// ─────────────────────────────────────────────────────────────────────────────
// Zustand Store (immer 미들웨어로 불변 업데이트 간소화)
// ─────────────────────────────────────────────────────────────────────────────

interface TimelineState {
  // 데이터
  schedulesByDate: Record<string, ScheduleCard[]>;  // { "2026-07-15": [...cards] }
  editLocks: Record<string, EditLock>;               // { scheduleId: lock }
  onlineUsers: OnlineUser[];
  pendingOps: Record<string, PendingOperation>;      // 낙관적 업데이트 추적

  // 연결 상태
  isConnected: boolean;
  connectionError: string | null;

  // Actions
  setSchedules: (date: string, cards: ScheduleCard[]) => void;
  moveCard: (
    scheduleId: string,
    fromDate: string,
    toDate: string,
    newOrderIndex: number,
  ) => ScheduleCard | null; // 이전 상태 반환 (롤백용)
  updateCardField: (
    scheduleId: string,
    field: string,
    value: string,
  ) => string | null; // 이전 값 반환
  addCard: (card: ScheduleCard) => void;
  removeCard: (scheduleId: string, date: string) => void;
  setEditLock: (lock: EditLock) => void;
  removeEditLock: (scheduleId: string) => void;
  addOnlineUser: (user: OnlineUser) => void;
  removeOnlineUser: (userId: string) => void;
  addPendingOp: (op: PendingOperation) => void;
  removePendingOp: (optimisticId: string) => void;
  setConnectionStatus: (connected: boolean, error?: string | null) => void;
}

export const useTimelineStore = create<TimelineState>()(
  immer((set, get) => ({
    schedulesByDate: {},
    editLocks: {},
    onlineUsers: [],
    pendingOps: {},
    isConnected: false,
    connectionError: null,

    setSchedules: (date, cards) =>
      set((state) => {
        state.schedulesByDate[date] = cards.sort(
          (a, b) => a.orderIndex - b.orderIndex,
        );
      }),

    moveCard: (scheduleId, fromDate, toDate, newOrderIndex) => {
      let movedCard: ScheduleCard | null = null;

      set((state) => {
        const fromCards = state.schedulesByDate[fromDate] || [];
        const cardIndex = fromCards.findIndex((c) => c.id === scheduleId);
        if (cardIndex === -1) return;

        // 카드 추출
        movedCard = { ...fromCards[cardIndex] };
        fromCards.splice(cardIndex, 1);

        // 원래 날짜 재정렬
        fromCards.forEach((c, i) => {
          c.orderIndex = i;
        });

        // 새 날짜에 삽입
        const toCards = state.schedulesByDate[toDate] || [];
        const updatedCard = {
          ...movedCard!,
          date: toDate,
          orderIndex: newOrderIndex,
        };
        toCards.splice(newOrderIndex, 0, updatedCard);

        // 새 날짜 재정렬
        toCards.forEach((c, i) => {
          c.orderIndex = i;
        });

        state.schedulesByDate[fromDate] = fromCards;
        state.schedulesByDate[toDate] = toCards;
      });

      return movedCard;
    },

    updateCardField: (scheduleId, field, value) => {
      let previousValue: string | null = null;

      set((state) => {
        for (const cards of Object.values(state.schedulesByDate)) {
          const card = (cards as ScheduleCard[]).find(
            (c) => c.id === scheduleId,
          );
          if (card) {
            previousValue = (card as any)[field] ?? null;
            (card as any)[field] = value;
            break;
          }
        }
      });

      return previousValue;
    },

    addCard: (card) =>
      set((state) => {
        const cards = state.schedulesByDate[card.date] || [];
        cards.push(card);
        cards.sort((a, b) => a.orderIndex - b.orderIndex);
        state.schedulesByDate[card.date] = cards;
      }),

    removeCard: (scheduleId, date) =>
      set((state) => {
        const cards = state.schedulesByDate[date] || [];
        state.schedulesByDate[date] = cards.filter(
          (c) => c.id !== scheduleId,
        );
      }),

    setEditLock: (lock) =>
      set((state) => {
        state.editLocks[lock.scheduleId] = lock;
      }),

    removeEditLock: (scheduleId) =>
      set((state) => {
        delete state.editLocks[scheduleId];
      }),

    addOnlineUser: (user) =>
      set((state) => {
        if (!state.onlineUsers.find((u) => u.userId === user.userId)) {
          state.onlineUsers.push(user);
        }
      }),

    removeOnlineUser: (userId) =>
      set((state) => {
        state.onlineUsers = state.onlineUsers.filter(
          (u) => u.userId !== userId,
        );
      }),

    addPendingOp: (op) =>
      set((state) => {
        state.pendingOps[op.optimisticId] = op;
      }),

    removePendingOp: (optimisticId) =>
      set((state) => {
        delete state.pendingOps[optimisticId];
      }),

    setConnectionStatus: (connected, error = null) =>
      set((state) => {
        state.isConnected = connected;
        state.connectionError = error;
      }),
  })),
);

// ─────────────────────────────────────────────────────────────────────────────
// 커스텀 훅: Socket.io 연결 + 이벤트 바인딩
// ─────────────────────────────────────────────────────────────────────────────

interface UseTimelineSyncOptions {
  tripId: string;
  userId: string;
  nickname: string;
  serverUrl: string;
  token: string;
}

export function useTimelineSync(options: UseTimelineSyncOptions) {
  const socketRef = useRef<Socket | null>(null);
  const store = useTimelineStore();

  // ── Socket 연결 및 이벤트 바인딩 ───────────────────────────────────────
  useEffect(() => {
    const socket = io(`${options.serverUrl}/timeline`, {
      transports: ['websocket'],
      auth: { token: options.token },
      query: {
        tripId: options.tripId,
        userId: options.userId,
        nickname: options.nickname,
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // 연결 이벤트
    socket.on('connect', () => {
      store.setConnectionStatus(true);
    });

    socket.on('disconnect', () => {
      store.setConnectionStatus(false);
    });

    socket.on('connect_error', (err) => {
      store.setConnectionStatus(false, err.message);
    });

    // ── 참여자 이벤트 ──────────────────────────────────────────────────
    socket.on('user:joined', (data: OnlineUser) => {
      store.addOnlineUser(data);
    });

    socket.on('user:left', (data: { userId: string }) => {
      store.removeOnlineUser(data.userId);
    });

    // ── 편집 잠금 이벤트 ────────────────────────────────────────────────
    socket.on('card:locked', (lock: EditLock) => {
      store.setEditLock(lock);
    });

    socket.on('card:unlocked', (data: { scheduleId: string }) => {
      store.removeEditLock(data.scheduleId);
    });

    socket.on('card:lock:rejected', (data: any) => {
      // TODO: 토스트 알림 "OO님이 편집 중입니다"
      console.warn(`편집 잠금 거절: ${data.lockedBy}님이 편집 중`);
    });

    // ── 카드 이동 이벤트 (다른 참여자의 변경) ────────────────────────────
    socket.on('card:moved', (data: any) => {
      if (data.movedBy !== options.userId) {
        store.moveCard(
          data.scheduleId,
          data.fromDate,
          data.toDate,
          data.newOrderIndex,
        );
      }
    });

    // ── 카드 편집 이벤트 ────────────────────────────────────────────────
    socket.on('card:edited', (data: any) => {
      if (data.editedBy !== options.userId) {
        store.updateCardField(data.scheduleId, data.field, data.value);
      }
    });

    // ── 카드 배치 이벤트 ────────────────────────────────────────────────
    socket.on('card:placed', (data: any) => {
      if (data.placedBy !== options.userId) {
        store.addCard(data.schedule);
      }
    });

    // ── 낙관적 업데이트 확인/롤백 ────────────────────────────────────────
    const handleAck = (data: { optimisticId: string; status: string }) => {
      const pending = store.pendingOps[data.optimisticId];
      if (!pending) return;

      if (data.status === 'rejected' && pending.rollback) {
        pending.rollback(); // 실패 시 UI 롤백
      }

      store.removePendingOp(data.optimisticId);
    };

    socket.on('card:move:ack', handleAck);
    socket.on('card:edit:ack', handleAck);
    socket.on('card:place:ack', handleAck);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [options.tripId, options.userId]);

  // ── 액션 함수들 (컴포넌트에서 호출) ────────────────────────────────────

  /** 카드 드래그 앤 드롭 이동 */
  const moveCard = useCallback(
    (scheduleId: string, fromDate: string, toDate: string, newOrderIndex: number) => {
      const optimisticId = nanoid();

      // 1. 낙관적 업데이트 (UI 즉시 반영)
      const previousCard = store.moveCard(scheduleId, fromDate, toDate, newOrderIndex);

      // 2. 롤백 함수 등록
      store.addPendingOp({
        optimisticId,
        type: 'move',
        rollback: () => {
          if (previousCard) {
            store.moveCard(scheduleId, toDate, fromDate, previousCard.orderIndex);
          }
        },
      });

      // 3. 서버에 전송
      socketRef.current?.emit('card:move', {
        scheduleId,
        fromDate,
        toDate,
        newOrderIndex,
        optimisticId,
      });
    },
    [store],
  );

  /** 카드 인라인 편집 (디바운스 300ms는 컴포넌트에서 처리) */
  const editCard = useCallback(
    (scheduleId: string, field: string, value: string) => {
      const optimisticId = nanoid();

      // 낙관적 업데이트
      const previousValue = store.updateCardField(scheduleId, field, value);

      store.addPendingOp({
        optimisticId,
        type: 'edit',
        rollback: () => {
          if (previousValue !== null) {
            store.updateCardField(scheduleId, field, previousValue);
          }
        },
      });

      socketRef.current?.emit('card:edit', {
        scheduleId,
        field,
        value,
        optimisticId,
      });
    },
    [store],
  );

  /** 편집 잠금 요청 */
  const lockCard = useCallback((scheduleId: string) => {
    socketRef.current?.emit('card:lock', { scheduleId });
  }, []);

  /** 편집 잠금 해제 */
  const unlockCard = useCallback((scheduleId: string) => {
    socketRef.current?.emit('card:unlock', { scheduleId });
  }, []);

  return {
    moveCard,
    editCard,
    lockCard,
    unlockCard,
    isConnected: store.isConnected,
    onlineUsers: store.onlineUsers,
    editLocks: store.editLocks,
    schedulesByDate: store.schedulesByDate,
  };
}
