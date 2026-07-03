/**
 * 웹 전용 타임라인 — 시간 자유 설정 (크로놀로지) + 상단 가로 날짜 패널
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
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
  isDark,
  theme,
  onClose,
}: {
  tripId: string;
  date: string;
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
    <Modal visible={true} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={dropStyles.overlay} onPress={onClose}>
        <Pressable style={[dropStyles.container, {
          backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        }]} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={dropStyles.header}>
            <Text style={[dropStyles.headerTitle, { color: theme.text }]}>
              📅 {formatDateKR(date)} 일정 추가
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
    <Modal visible={true} transparent animationType="fade" onRequestClose={onClose}>
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

// ─── Schedule Item Component (Vertical Timeline) ─────────────────────────────

function ScheduleItemCard({
  item,
  index,
  isLast,
  tripId,
  isDark,
  theme,
  schedules,
  onOpenDetail,
}: {
  item: any;
  index: number;
  isLast: boolean;
  tripId: string;
  isDark: boolean;
  theme: ReturnType<typeof getThemeColors>;
  schedules: any[];
  onOpenDetail: (item: any) => void;
}) {
  const swapSchedule = useSwapSchedule(tripId);
  const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PLANNED;
  const title = item.wishlistPlace?.name ?? item.customTitle ?? '제목 없음';
  const category = item.wishlistPlace?.category ?? 'OTHER';

  return (
    <View style={{ flexDirection: 'row', marginBottom: 0 }}>
      {/* Timeline line & dot */}
      <View style={{ width: 40, alignItems: 'center' }}>
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: status.color, marginTop: 24, zIndex: 1 }} />
        {!isLast && (
          <View style={{ width: 2, flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', marginTop: 4 }} />
        )}
      </View>

      {/* Card Body */}
      <View style={{ flex: 1, paddingBottom: 16 }}>
        <Pressable
          onPress={() => onOpenDetail(item)}
          style={({ hovered }: any) => [{
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 16,
            padding: 16,
            cursor: 'pointer',
          }, hovered && {
            borderColor: colors.primary[500] + '50',
            transform: [{ scale: 1.005 }],
            ...Platform.select({
              web: { boxShadow: '0 8px 24px rgba(0,0,0,0.06)' },
            }) as any,
          }] as any}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {item.startTime ? (
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary[500] }}>
                  {item.startTime} {item.endTime ? `~ ${item.endTime}` : ''}
                </Text>
              ) : (
                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textTertiary }}>
                  시간 미지정 (클릭하여 설정)
                </Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    if (index > 0) {
                      swapSchedule.mutate({ scheduleId: item.id, targetScheduleId: schedules[index - 1].id });
                    }
                  }}
                  disabled={index === 0}
                  style={({ hovered }: any) => [{
                    padding: 4, borderRadius: 6, cursor: index === 0 ? 'not-allowed' : 'pointer',
                  }, hovered && index > 0 && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }] as any}
                >
                  <Text style={{ fontSize: 12, color: index === 0 ? theme.textTertiary : theme.textSecondary }}>▲ 위로</Text>
                </Pressable>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    if (!isLast) {
                      swapSchedule.mutate({ scheduleId: item.id, targetScheduleId: schedules[index + 1].id });
                    }
                  }}
                  disabled={isLast}
                  style={({ hovered }: any) => [{
                    padding: 4, borderRadius: 6, cursor: isLast ? 'not-allowed' : 'pointer',
                  }, hovered && !isLast && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }] as any}
                >
                  <Text style={{ fontSize: 12, color: isLast ? theme.textTertiary : theme.textSecondary }}>▼ 아래로</Text>
                </Pressable>
              </View>
              <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: status.bg }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: status.color }}>{status.label}</Text>
              </View>
            </View>
          </View>

          {/* Title and Address */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <Text style={{ fontSize: 20 }}>{CATEGORY_ICONS[category] ?? '📌'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 2 }} numberOfLines={1}>{title}</Text>
              {item.wishlistPlace?.address && (
                <Text style={{ fontSize: 13, color: theme.textSecondary }} numberOfLines={1}>📍 {item.wishlistPlace.address}</Text>
              )}
            </View>
          </View>

          {/* Memo & Meta */}
          {(item.memo || item._count?.checklistItems > 0) && (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={{ flex: 1, fontSize: 13, color: theme.textSecondary, fontStyle: 'italic' }} numberOfLines={2}>
                {item.memo ? `📝 ${item.memo}` : ''}
              </Text>
              {item._count?.checklistItems > 0 && (
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textTertiary, marginLeft: 16 }}>
                  📋 체크리스트 {item._count.checklistItems}개
                </Text>
              )}
            </View>
          )}
        </Pressable>
      </View>
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

  const [viewMode, setViewMode] = useState<'timeline' | 'map'>('timeline');
  const { data: schedules, isLoading } = useSchedules(tripId ?? '', selectedDate);

  // Modal states
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);

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
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ maxWidth: 1100, width: '100%', alignSelf: 'center', paddingHorizontal: 24, paddingTop: 24 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <View>
              <Text style={{ fontSize: 26, fontWeight: '800', color: theme.text }}>📅 타임라인</Text>
              <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 4 }}>
                여행 일정을 시간순으로 확인하고 수정하세요
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => setViewMode('timeline')}
                style={[{
                  paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                  borderWidth: 1, borderColor: 'transparent', cursor: 'pointer',
                }, viewMode === 'timeline' && {
                  backgroundColor: colors.primary[500], borderColor: colors.primary[500],
                }] as any}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: viewMode === 'timeline' ? '#fff' : theme.textSecondary }}>
                  타임라인
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

          {/* 상단 날짜 패널 (가로 스크롤) */}
          <View style={{ marginBottom: 24, borderBottomWidth: 1, borderColor: theme.border, paddingBottom: 16 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 4 }}>
              {datesLoading && <ActivityIndicator color={colors.primary[500]} style={{ marginRight: 16 }} />}
              {displayDates.map((date: string, idx: number) => {
                const isActive = selectedDate === date;
                const dayNum = trip?.startDate ? getDayNumber(date, trip.startDate) : idx + 1;
                return (
                  <Pressable
                    key={date}
                    onPress={() => setSelectedDate(date)}
                    style={({ hovered }: any) => [{
                      paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12,
                      borderWidth: 1, borderColor: isActive ? colors.primary[500] : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                      backgroundColor: isActive ? colors.primary[500] + '15' : theme.card,
                      cursor: 'pointer',
                      alignItems: 'center',
                    }, hovered && !isActive && { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)' }] as any}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: isActive ? colors.primary[500] : theme.textTertiary, marginBottom: 4 }}>
                      DAY {dayNum}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: isActive ? '700' : '600', color: isActive ? colors.primary[500] : theme.text }}>
                      {formatDateKR(date)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* 메인 콘텐츠 영역 */}
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
            <View style={{ maxWidth: 800, alignSelf: 'center', width: '100%' }}>
              {/* 요약 뱃지 */}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 20, gap: 12 }}>
                <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary }}>📋 {totalCount}개 일정</Text>
                </View>
                {totalCount > 0 && (
                  <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#10B98115' }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#10B981' }}>✅ {completedCount}/{totalCount} 완료</Text>
                  </View>
                )}
              </View>

              {/* 일정 목록 */}
              {isLoading ? (
                <ActivityIndicator size="large" color={colors.primary[500]} style={{ marginVertical: 60 }} />
              ) : (schedules ?? []).length === 0 ? (
                <View style={{ paddingVertical: 60, alignItems: 'center' }}>
                  <Text style={{ fontSize: 40, marginBottom: 16 }}>✈️</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: theme.textSecondary }}>등록된 일정이 없습니다</Text>
                  <Text style={{ fontSize: 14, color: theme.textTertiary, marginTop: 8 }}>아래 버튼을 눌러 일정을 추가해보세요!</Text>
                </View>
              ) : (
                <View style={{ paddingLeft: 8 }}>
                  {(schedules ?? []).map((item: any, index: number) => (
                    <ScheduleItemCard
                      key={item.id}
                      item={item}
                      index={index}
                      schedules={schedules}
                      isLast={index === (schedules ?? []).length - 1}
                      tripId={tripId ?? ''}
                      isDark={isDark}
                      theme={theme}
                      onOpenDetail={(i) => setDetailItem(i)}
                    />
                  ))}
                </View>
              )}

              {/* 추가 버튼 */}
              <Pressable
                onPress={() => setIsAddDropdownOpen(true)}
                style={({ hovered }: any) => [{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  paddingVertical: 16, borderRadius: 16, marginTop: 16,
                  borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary[500] + '80',
                  backgroundColor: hovered ? (colors.primary[500] + '10') : 'transparent',
                  cursor: 'pointer',
                }] as any}
              >
                <Text style={{ fontSize: 18, color: colors.primary[500], fontWeight: '700' }}>+</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary[500] }}>새 일정 추가</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 100 }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>📅</Text>
              <Text style={{ fontSize: 18, fontWeight: '600', color: theme.textSecondary }}>날짜를 선택하세요</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      {isAddDropdownOpen && selectedDate && (
        <WishlistDropdown
          tripId={tripId ?? ''}
          date={selectedDate}
          isDark={isDark}
          theme={theme}
          onClose={() => setIsAddDropdownOpen(false)}
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
