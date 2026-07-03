/**
 * 웹 전용 타임라인 — 좌측 날짜 패널 + 우측 타임라인 카드
 * 카멜레온 카드: 인라인 편집, 체크리스트, 다이어리 지원
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
import { useSchedules, useScheduleDates, useUpdateSchedule } from '@/hooks/useSchedules';
import {
  useChecklist,
  useCreateChecklistItem,
  useToggleChecklistItem,
  useDeleteChecklistItem,
} from '@/hooks/useChecklist';
import type { ChecklistItem } from '@/hooks/useChecklist';
import {
  useDiary,
  useCreateDiary,
  useDeleteDiary,
} from '@/hooks/useDiary';
import type { DiaryEntry } from '@/hooks/useDiary';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PLANNED: { label: '예정', color: '#3B82F6', bg: '#3B82F620' },
  ONGOING: { label: '진행중', color: '#F59E0B', bg: '#F59E0B20' },
  COMPLETED: { label: '완료', color: '#10B981', bg: '#10B98120' },
  SKIPPED: { label: '건너뜀', color: '#6B7280', bg: '#6B728020' },
};

const MOOD_EMOJIS = ['😊', '😍', '🤩', '😌', '😢', '😤', '🥱', '😎'] as const;

type TabKey = 'checklist' | 'diary';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateKR(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
  } catch {
    return dateStr;
  }
}

function formatDiaryDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function isDatePast(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return target < today;
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

// ─── Diary Panel ──────────────────────────────────────────────────────────────

function DiaryPanel({
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
  const { data: entries, isLoading } = useDiary(tripId, scheduleId);
  const createDiary = useCreateDiary(tripId, scheduleId);
  const deleteDiary = useDeleteDiary(tripId);
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<string>('😊');

  const handleSubmit = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed) return;
    createDiary.mutate({ content: trimmed, mood: selectedMood });
    setContent('');
    setSelectedMood('😊');
  }, [content, selectedMood, createDiary]);

  if (isLoading) {
    return <ActivityIndicator color={colors.primary[500]} style={{ marginTop: 16 }} />;
  }

  const list: DiaryEntry[] = entries ?? [];

  return (
    <View style={styles.panelContent}>
      {/* Write new entry */}
      <View
        style={[
          styles.diaryForm,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        {/* Mood selector */}
        <View style={styles.moodRow}>
          <Text style={[styles.moodLabel, { color: theme.textSecondary }]}>기분:</Text>
          {MOOD_EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => setSelectedMood(emoji)}
              style={[
                styles.moodBtn,
                selectedMood === emoji && {
                  backgroundColor: colors.primary[500] + '25',
                  borderColor: colors.primary[500],
                },
                { cursor: 'pointer' } as any,
              ]}
            >
              <Text style={styles.moodEmoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={[
            styles.diaryInput,
            {
              color: theme.text,
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            },
          ]}
          placeholder="오늘의 여행 이야기를 적어보세요..."
          placeholderTextColor={theme.textTertiary}
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={3}
        />
        <Pressable
          onPress={handleSubmit}
          style={({ hovered }: any) => [
            styles.diarySubmitBtn,
            { backgroundColor: colors.primary[500] },
            hovered && { opacity: 0.85 },
            { cursor: 'pointer' } as any,
          ]}
        >
          <Text style={styles.diarySubmitText}>✍️ 작성하기</Text>
        </Pressable>
      </View>

      {/* Entries */}
      {list.length === 0 ? (
        <Text style={[styles.emptyPanelText, { color: theme.textTertiary }]}>
          아직 다이어리 기록이 없습니다
        </Text>
      ) : (
        list.map((entry) => (
          <View
            key={entry.id}
            style={[
              styles.diaryEntry,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              },
            ]}
          >
            <View style={styles.diaryEntryHeader}>
              <View style={styles.diaryAuthorRow}>
                {entry.mood && <Text style={styles.diaryMood}>{entry.mood}</Text>}
                <Text style={[styles.diaryAuthor, { color: theme.text }]}>
                  {entry.author?.nickname ?? '익명'}
                </Text>
              </View>
              <View style={styles.diaryEntryActions}>
                <Text style={[styles.diaryDate, { color: theme.textTertiary }]}>
                  {formatDiaryDate(entry.createdAt)}
                </Text>
                <Pressable
                  onPress={() => deleteDiary.mutate(entry.id)}
                  style={({ hovered }: any) => [
                    styles.deleteBtn,
                    hovered && { backgroundColor: colors.error + '20' },
                    { cursor: 'pointer' } as any,
                  ]}
                >
                  <Text style={{ color: colors.error, fontSize: 13 }}>🗑</Text>
                </Pressable>
              </View>
            </View>
            <Text style={[styles.diaryContent, { color: theme.text }]}>{entry.content}</Text>
          </View>
        ))
      )}
    </View>
  );
}

