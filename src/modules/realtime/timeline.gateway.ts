// =============================================================================
// Timeline WebSocket Gateway - 실시간 동기화 & 동시성 충돌 방지
// Socket.io를 활용한 타임라인 드래그&드롭 + 인라인 편집 동기화
// =============================================================================

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { PrismaService } from '../prisma/prisma.service';

// ─────────────────────────────────────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────────────────────────────────────

/** 카드 이동 이벤트 페이로드 */
interface MoveCardPayload {
  scheduleId: string;
  fromDate: string;          // ISO date (예: "2026-07-15")
  toDate: string;            // ISO date
  newOrderIndex: number;
  optimisticId: string;      // 낙관적 업데이트용 클라이언트 ID
}

/** 카드 인라인 편집 이벤트 페이로드 */
interface EditCardPayload {
  scheduleId: string;
  field: 'startTime' | 'endTime' | 'memo' | 'customTitle';
  value: string;
  optimisticId: string;
}

/** 카드 편집 잠금 페이로드 */
interface LockCardPayload {
  scheduleId: string;
}

/** 위시리스트 → 타임라인 배치 페이로드 */
interface PlaceCardPayload {
  wishlistPlaceId: string;
  date: string;              // ISO date
  orderIndex: number;
  startTime?: string;
  optimisticId: string;
}

/** 편집 잠금 상태 */
interface EditLock {
  userId: string;
  nickname: string;
  lockedAt: number;          // timestamp
}

// ─────────────────────────────────────────────────────────────────────────────
// Gateway
// ─────────────────────────────────────────────────────────────────────────────

