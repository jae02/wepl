/**
 * 웹 전용 타임라인 — 엑셀 스타일 시간별 타임테이블
 * 좌측 날짜 패널 + 우측 시간별 그리드 + 위시리스트 빠른 추가
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { colors, getThemeColors } from '@/theme';
import { useSchedules, useScheduleDates, useUpdateSchedule, useSwapSchedule, useCreateSchedule } from '@/hooks/useSchedules';
import { useTrip } from '@/hooks/useTrips';
import { useWishlist } from '@/hooks/useWishlist';
import type { WishlistItem } from '@/hooks/useWishlist';
import {
  useChecklist,
  useCreateChecklistItem,
  useToggleChecklistItem,
  useDeleteChecklistItem,
} from '@/hooks/useChecklist';
import type { ChecklistItem } from '@/hooks/useChecklist';
import { useJsApiLoader, GoogleMap, Marker, Polyline } from '@react-google-maps/api';

const LIBRARIES: any = ['places'];

// ─── Constants ────────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0~23
const DISPLAY_HOURS = HOURS.filter(h => h >= 6 && h <= 23); // 06:00~23:00 기본 표시

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  PLANNED: { label: '예정', color: '#3B82F6', bg: '#3B82F620', icon: '📋' },
  ONGOING: { label: '진행중', color: '#F59E0B', bg: '#F59E0B20', icon: '▶️' },
  COMPLETED: { label: '완료', color: '#10B981', bg: '#10B98120', icon: '✅' },
  SKIPPED: { label: '건너뜀', color: '#6B7280', bg: '#6B728020', icon: '⏭️' },
};

const CATEGORY_ICONS: Record<string, string> = {
  FOOD: '🍽️',
  CAFE: '☕',
  ATTRACTION: '🏛️',
  ACTIVITY: '🎯',
  SHOPPING: '🛍️',
  ACCOMMODATION: '🏨',
  TRANSPORT: '🚗',
  OTHER: '📌',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateKR(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
  } catch {
    return dateStr;
  }
}

function formatDateFull(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  } catch {
    return dateStr;
  }
}

function getDatesInRange(start: string, end: string): string[] {
  try {
    const dates: string[] = [];
    let current = new Date(start);
    const endDate = new Date(end);
    let count = 0;
    while (current <= endDate && count < 60) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
      count++;
    }
    return dates;
  } catch {
    return [];
  }
}

function getDayNumber(dateStr: string, startDateStr: string): number {
  try {
    const d = new Date(dateStr);
    const s = new Date(startDateStr);
    return Math.floor((d.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  } catch {
    return 0;
  }
}

function parseHour(timeStr: string | null): number | null {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  return parts.length >= 1 ? parseInt(parts[0], 10) : null;
}

function formatHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

function getScheduleSpan(item: any): { startHour: number; endHour: number } {
  const sh = parseHour(item.startTime);
  const eh = parseHour(item.endTime);
  return {
    startHour: sh ?? 9,
    endHour: eh ?? ((sh ?? 9) + 1),
  };
}

// ─── Checklist Panel ──────────────────────────────────────────────────────────

function ChecklistPanel({
  tripId,
  scheduleId,
  isDark,
  theme,
}: {
  tripId: string;
  scheduleId: string;
  isDark: boolean;
  theme: ReturnType<typeof getThemeColors>;
}) {
  const { data: items, isLoading } = useChecklist(tripId, scheduleId);
  const createItem = useCreateChecklistItem(tripId, scheduleId);
  const toggleItem = useToggleChecklistItem(tripId, scheduleId);
  const deleteItem = useDeleteChecklistItem(tripId, scheduleId);
  const [newTitle, setNewTitle] = useState('');

  const handleAdd = useCallback(() => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    createItem.mutate({ title: trimmed });
    setNewTitle('');
  }, [newTitle, createItem]);

  if (isLoading) {
    return <ActivityIndicator color={colors.primary[500]} style={{ marginTop: 16 }} />;
  }

  const list: ChecklistItem[] = items ?? [];

  return (
    <View style={{ padding: 12 }}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <TextInput
          style={{
            flex: 1, fontSize: 13, paddingVertical: 8, paddingHorizontal: 12,
            borderRadius: 8, borderWidth: 1,
            color: theme.text,
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          }}
          placeholder="새 항목 추가..."
          placeholderTextColor={theme.textTertiary}
          value={newTitle}
          onChangeText={setNewTitle}
          onSubmitEditing={handleAdd}
        />
        <Pressable
          onPress={handleAdd}
          style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.primary[500], alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } as any}
        >
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>+</Text>
        </Pressable>
      </View>
      {list.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => toggleItem.mutate(item.id)}
          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8, cursor: 'pointer' } as any}
        >
          <View style={{
            width: 18, height: 18, borderRadius: 4, borderWidth: 2,
            borderColor: item.isChecked ? colors.primary[500] : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'),
            backgroundColor: item.isChecked ? colors.primary[500] : 'transparent',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {item.isChecked && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✓</Text>}
          </View>
          <Text style={{
            flex: 1, fontSize: 13, color: item.isChecked ? theme.textTertiary : theme.text,
            textDecorationLine: item.isChecked ? 'line-through' : 'none',
          }} numberOfLines={1}>{item.title}</Text>
          <Pressable onPress={(e) => { e.stopPropagation(); deleteItem.mutate(item.id); }}
            style={{ cursor: 'pointer' } as any}>
            <Text style={{ color: colors.error, fontSize: 12 }}>✕</Text>
          </Pressable>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Wishlist Quick-Add Dropdown ─────────────────────────────────────────────

function WishlistDropdown({
  tripId,
  date,
  hour,
  isDark,
  theme,
  onClose,
}: {
  tripId: string;
  date: string;
  hour: number;
  isDark: boolean;
  theme: ReturnType<typeof getThemeColors>;
  onClose: () => void;
}) {
  const { data: wishlist } = useWishlist(tripId);
  const createSchedule = useCreateSchedule(tripId);
  const [customTitle, setCustomTitle] = useState('');

  const handleAddFromWishlist = (item: WishlistItem) => {
    createSchedule.mutate({
      date,
      wishlistPlaceId: item.id,
      customTitle: item.name,
    }, {
      onSuccess: () => onClose(),
    });
  };

  const handleAddCustom = () => {
    if (!customTitle.trim()) return;
    createSchedule.mutate({
      date,
      customTitle: customTitle.trim(),
    }, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={dropStyles.overlay} onPress={onClose}>
        <Pressable style={[dropStyles.container, {
          backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        }]} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={dropStyles.header}>
            <Text style={[dropStyles.headerTitle, { color: theme.text }]}>
              📅 {formatDateKR(date)} {formatHour(hour)} 일정 추가
            </Text>
            <Pressable onPress={onClose} style={{ cursor: 'pointer' } as any}>
              <Text style={{ fontSize: 20, color: theme.textSecondary }}>✕</Text>
            </Pressable>
          </View>

          {/* Custom input */}
          <View style={{ padding: 16, borderBottomWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 8 }}>
              ✏️ 직접 입력
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={{
                  flex: 1, fontSize: 14, paddingVertical: 10, paddingHorizontal: 14,
                  borderRadius: 10, borderWidth: 1,
                  color: theme.text,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                  borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                }}
                placeholder="예: 호텔 체크인, 공항 이동..."
                placeholderTextColor={theme.textTertiary}
                value={customTitle}
                onChangeText={setCustomTitle}
                onSubmitEditing={handleAddCustom}
                autoFocus
              />
              <Pressable
                onPress={handleAddCustom}
                style={({ hovered }: any) => [{
                  paddingHorizontal: 16, paddingVertical: 10,
                  backgroundColor: colors.primary[500], borderRadius: 10,
                  cursor: 'pointer',
                }, hovered && { opacity: 0.85 }] as any}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>추가</Text>
              </Pressable>
            </View>
          </View>

          {/* Wishlist items */}
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 10 }}>
              📌 위시리스트에서 추가
            </Text>
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {(!wishlist || wishlist.length === 0) ? (
                <Text style={{ color: theme.textTertiary, fontSize: 13, paddingVertical: 20, textAlign: 'center' }}>
                  위시리스트가 비어있습니다
                </Text>
              ) : (
                wishlist.map((item: WishlistItem) => (
                  <Pressable
                    key={item.id}
                    onPress={() => handleAddFromWishlist(item)}
                    style={({ hovered }: any) => [{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      paddingVertical: 12, paddingHorizontal: 14,
                      borderRadius: 10, marginBottom: 4,
                      cursor: 'pointer',
                    },
                    hovered && {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                    }] as any}
                  >
                    <Text style={{ fontSize: 20 }}>
                      {CATEGORY_ICONS[item.category] ?? '📌'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.address && (
                        <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 2 }} numberOfLines={1}>
                          📍 {item.address}
                        </Text>
                      )}
                    </View>
                    <View style={{
                      paddingHorizontal: 8, paddingVertical: 4,
                      backgroundColor: colors.primary[500] + '15',
                      borderRadius: 6,
                    }}>
                      <Text style={{ fontSize: 11, color: colors.primary[500], fontWeight: '600' }}>추가</Text>
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const dropStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  container: {
    width: 480, maxWidth: '90%', borderRadius: 16,
    borderWidth: 1, overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 24px 48px rgba(0,0,0,0.2)' },
      default: { elevation: 16 },
    }) as any,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
});

