/**
 * 웹 전용 타임라인 — 좌측 날짜 패널 + 우측 타임라인 카드
 * 인라인 편집 + 체크리스트 지원
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { colors, getThemeColors } from '@/theme';
import { useSchedules, useScheduleDates, useUpdateSchedule, useSwapSchedule, useCreateSchedule } from '@/hooks/useSchedules';
import { useTrip } from '@/hooks/useTrips';
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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PLANNED: { label: '예정', color: '#3B82F6', bg: '#3B82F620' },
  ONGOING: { label: '진행중', color: '#F59E0B', bg: '#F59E0B20' },
  COMPLETED: { label: '완료', color: '#10B981', bg: '#10B98120' },
  SKIPPED: { label: '건너뜀', color: '#6B7280', bg: '#6B728020' },
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

function getDatesInRange(start: string, end: string): string[] {
  try {
    const dates = [];
    let current = new Date(start);
    const endDate = new Date(end);
    
    // 무한루프 방지용 (최대 30일)
    let count = 0;
    while (current <= endDate && count < 30) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
      count++;
    }
    return dates;
  } catch {
    return [];
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
    <View style={styles.panelContent}>
      {/* Add new item */}
      <View style={styles.addRow}>
        <TextInput
          style={[
            styles.addInput,
            {
              color: theme.text,
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            },
          ]}
          placeholder="새 항목 추가..."
          placeholderTextColor={theme.textTertiary}
          value={newTitle}
          onChangeText={setNewTitle}
          onSubmitEditing={handleAdd}
        />
        <Pressable
          onPress={handleAdd}
          style={({ hovered }: any) => [
            styles.addButton,
            { backgroundColor: colors.primary[500] },
            hovered && { opacity: 0.85 },
            { cursor: 'pointer' } as any,
          ]}
        >
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      {/* Items */}
      {list.length === 0 ? (
        <Text style={[styles.emptyPanelText, { color: theme.textTertiary }]}>
          아직 체크리스트 항목이 없습니다
        </Text>
      ) : (
        list.map((item) => (
          <Pressable
            key={item.id}
            style={({ hovered }: any) => [
              styles.checkItem,
              {
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.03)'
                  : 'rgba(0,0,0,0.02)',
              },
              hovered && {
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.06)'
                  : 'rgba(0,0,0,0.04)',
              },
              { cursor: 'pointer' } as any,
            ]}
            onPress={() => toggleItem.mutate(item.id)}
          >
            <View
              style={[
                styles.checkbox,
                item.isChecked && {
                  backgroundColor: colors.primary[500],
                  borderColor: colors.primary[500],
                },
                !item.isChecked && {
                  borderColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
                },
              ]}
            >
              {item.isChecked && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text
              style={[
                styles.checkTitle,
                { color: theme.text },
                item.isChecked && {
                  textDecorationLine: 'line-through',
                  color: theme.textTertiary,
                },
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {item.assignee && (
              <Text style={[styles.assigneeLabel, { color: theme.textTertiary }]}>
                @{item.assignee.nickname}
              </Text>
            )}
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                deleteItem.mutate(item.id);
              }}
              style={({ hovered }: any) => [
                styles.deleteBtn,
                hovered && { backgroundColor: colors.error + '20' },
                { cursor: 'pointer' } as any,
              ]}
            >
              <Text style={{ color: colors.error, fontSize: 14 }}>✕</Text>
            </Pressable>
          </Pressable>
        ))
      )}

      {/* Progress */}
      {list.length > 0 && (
        <View style={styles.progressRow}>
          <View
            style={[
              styles.progressBar,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.primary[500],
                  width: `${(list.filter((i) => i.isChecked).length / list.length) * 100}%` as any,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: theme.textTertiary }]}>
            {list.filter((i) => i.isChecked).length}/{list.length}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Diary Panel (보류 — 프로토타입 이후 구현 예정) ──────────────────────────


// ─── Schedule Card ────────────────────────────────────────────────────────────

function ScheduleCard({
  item,
  index,
  schedules,
  tripId,
  isLast,
  isDark,
  theme,
}: {
  item: any;
  index: number;
  schedules: any[];
  tripId: string;
  isLast: boolean;
  isDark: boolean;
  theme: ReturnType<typeof getThemeColors>;
}) {
  const updateSchedule = useUpdateSchedule(tripId);
  const swapSchedule = useSwapSchedule(tripId);

  // ── Expand / Tab State ──
  const [expanded, setExpanded] = useState(false);
  // 다이어리 보류 - 체크리스트만 표시

  // ── Inline editing state ──
  const [editingTime, setEditingTime] = useState(false);
  const [startTime, setStartTime] = useState(item.startTime ?? '');
  const [endTime, setEndTime] = useState(item.endTime ?? '');
  const [editingMemo, setEditingMemo] = useState(false);
  const [memo, setMemo] = useState(item.memo ?? '');

  const startTimeRef = useRef<TextInput>(null);
  const endTimeRef = useRef<TextInput>(null);

  // Derived
  const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PLANNED;
  const title = item.wishlistPlace?.name ?? item.customTitle ?? '제목 없음';
  const address = item.wishlistPlace?.address ?? item.customAddress;

  // ── Handlers ──
  const saveTime = useCallback(() => {
    setEditingTime(false);
    updateSchedule.mutate({
      scheduleId: item.id,
      data: { startTime: startTime || null, endTime: endTime || null },
    });
  }, [startTime, endTime, item.id, updateSchedule]);

  const saveMemo = useCallback(() => {
    setEditingMemo(false);
    updateSchedule.mutate({
      scheduleId: item.id,
      data: { memo: memo || null },
    });
  }, [memo, item.id, updateSchedule]);

  const toggleExpand = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  return (
    <View style={styles.timelineItem}>
      {/* 타임라인 도트 + 라인 */}
      <View style={styles.timelineLine}>
        <View style={[styles.dot, { backgroundColor: status.color }]} />
        {!isLast && (
          <View
            style={[
              styles.line,
              {
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(0,0,0,0.08)',
              },
            ]}
          />
        )}
      </View>

      {/* 카드 */}
      <View style={[styles.cardWrapper]}>
        <Pressable
          onPress={toggleExpand}
          style={({ hovered }: any) => [
            styles.scheduleCard,
            {
              backgroundColor: theme.card,
              borderColor: expanded ? colors.primary[500] + '50' : theme.border,
            },
            hovered && styles.scheduleCardHovered,
            { cursor: 'pointer' } as any,
          ]}
        >
          {/* Card header */}
          <View style={styles.cardHeader}>
            <View style={styles.timeRange}>
              {editingTime ? (
                <View style={styles.timeEditRow}>
                  <TextInput
                    ref={startTimeRef}
                    style={[
                      styles.timeInput,
                      {
                        color: colors.primary[500],
                        borderColor: colors.primary[500] + '40',
                        backgroundColor: isDark
                          ? 'rgba(99,102,241,0.08)'
                          : 'rgba(99,102,241,0.06)',
                      },
                    ]}
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="HH:MM"
                    placeholderTextColor={theme.textTertiary}
                    onSubmitEditing={() => endTimeRef.current?.focus()}
                    autoFocus
                  />
                  <Text style={[styles.timeSep, { color: theme.textTertiary }]}>~</Text>
                  <TextInput
                    ref={endTimeRef}
                    style={[
                      styles.timeInput,
                      {
                        color: colors.primary[500],
                        borderColor: colors.primary[500] + '40',
                        backgroundColor: isDark
                          ? 'rgba(99,102,241,0.08)'
                          : 'rgba(99,102,241,0.06)',
                      },
                    ]}
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="HH:MM"
                    placeholderTextColor={theme.textTertiary}
                    onSubmitEditing={saveTime}
                    onBlur={saveTime}
                  />
                </View>
              ) : (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    setEditingTime(true);
                  }}
                  style={({ hovered }: any) => [
                    styles.timeClickable,
                    hovered && {
                      backgroundColor: colors.primary[500] + '12',
                    },
                    { cursor: 'text' } as any,
                  ]}
                >
                  <Text style={[styles.timeText, { color: colors.primary[500] }]}>
                    {item.startTime ?? '--:--'} ~ {item.endTime ?? '--:--'}
                  </Text>
                </Pressable>
              )}
            </View>
            <View style={styles.headerRight}>
              <View style={styles.swapButtons}>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    if (index > 0) {
                      swapSchedule.mutate({
                        scheduleId: item.id,
                        targetScheduleId: schedules[index - 1].id,
                      });
                    }
                  }}
                  disabled={index === 0}
                  style={({ hovered }: any) => [
                    styles.swapButton,
                    index === 0 && styles.swapButtonDisabled,
                    hovered && index > 0 && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
                    { cursor: index === 0 ? 'not-allowed' : 'pointer' } as any,
                  ]}
                >
                  <Text style={[styles.swapButtonText, { color: theme.textSecondary }, index === 0 && { color: theme.textTertiary }]}>
                    ▲ 위로
                  </Text>
                </Pressable>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    if (!isLast) {
                      swapSchedule.mutate({
                        scheduleId: item.id,
                        targetScheduleId: schedules[index + 1].id,
                      });
                    }
                  }}
                  disabled={isLast}
                  style={({ hovered }: any) => [
                    styles.swapButton,
                    isLast && styles.swapButtonDisabled,
                    hovered && !isLast && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
                    { cursor: isLast ? 'not-allowed' : 'pointer' } as any,
                  ]}
                >
                  <Text style={[styles.swapButtonText, { color: theme.textSecondary }, isLast && { color: theme.textTertiary }]}>
                    ▼ 아래로
                  </Text>
                </Pressable>
              </View>

              <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
              </View>
              <Text style={[styles.expandArrow, { color: theme.textTertiary }]}>
                {expanded ? '▾' : '▸'}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
            {title}
          </Text>

          {/* Address */}
          {address ? (
            <Text style={[styles.cardAddress, { color: theme.textSecondary }]} numberOfLines={1}>
              📍 {address}
            </Text>
          ) : null}

          {/* Memo area (inline editable) */}
          {editingMemo ? (
            <TextInput
              style={[
                styles.memoInput,
                {
                  color: theme.text,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                  borderColor: colors.primary[500] + '40',
                },
              ]}
              value={memo}
              onChangeText={setMemo}
              placeholder="메모를 입력하세요..."
              placeholderTextColor={theme.textTertiary}
              multiline
              autoFocus
              onBlur={saveMemo}
            />
          ) : (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                setEditingMemo(true);
              }}
              style={({ hovered }: any) => [
                styles.memoClickable,
                hovered && {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                },
                { cursor: 'text' } as any,
              ]}
            >
              <Text
                style={[
                  styles.memoText,
                  { color: item.memo ? theme.textSecondary : theme.textTertiary },
                ]}
                numberOfLines={2}
              >
                {item.memo || '✏️ 메모 추가...'}
              </Text>
            </Pressable>
          )}

          {/* Meta counts */}
          <View style={styles.cardMeta}>
            {item._count?.checklistItems > 0 && (
              <Text style={[styles.metaItem, { color: theme.textTertiary }]}>
                ✅ 체크리스트 {item._count.checklistItems}
              </Text>
            )}

          </View>
        </Pressable>

        {/* Expanded section: Checklist */}
        {expanded && (
          <View
            style={[
              styles.expandedSection,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                borderColor: colors.primary[500] + '30',
              },
            ]}
          >
            <View style={styles.expandedHeader}>
              <Text style={[styles.expandedTitle, { color: colors.primary[500] }]}>📋 체크리스트</Text>
            </View>
            <ChecklistPanel
              tripId={tripId}
              scheduleId={item.id}
              isDark={isDark}
              theme={theme}
            />
          </View>
        )}
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

  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'timeline' | 'map'>('timeline');
  const { data: schedules, isLoading } = useSchedules(tripId ?? '', selectedDate);
  const createSchedule = useCreateSchedule(tripId ?? '');

  const handleCreateSchedule = () => {
    if (!selectedDate) return;
    createSchedule.mutate({
      date: selectedDate,
      customTitle: '새 일정 (클릭해서 수정)',
    });
  };

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
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.inner}>
        {/* 헤더 */}
        <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>📅 타임라인</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              여행 일정을 시간순으로 확인하세요
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => setViewMode('timeline')} style={[styles.viewToggleBtn, viewMode === 'timeline' && { backgroundColor: colors.primary[500], borderColor: colors.primary[500] }]}>
              <Text style={[styles.viewToggleText, { color: viewMode === 'timeline' ? '#fff' : theme.textSecondary }]}>타임라인</Text>
            </Pressable>
            <Pressable onPress={() => setViewMode('map')} style={[styles.viewToggleBtn, viewMode === 'map' && { backgroundColor: colors.primary[500], borderColor: colors.primary[500] }]}>
              <Text style={[styles.viewToggleText, { color: viewMode === 'map' ? '#fff' : theme.textSecondary }]}>지도 보기</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.body}>
          {/* 좌측 날짜 패널 */}
          <ScrollView
            style={[
              styles.datePanel,
              { backgroundColor: theme.card, borderColor: theme.border, maxHeight: '100%' },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.datePanelTitle, { color: theme.textSecondary }]}>
              📆 날짜 선택
            </Text>
            <Pressable
              onPress={() => setSelectedDate(undefined)}
              style={[
                styles.dateItem,
                !selectedDate && { backgroundColor: colors.primary[500] + '15' },
                { cursor: 'pointer' } as any,
              ]}
            >
              <Text
                style={[
                  styles.dateText,
                  { color: !selectedDate ? colors.primary[500] : theme.textSecondary },
                  !selectedDate && styles.dateTextActive,
                ]}
              >
                전체 보기
              </Text>
            </Pressable>
            {datesLoading ? (
              <ActivityIndicator color={colors.primary[500]} style={{ marginTop: 16 }} />
            ) : null}
            {(displayDates).map((date: string) => {
              const isActive = selectedDate === date;
              return (
                <Pressable
                  key={date}
                  onPress={() => setSelectedDate(date)}
                  style={({ hovered }: any) => [
                    styles.dateItem,
                    isActive && { backgroundColor: colors.primary[500] + '15' },
                    hovered &&
                      !isActive && {
                        backgroundColor: isDark
                          ? 'rgba(255,255,255,0.04)'
                          : 'rgba(0,0,0,0.03)',
                      },
                    { cursor: 'pointer' } as any,
                  ]}
                >
                  <Text
                    style={[
                      styles.dateText,
                      { color: isActive ? colors.primary[500] : theme.text },
                      isActive && styles.dateTextActive,
                    ]}
                  >
                    {formatDateKR(date)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* 우측 타임라인 or 지도 */}
          {viewMode === 'map' ? (
            <View style={{ flex: 1, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.border, minHeight: 600 }}>
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={mapCenter}
                  zoom={12}
                >
                  {mapPath.length > 0 && (
                    <Polyline
                      path={mapPath}
                      options={{ strokeColor: colors.primary[500], strokeWeight: 4 }}
                    />
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
          ) : (
            <ScrollView style={styles.timelineArea} contentContainerStyle={styles.timelineContent}>
            {isLoading ? (
              <ActivityIndicator
                size="large"
                color={colors.primary[500]}
                style={{ marginTop: 60 }}
              />
            ) : (
              <>
                {selectedDate && (
                  <Pressable
                    onPress={handleCreateSchedule}
                    style={({ hovered }: any) => [
                      {
                        padding: 16,
                        marginBottom: 16,
                        borderRadius: 12,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        borderStyle: 'dashed',
                        alignItems: 'center',
                        justifyContent: 'center',
                      },
                      hovered && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                      { cursor: 'pointer' } as any,
                    ]}
                  >
                    <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>
                      + 새 자유 일정 추가하기
                    </Text>
                  </Pressable>
                )}
                {(schedules ?? []).length === 0 ? (
                  <View style={styles.emptyState}>
                <Text style={{ fontSize: 48, marginBottom: 16 }}>📋</Text>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  일정이 없습니다
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
                  {selectedDate
                    ? '이 날짜에 등록된 일정이 없습니다'
                    : '아직 일정이 등록되지 않았습니다'}
                </Text>
              </View>
            ) : (
              (schedules ?? []).map((item: any, index: number) => (
                <ScheduleCard
                  key={item.id}
                  item={item}
                  index={index}
                  schedules={schedules ?? []}
                  tripId={tripId ?? ''}
                  isLast={index === (schedules ?? []).length - 1}
                  isDark={isDark}
                  theme={theme}
                />
              ))
            )}
              </>
            )}
          </ScrollView>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  /* Layout */
  container: { flex: 1 },
  inner: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingTop: 32,
    flex: 1,
  },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4 },
  viewToggleBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'transparent', cursor: 'pointer' },
  viewToggleText: { fontSize: 14, fontWeight: '600' },
  body: { flexDirection: 'row', flex: 1, gap: 24 },

  /* Date Panel */
  datePanel: {
    width: 220,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignSelf: 'flex-start',
  },
  datePanelTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase' as any,
    letterSpacing: 0.5,
  },
  dateItem: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, marginBottom: 4 },
  dateText: { fontSize: 14, fontWeight: '500' },
  dateTextActive: { fontWeight: '700' },

  /* Timeline */
  timelineArea: { flex: 1 },
  timelineContent: { paddingBottom: 60 },
  timelineItem: { flexDirection: 'row', marginBottom: 0 },
  timelineLine: { width: 32, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 20 },
  line: { width: 2, flex: 1, marginTop: 4 },

  /* Card */
  cardWrapper: { flex: 1, marginBottom: 12, marginLeft: 8 },
  scheduleCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  scheduleCardHovered: {
    transform: [{ scale: 1.01 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  expandArrow: { fontSize: 16, marginLeft: 4 },
  timeRange: {},
  timeText: { fontSize: 14, fontWeight: '700' },
  timeClickable: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, marginLeft: -8 },
  timeEditRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeInput: {
    width: 70,
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: 'center',
  },
  timeSep: { fontSize: 14, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },
  swapButtons: { flexDirection: 'row', gap: 4, marginRight: 4 },
  swapButton: { paddingVertical: 4, paddingHorizontal: 6, borderRadius: 6 },
  swapButtonDisabled: { opacity: 0.5 },
  swapButtonText: { fontSize: 12, fontWeight: '600' },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  cardAddress: { fontSize: 13, marginBottom: 8 },
  memoClickable: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, marginLeft: -8, marginBottom: 4 },
  memoText: { fontSize: 13, fontStyle: 'italic' },
  memoInput: {
    fontSize: 13,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
    minHeight: 48,
  },
  cardMeta: { flexDirection: 'row', gap: 16, marginTop: 4 },
  metaItem: { fontSize: 12 },

  /* Expanded Section */
  expandedSection: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: { fontSize: 14, fontWeight: '500' },

  /* Checklist Panel */
  panelContent: { padding: 16 },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  addInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  checkTitle: { flex: 1, fontSize: 14 },
  assigneeLabel: { fontSize: 12, marginRight: 4 },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  progressBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 12, fontWeight: '600', minWidth: 32, textAlign: 'right' },

  /* Expanded header */
  expandedHeader: { paddingBottom: 8, marginBottom: 4 },
  expandedTitle: { fontSize: 14, fontWeight: '700' },

  /* Empty */
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 18, fontWeight: '600' },
  emptySubtext: { fontSize: 14, marginTop: 8 },
  emptyPanelText: { fontSize: 13, textAlign: 'center', paddingVertical: 20 },
});