@WebSocketGateway({
  namespace: '/timeline',
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
@UseGuards(WsJwtGuard)
export class TimelineGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TimelineGateway.name);

  // ──────────────────────────────────────────────────────────────────────
  // 편집 잠금 관리 (In-Memory → 프로덕션에서는 Redis로 교체 권장)
  // Key: scheduleId, Value: EditLock
  // ──────────────────────────────────────────────────────────────────────
  private editLocks = new Map<string, EditLock>();

  // 잠금 자동 해제 타임아웃 (30초)
  private readonly LOCK_TIMEOUT_MS = 30_000;

  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────────────────
  // 연결 관리
  // ──────────────────────────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    const { tripId, userId, nickname } = client.handshake.query as {
      tripId: string;
      userId: string;
      nickname: string;
    };

    // Trip Room에 참가
    client.join(`trip:${tripId}`);
    client.data = { tripId, userId, nickname };

    this.logger.log(`✅ ${nickname}(${userId}) joined trip:${tripId}`);

    // 다른 참여자들에게 온라인 알림
    client.to(`trip:${tripId}`).emit('user:joined', {
      userId,
      nickname,
      timestamp: Date.now(),
    });

    // 현재 편집 잠금 상태 전송
    const currentLocks = Object.fromEntries(
      [...this.editLocks.entries()].filter(([key]) =>
        key.startsWith(`trip:${tripId}:`),
      ),
    );
    client.emit('locks:state', currentLocks);
  }

  async handleDisconnect(client: Socket) {
    const { tripId, userId, nickname } = client.data;

    // 해당 사용자의 모든 잠금 해제
    this.releaseAllUserLocks(userId, tripId);

    client.to(`trip:${tripId}`).emit('user:left', {
      userId,
      nickname,
      timestamp: Date.now(),
    });

    this.logger.log(`❌ ${nickname}(${userId}) left trip:${tripId}`);
  }

  // ──────────────────────────────────────────────────────────────────────
  // 📌 카드 편집 잠금 (Optimistic Locking)
  //
  // 전략: "편집 의도 선언" 방식
  // - 사용자가 카드를 터치/클릭하면 잠금 요청
  // - 이미 다른 사용자가 잠그고 있으면 거절
  // - 30초 후 자동 해제 (비정상 종료 대비)
  // ──────────────────────────────────────────────────────────────────────

  @SubscribeMessage('card:lock')
  handleLockCard(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LockCardPayload,
  ) {
    const { tripId, userId, nickname } = client.data;
    const lockKey = `trip:${tripId}:${payload.scheduleId}`;
    const existingLock = this.editLocks.get(lockKey);

    // 이미 다른 사용자가 잠금 중
    if (existingLock && existingLock.userId !== userId) {
      const elapsed = Date.now() - existingLock.lockedAt;

      // 타임아웃 초과 시 강제 해제
      if (elapsed > this.LOCK_TIMEOUT_MS) {
        this.editLocks.delete(lockKey);
      } else {
        client.emit('card:lock:rejected', {
          scheduleId: payload.scheduleId,
          lockedBy: existingLock.nickname,
          remainingMs: this.LOCK_TIMEOUT_MS - elapsed,
        });
        return;
      }
    }

    // 잠금 설정
    this.editLocks.set(lockKey, {
      userId,
      nickname,
      lockedAt: Date.now(),
    });

    // 같은 방의 모든 참여자에게 잠금 상태 브로드캐스트
    this.server.to(`trip:${tripId}`).emit('card:locked', {
      scheduleId: payload.scheduleId,
      userId,
      nickname,
    });
  }

  @SubscribeMessage('card:unlock')
  handleUnlockCard(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LockCardPayload,
  ) {
    const { tripId, userId } = client.data;
    const lockKey = `trip:${tripId}:${payload.scheduleId}`;
    const existingLock = this.editLocks.get(lockKey);

    // 본인의 잠금만 해제 가능
    if (existingLock?.userId === userId) {
      this.editLocks.delete(lockKey);

      this.server.to(`trip:${tripId}`).emit('card:unlocked', {
        scheduleId: payload.scheduleId,
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // 🔄 카드 이동 (드래그 앤 드롭)
  //
  // 전략: Optimistic Update + Server Reconciliation
  // 1. 클라이언트가 먼저 UI를 업데이트 (낙관적 업데이트)
  // 2. 서버에 이벤트 전송
  // 3. 서버가 DB 업데이트 후 확인/거절 응답
  // 4. 다른 클라이언트에게 변경 브로드캐스트
  // ──────────────────────────────────────────────────────────────────────

  @SubscribeMessage('card:move')
  async handleMoveCard(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MoveCardPayload,
  ) {
    const { tripId, userId } = client.data;

    try {
      // DB 업데이트: 트랜잭션으로 원자적 처리
      await this.prisma.$transaction(async (tx) => {
        // 1. 기존 날짜의 카드들 orderIndex 재정렬
        if (payload.fromDate !== payload.toDate) {
          await tx.$executeRaw`
            UPDATE timeline_schedules
            SET order_index = order_index - 1
            WHERE trip_id = ${tripId}
              AND date = ${payload.fromDate}::DATE
              AND order_index > (
                SELECT order_index FROM timeline_schedules WHERE id = ${payload.scheduleId}
              )
          `;
        }

        // 2. 새 날짜에서 삽입 위치 이후 카드들의 orderIndex 밀기
        await tx.$executeRaw`
          UPDATE timeline_schedules
          SET order_index = order_index + 1
          WHERE trip_id = ${tripId}
            AND date = ${payload.toDate}::DATE
            AND order_index >= ${payload.newOrderIndex}
            AND id != ${payload.scheduleId}
        `;

        // 3. 해당 카드 이동
        await tx.timelineSchedule.update({
          where: { id: payload.scheduleId },
          data: {
            date: new Date(payload.toDate),
            orderIndex: payload.newOrderIndex,
          },
        });
      });

      // ✅ 성공: 요청한 클라이언트에게 확인
      client.emit('card:move:ack', {
        optimisticId: payload.optimisticId,
        status: 'confirmed',
      });

      // 다른 클라이언트들에게 브로드캐스트
      client.to(`trip:${tripId}`).emit('card:moved', {
        scheduleId: payload.scheduleId,
        fromDate: payload.fromDate,
        toDate: payload.toDate,
        newOrderIndex: payload.newOrderIndex,
        movedBy: userId,
      });
    } catch (error) {
      this.logger.error(`카드 이동 실패: ${error}`);

      // ❌ 실패: 클라이언트에게 롤백 요청
      client.emit('card:move:ack', {
        optimisticId: payload.optimisticId,
        status: 'rejected',
        reason: '카드 이동에 실패했습니다. 다시 시도해주세요.',
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // ✏️ 카드 인라인 편집 (시간, 메모 등)
  //
  // 디바운스는 클라이언트에서 처리 (300ms)
  // 서버는 최종 값만 저장
  // ──────────────────────────────────────────────────────────────────────

  @SubscribeMessage('card:edit')
  async handleEditCard(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: EditCardPayload,
  ) {
    const { tripId, userId } = client.data;

    try {
      // 허용된 필드만 업데이트 (SQL Injection 방지)
      const allowedFields = ['startTime', 'endTime', 'memo', 'customTitle'];
      if (!allowedFields.includes(payload.field)) {
        throw new Error(`허용되지 않은 필드: ${payload.field}`);
      }

      await this.prisma.timelineSchedule.update({
        where: { id: payload.scheduleId },
        data: { [payload.field]: payload.value },
      });

      client.emit('card:edit:ack', {
        optimisticId: payload.optimisticId,
        status: 'confirmed',
      });

      // 다른 참여자에게 변경 사항 전파
      client.to(`trip:${tripId}`).emit('card:edited', {
        scheduleId: payload.scheduleId,
        field: payload.field,
        value: payload.value,
        editedBy: userId,
      });
    } catch (error) {
      client.emit('card:edit:ack', {
        optimisticId: payload.optimisticId,
        status: 'rejected',
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // 📌 위시리스트 → 타임라인 카드 배치
  // ──────────────────────────────────────────────────────────────────────

  @SubscribeMessage('card:place')
  async handlePlaceCard(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PlaceCardPayload,
  ) {
    const { tripId, userId } = client.data;

    try {
      const schedule = await this.prisma.$transaction(async (tx) => {
        // 위시리스트 장소를 타임라인에 배치
        const created = await tx.timelineSchedule.create({
          data: {
            tripId,
            wishlistPlaceId: payload.wishlistPlaceId,
            date: new Date(payload.date),
            orderIndex: payload.orderIndex,
            startTime: payload.startTime,
          },
          include: {
            wishlistPlace: true,
          },
        });

        // 위시리스트 카드의 isPlaced 플래그 업데이트
        await tx.wishlistPlace.update({
          where: { id: payload.wishlistPlaceId },
          data: { isPlaced: true },
        });

        return created;
      });

      client.emit('card:place:ack', {
        optimisticId: payload.optimisticId,
        status: 'confirmed',
        schedule,
      });

      client.to(`trip:${tripId}`).emit('card:placed', {
        schedule,
        placedBy: userId,
      });
    } catch (error) {
      client.emit('card:place:ack', {
        optimisticId: payload.optimisticId,
        status: 'rejected',
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // 유틸리티
  // ──────────────────────────────────────────────────────────────────────

  private releaseAllUserLocks(userId: string, tripId: string) {
    const prefix = `trip:${tripId}:`;
    for (const [key, lock] of this.editLocks.entries()) {
      if (key.startsWith(prefix) && lock.userId === userId) {
        this.editLocks.delete(key);
        const scheduleId = key.replace(prefix, '');
        this.server.to(`trip:${tripId}`).emit('card:unlocked', { scheduleId });
      }
    }
  }
}