// ─── Schedule Detail Modal ──────────────────────────────────────────────────

function ScheduleDetailModal({
  item,
  tripId,
  isDark,
  theme,
  onClose,
}: {
  item: any;
  tripId: string;
  isDark: boolean;
  theme: ReturnType<typeof getThemeColors>;
  onClose: () => void;
}) {
  const updateSchedule = useUpdateSchedule(tripId);
  const [startTime, setStartTime] = useState(item.startTime ?? '');
  const [endTime, setEndTime] = useState(item.endTime ?? '');
  const [memo, setMemo] = useState(item.memo ?? '');
  const [status, setStatus] = useState(item.status ?? 'PLANNED');

  const title = item.wishlistPlace?.name ?? item.customTitle ?? '제목 없음';
  const address = item.wishlistPlace?.address ?? item.customAddress;
  const category = item.wishlistPlace?.category ?? 'OTHER';

  const handleSave = () => {
    updateSchedule.mutate({
      scheduleId: item.id,
      data: {
        startTime: startTime || null,
        endTime: endTime || null,
        memo: memo || null,
        status,
      },
    }, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={dropStyles.overlay} onPress={onClose}>
        <Pressable style={[dropStyles.container, {
          backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          width: 520,
        }]} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={{ padding: 20, borderBottomWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Text style={{ fontSize: 22 }}>{CATEGORY_ICONS[category] ?? '📌'}</Text>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: theme.text }}>{title}</Text>
                </View>
                {address && (
                  <Text style={{ fontSize: 13, color: theme.textSecondary, marginLeft: 30 }}>📍 {address}</Text>
                )}
              </View>
              <Pressable onPress={onClose} style={{ cursor: 'pointer', padding: 4 } as any}>
                <Text style={{ fontSize: 20, color: theme.textSecondary }}>✕</Text>
              </Pressable>
            </View>
          </View>

          {/* Body */}
          <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ padding: 20 }}>
            {/* Time */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginBottom: 8 }}>⏰ 시간</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <TextInput
                style={{
                  width: 100, fontSize: 16, fontWeight: '700', textAlign: 'center',
                  paddingVertical: 10, borderRadius: 10, borderWidth: 1,
                  color: colors.primary[500],
                  backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)',
                  borderColor: colors.primary[500] + '30',
                }}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="HH:MM"
                placeholderTextColor={theme.textTertiary}
              />
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.textTertiary }}>~</Text>
              <TextInput
                style={{
                  width: 100, fontSize: 16, fontWeight: '700', textAlign: 'center',
                  paddingVertical: 10, borderRadius: 10, borderWidth: 1,
                  color: colors.primary[500],
                  backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)',
                  borderColor: colors.primary[500] + '30',
                }}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="HH:MM"
                placeholderTextColor={theme.textTertiary}
              />
            </View>

            {/* Status */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginBottom: 8 }}>📊 상태</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <Pressable
                  key={key}
                  onPress={() => setStatus(key)}
                  style={[{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                    borderWidth: 2, cursor: 'pointer',
                    borderColor: status === key ? cfg.color : 'transparent',
                    backgroundColor: status === key ? cfg.bg : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                  }] as any}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: status === key ? cfg.color : theme.textSecondary }}>
                    {cfg.icon} {cfg.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Memo */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginBottom: 8 }}>📝 메모</Text>
            <TextInput
              style={{
                fontSize: 14, paddingVertical: 12, paddingHorizontal: 14,
                borderRadius: 10, borderWidth: 1, minHeight: 80,
                color: theme.text,
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              }}
              value={memo}
              onChangeText={setMemo}
              placeholder="메모를 입력하세요..."
              placeholderTextColor={theme.textTertiary}
              multiline
            />

            {/* Checklist */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginTop: 20, marginBottom: 4 }}>📋 체크리스트</Text>
            <ChecklistPanel tripId={tripId} scheduleId={item.id} isDark={isDark} theme={theme} />
          </ScrollView>

          {/* Footer */}
          <View style={{
            flexDirection: 'row', justifyContent: 'flex-end', gap: 10,
            padding: 16, borderTopWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          }}>
            <Pressable
              onPress={onClose}
              style={({ hovered }: any) => [{
                paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                cursor: 'pointer',
              }, hovered && { opacity: 0.8 }] as any}
            >
              <Text style={{ color: theme.textSecondary, fontWeight: '600', fontSize: 14 }}>취소</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={({ hovered }: any) => [{
                paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
                backgroundColor: colors.primary[500], cursor: 'pointer',
              }, hovered && { opacity: 0.85 }] as any}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>저장</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Timetable Row (한 시간 슬롯) ──────────────────────────────────────────