// ─── Schedule Card ────────────────────────────────────────────────────────────

function ScheduleCard({
  item,
  tripId,
  isLast,
  isDark,
  theme,
}: {
  item: any;
  tripId: string;
  isLast: boolean;
  isDark: boolean;
  theme: ReturnType<typeof getThemeColors>;
}) {
  const updateSchedule = useUpdateSchedule(tripId);

  // ── Expand / Tab State ──
  const [expanded, setExpanded] = useState(false);
  const defaultTab: TabKey = isDatePast(item.date) ? 'diary' : 'checklist';
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);

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
            {item._count?.diaryEntries > 0 && (
              <Text style={[styles.metaItem, { color: theme.textTertiary }]}>
                📝 다이어리 {item._count.diaryEntries}
              </Text>
            )}
          </View>
        </Pressable>

        {/* Expanded section: Checklist / Diary tabs */}
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
            {/* Tabs */}
            <View
              style={[
                styles.tabRow,
                {
                  borderBottomColor: isDark
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(0,0,0,0.06)',
                },
              ]}
            >
              <Pressable
                onPress={() => setActiveTab('checklist')}
                style={({ hovered }: any) => [
                  styles.tab,
                  activeTab === 'checklist' && {
                    borderBottomColor: colors.primary[500],
                    borderBottomWidth: 2,
                  },
                  hovered && activeTab !== 'checklist' && { opacity: 0.7 },
                  { cursor: 'pointer' } as any,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        activeTab === 'checklist'
                          ? colors.primary[500]
                          : theme.textSecondary,
                    },
                    activeTab === 'checklist' && { fontWeight: '700' },
                  ]}
                >
                  📋 체크리스트
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab('diary')}
                style={({ hovered }: any) => [
                  styles.tab,
                  activeTab === 'diary' && {
                    borderBottomColor: colors.primary[500],
                    borderBottomWidth: 2,
                  },
                  hovered && activeTab !== 'diary' && { opacity: 0.7 },
                  { cursor: 'pointer' } as any,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        activeTab === 'diary'
                          ? colors.primary[500]
                          : theme.textSecondary,
                    },
                    activeTab === 'diary' && { fontWeight: '700' },
                  ]}
                >
                  📝 다이어리
                </Text>
              </Pressable>
            </View>

            {/* Tab content */}
            {activeTab === 'checklist' ? (
              <ChecklistPanel
                tripId={tripId}
                scheduleId={item.id}
                isDark={isDark}
                theme={theme}
              />
            ) : (
              <DiaryPanel
                tripId={tripId}
                scheduleId={item.id}
                isDark={isDark}
                theme={theme}
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TimelineWebScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const scheme = useColorScheme() ?? 'dark';
  const isDark = scheme === 'dark';
  const theme = getThemeColors(scheme);

  const { data: dates, isLoading: datesLoading } = useScheduleDates(tripId ?? '');
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const { data: schedules, isLoading } = useSchedules(tripId ?? '', selectedDate);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.inner}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>📅 타임라인</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            여행 일정을 시간순으로 확인하세요
          </Text>
        </View>

        <View style={styles.body}>
          {/* 좌측 날짜 패널 */}
          <View
            style={[
              styles.datePanel,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
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
            {(dates ?? []).map((date: string) => {
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
          </View>

          {/* 우측 타임라인 */}
          <ScrollView style={styles.timelineArea} contentContainerStyle={styles.timelineContent}>
            {isLoading ? (
              <ActivityIndicator
                size="large"
                color={colors.primary[500]}
                style={{ marginTop: 60 }}
              />
            ) : (schedules ?? []).length === 0 ? (
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
                  tripId={tripId ?? ''}
                  isLast={index === (schedules ?? []).length - 1}
                  isDark={isDark}
                  theme={theme}
                />
              ))
            )}
          </ScrollView>
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

  /* Diary Panel */
  diaryForm: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  moodRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  moodLabel: { fontSize: 13, fontWeight: '600', marginRight: 4 },
  moodBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodEmoji: { fontSize: 16 },
  diaryInput: {
    fontSize: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 72,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  diarySubmitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignSelf: 'flex-end',
  },
  diarySubmitText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  diaryEntry: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  diaryEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  diaryAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  diaryMood: { fontSize: 20 },
  diaryAuthor: { fontSize: 14, fontWeight: '600' },
  diaryEntryActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  diaryDate: { fontSize: 12 },
  diaryContent: { fontSize: 14, lineHeight: 22 },

  /* Empty */
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 18, fontWeight: '600' },
  emptySubtext: { fontSize: 14, marginTop: 8 },
  emptyPanelText: { fontSize: 13, textAlign: 'center', paddingVertical: 20 },
});