function TimeSlotRow({
  hour,
  scheduleItems,
  tripId,
  date,
  isDark,
  theme,
  onOpenDetail,
  onOpenAdd,
}: {
  hour: number;
  scheduleItems: any[];
  tripId: string;
  date: string;
  isDark: boolean;
  theme: ReturnType<typeof getThemeColors>;
  onOpenDetail: (item: any) => void;
  onOpenAdd: (hour: number) => void;
}) {
  const isCurrentHour = (() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    return date === today && now.getHours() === hour;
  })();

  return (
    <View style={{
      flexDirection: 'row',
      minHeight: 60,
      borderBottomWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
      backgroundColor: isCurrentHour
        ? (isDark ? 'rgba(102,126,234,0.08)' : 'rgba(102,126,234,0.04)')
        : 'transparent',
    }}>
      {/* 시간 라벨 */}
      <View style={{
        width: 70, paddingVertical: 10, paddingHorizontal: 12,
        borderRightWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        alignItems: 'flex-end', justifyContent: 'flex-start',
      }}>
        <Text style={{
          fontSize: 13, fontWeight: '700',
          color: isCurrentHour ? colors.primary[500] : theme.textSecondary,
          fontVariant: ['tabular-nums'],
        }}>
          {formatHour(hour)}
        </Text>
      </View>

      {/* 일정 슬롯 영역 */}
      <Pressable
        onPress={() => {
          if (scheduleItems.length === 0) {
            onOpenAdd(hour);
          }
        }}
        style={({ hovered }: any) => [{
          flex: 1, paddingVertical: 6, paddingHorizontal: 10,
          minHeight: 60,
          cursor: scheduleItems.length === 0 ? 'pointer' : 'default',
        },
        hovered && scheduleItems.length === 0 && {
          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
        }] as any}
      >
        {scheduleItems.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', opacity: 0.3 }}>
            <Text style={{ fontSize: 18, color: theme.textTertiary }}>+</Text>
          </View>
        ) : (
          <View style={{ gap: 6 }}>
            {scheduleItems.map((item: any) => {
              const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PLANNED;
              const title = item.wishlistPlace?.name ?? item.customTitle ?? '제목 없음';
              const category = item.wishlistPlace?.category ?? 'OTHER';

              return (
                <Pressable
                  key={item.id}
                  onPress={() => onOpenDetail(item)}
                  style={({ hovered }: any) => [{
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                    paddingVertical: 10, paddingHorizontal: 14,
                    borderRadius: 10, borderLeftWidth: 4,
                    borderLeftColor: status.color,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.025)',
                    cursor: 'pointer',
                  },
                  hovered && {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    transform: [{ scale: 1.005 }],
                  }] as any}
                >
                  <Text style={{ fontSize: 18 }}>{CATEGORY_ICONS[category] ?? '📌'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }} numberOfLines={1}>
                      {title}
                    </Text>
                    {item.startTime && (
                      <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 2 }}>
                        {item.startTime}{item.endTime ? ` ~ ${item.endTime}` : ''}
                      </Text>
                    )}
                  </View>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: status.bg }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: status.color }}>{status.label}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </Pressable>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TimelineWebScreen() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const scheme = useColorScheme() ?? 'dark';
  const isDark = scheme === 'dark';
  const theme = getThemeColors(scheme);

  const { data: trip } = useTrip(tripId ?? '');
  const { data: scheduleDates, isLoading: datesLoading } = useScheduleDates(tripId ?? '');

  const displayDates = useMemo(() => {
    if (trip?.startDate && trip?.endDate) {
      return getDatesInRange(trip.startDate, trip.endDate);
    }
    return scheduleDates ?? [];
  }, [trip, scheduleDates]);

  // 첫 번째 날짜를 자동 선택
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!selectedDate && displayDates.length > 0) {
      setSelectedDate(displayDates[0]);
    }
  }, [displayDates, selectedDate]);

  const [viewMode, setViewMode] = useState<'timetable' | 'map'>('timetable');
  const { data: schedules, isLoading } = useSchedules(tripId ?? '', selectedDate);

  // Modal states
  const [addDropdown, setAddDropdown] = useState<{ hour: number } | null>(null);
  const [detailItem, setDetailItem] = useState<any>(null);

  // Group schedules by hour
  const schedulesByHour = useMemo(() => {
    const map: Record<number, any[]> = {};
    DISPLAY_HOURS.forEach(h => { map[h] = []; });
    (schedules ?? []).forEach((item: any) => {
      const { startHour } = getScheduleSpan(item);
      const h = Math.max(6, Math.min(23, startHour));
      if (!map[h]) map[h] = [];
      map[h].push(item);
    });
    return map;
  }, [schedules]);

  // Summary stats
  const totalCount = (schedules ?? []).length;
  const completedCount = (schedules ?? []).filter((s: any) => s.status === 'COMPLETED').length;

  // Map data
  const mapPath = useMemo(() => {
    return (schedules ?? [])
      .filter((s: any) => s.wishlistPlace?.latitude && s.wishlistPlace?.longitude)
      .map((s: any) => ({ lat: s.wishlistPlace.latitude, lng: s.wishlistPlace.longitude }));
  }, [schedules]);

  const mapCenter = useMemo(() => {
    if (mapPath.length > 0) return mapPath[0];
    return { lat: 37.5665, lng: 126.9780 };
  }, [mapPath]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ maxWidth: 1100, width: '100%', alignSelf: 'center', paddingHorizontal: 24, paddingTop: 24, flex: 1 }}>
        {/* 헤더 */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <View>
            <Text style={{ fontSize: 26, fontWeight: '800', color: theme.text }}>📅 타임라인</Text>
            <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 4 }}>
              시간대별로 여행 일정을 세세하게 관리하세요
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => setViewMode('timetable')}
              style={[{
                paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                borderWidth: 1, borderColor: 'transparent', cursor: 'pointer',
              }, viewMode === 'timetable' && {
                backgroundColor: colors.primary[500], borderColor: colors.primary[500],
              }] as any}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: viewMode === 'timetable' ? '#fff' : theme.textSecondary }}>
                시간표
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setViewMode('map')}
              style={[{
                paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                borderWidth: 1, borderColor: 'transparent', cursor: 'pointer',
              }, viewMode === 'map' && {
                backgroundColor: colors.primary[500], borderColor: colors.primary[500],
              }] as any}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: viewMode === 'map' ? '#fff' : theme.textSecondary }}>
                지도 보기
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flex: 1, gap: 20 }}>
          {/* 좌측 날짜 패널 */}
          <ScrollView
            style={{
              width: 200, borderRadius: 16, borderWidth: 1, padding: 14,
              backgroundColor: theme.card, borderColor: theme.border,
              maxHeight: '100%',
            }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 10, letterSpacing: 0.5 }}>
              📆 날짜 선택
            </Text>
            {datesLoading ? (
              <ActivityIndicator color={colors.primary[500]} style={{ marginTop: 16 }} />
            ) : null}
            {displayDates.map((date: string, idx: number) => {
              const isActive = selectedDate === date;
              const dayNum = trip?.startDate ? getDayNumber(date, trip.startDate) : idx + 1;
              return (
                <Pressable
                  key={date}
                  onPress={() => setSelectedDate(date)}
                  style={({ hovered }: any) => [{
                    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, marginBottom: 3,
                    cursor: 'pointer',
                  },
                  isActive && { backgroundColor: colors.primary[500] + '18' },
                  hovered && !isActive && {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  }] as any}
                >
                  <Text style={{
                    fontSize: 11, fontWeight: '700',
                    color: isActive ? colors.primary[500] : theme.textTertiary,
                    marginBottom: 2,
                  }}>
                    DAY {dayNum}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: isActive ? '700' : '500',
                    color: isActive ? colors.primary[500] : theme.text,
                  }}>
                    {formatDateKR(date)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* 우측 메인 영역 */}
          {viewMode === 'map' ? (
            <View style={{ flex: 1, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.border, minHeight: 600 }}>
              {isLoaded ? (
                <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={mapCenter} zoom={12}>
                  {mapPath.length > 0 && (
                    <Polyline path={mapPath} options={{ strokeColor: colors.primary[500], strokeWeight: 4 }} />
                  )}
                  {(schedules ?? []).map((item: any, index: number) => {
                    const lat = item.wishlistPlace?.latitude;
                    const lng = item.wishlistPlace?.longitude;
                    if (!lat || !lng) return null;
                    return (
                      <Marker
                        key={item.id}
                        position={{ lat, lng }}
                        label={{ text: String(index + 1), color: '#fff', fontWeight: 'bold' }}
                        title={item.wishlistPlace?.name ?? item.customTitle ?? '제목 없음'}
                      />
                    );
                  })}
                </GoogleMap>
              ) : (
                <ActivityIndicator size="large" color={colors.primary[500]} style={{ marginTop: 60 }} />
              )}
            </View>
          ) : selectedDate ? (
            <View style={{ flex: 1 }}>
              {/* 날짜 헤더 + 요약 */}
              <View style={{
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 12, paddingHorizontal: 4,
              }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>
                    {formatDateFull(selectedDate)}
                  </Text>
                  {trip?.startDate && (
                    <Text style={{ fontSize: 12, color: colors.primary[500], fontWeight: '600', marginTop: 2 }}>
                      DAY {getDayNumber(selectedDate, trip.startDate)}
                    </Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <View style={{
                    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary }}>
                      📋 {totalCount}개 일정
                    </Text>
                  </View>
                  {totalCount > 0 && (
                    <View style={{
                      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                      backgroundColor: '#10B98115',
                    }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#10B981' }}>
                        ✅ {completedCount}/{totalCount} 완료
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* 시간표 그리드 */}
              <ScrollView
                style={{
                  flex: 1, borderRadius: 16, borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                  overflow: 'hidden',
                }}
                showsVerticalScrollIndicator={false}
              >
                {isLoading ? (
                  <ActivityIndicator size="large" color={colors.primary[500]} style={{ marginTop: 60, marginBottom: 60 }} />
                ) : (
                  DISPLAY_HOURS.map((hour) => (
                    <TimeSlotRow
                      key={hour}
                      hour={hour}
                      scheduleItems={schedulesByHour[hour] ?? []}
                      tripId={tripId ?? ''}
                      date={selectedDate}
                      isDark={isDark}
                      theme={theme}
                      onOpenDetail={(item) => setDetailItem(item)}
                      onOpenAdd={(h) => setAddDropdown({ hour: h })}
                    />
                  ))
                )}
              </ScrollView>
            </View>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>📅</Text>
              <Text style={{ fontSize: 18, fontWeight: '600', color: theme.textSecondary }}>
                날짜를 선택하세요
              </Text>
              <Text style={{ fontSize: 14, color: theme.textTertiary, marginTop: 8 }}>
                좌측 패널에서 날짜를 선택하면 시간별 일정이 표시됩니다
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Modals */}
      {addDropdown && selectedDate && (
        <WishlistDropdown
          tripId={tripId ?? ''}
          date={selectedDate}
          hour={addDropdown.hour}
          isDark={isDark}
          theme={theme}
          onClose={() => setAddDropdown(null)}
        />
      )}
      {detailItem && (
        <ScheduleDetailModal
          item={detailItem}
          tripId={tripId ?? ''}
          isDark={isDark}
          theme={theme}
          onClose={() => setDetailItem(null)}
        />
      )}
    </View>
  );
}
