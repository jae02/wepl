import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSchedules } from '@/hooks/useSchedules';
import { useResponsive } from '@/hooks/useResponsive';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PLANNED: { label: '예정', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  ONGOING: { label: '진행 중', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  COMPLETED: { label: '완료', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  SKIPPED: { label: '건너뜀', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};

function formatTime(timeStr?: string): string {
  if (!timeStr) return '';
  try {
    const date = new Date(timeStr);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return timeStr;
  }
}

/** 타임라인 화면 */
export default function TimelineScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { isDesktop, isWeb } = useResponsive();

  const { data: schedules, isLoading, refetch, isRefetching } = useSchedules(tripId);

  // 날짜 목록 생성
  const dates = useMemo(() => {
    if (!schedules || schedules.length === 0) return [];
    const dateSet = new Set<string>();
    schedules.forEach((s: any) => {
      if (s.date) {
        dateSet.add(s.date.split('T')[0]);
      }
    });
    return Array.from(dateSet).sort();
  }, [schedules]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const activeDate = selectedDate ?? dates[0] ?? null;

  // 선택된 날짜의 일정 필터링
  const filteredSchedules = useMemo(() => {
    if (!schedules || !activeDate) return [];
    return schedules.filter(
      (s: any) => s.date && s.date.startsWith(activeDate),
    );
  }, [schedules, activeDate]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const ds = {
    bg: isDark ? '#0a0a0f' : '#f5f5fa',
    cardBg: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
    cardBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    textPrimary: isDark ? '#ffffff' : '#1a1a2e',
    textSecondary: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
    chipBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    chipBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
  };

  const formatDateChip = (dateStr: string): { day: string; weekday: string } => {
    try {
      const date = new Date(dateStr + 'T00:00:00');
      const day = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
      const weekday = date.toLocaleDateString('ko-KR', { weekday: 'short' });
      return { day, weekday };
    } catch {
      return { day: dateStr, weekday: '' };
    }
  };

  const renderScheduleCard = ({ item, index }: { item: any; index: number }) => {
    const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PLANNED;
    const checkedCount = item.checklist?.filter((c: any) => c.checked).length ?? 0;
    const totalChecklist = item.checklist?.length ?? 0;
    const checklistProgress = totalChecklist > 0 ? checkedCount / totalChecklist : 0;

    return (
      <View style={styles.timelineRow}>
        {/* 타임라인 라인 */}
        <View style={styles.timelineLine}>
          <View style={[styles.timelineDot, { backgroundColor: status.color }]} />
          {index < filteredSchedules.length - 1 && (
            <View
              style={[styles.timelineConnector, { backgroundColor: status.color + '30' }]}
            />
          )}
        </View>

        {/* 카드 */}
        <View
          style={[
            styles.scheduleCard,
            { backgroundColor: ds.cardBg, borderColor: ds.cardBorder },
          ]}
        >
          <View style={styles.cardTopRow}>
            {item.time ? (
              <Text style={[styles.cardTime, { color: status.color }]}>
                {formatTime(item.time)}
              </Text>
            ) : (
              <Text style={[styles.cardTime, { color: ds.textSecondary }]}>
                시간 미정
              </Text>
            )}
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.label}
              </Text>
            </View>
          </View>

          <Text
            style={[styles.placeName, { color: ds.textPrimary }]}
            numberOfLines={2}
          >
            {item.placeName ?? item.title ?? '장소 미정'}
          </Text>

          {item.memo ? (
            <Text
              style={[styles.memo, { color: ds.textSecondary }]}
              numberOfLines={2}
            >
              {item.memo}
            </Text>
          ) : null}

          {/* 체크리스트 진행률 */}
          {totalChecklist > 0 && (
            <View style={styles.checklistSection}>
              <View style={styles.checklistHeader}>
                <Text style={[styles.checklistLabel, { color: ds.textSecondary }]}>
                  ✅ 체크리스트
                </Text>
                <Text style={[styles.checklistCount, { color: ds.textSecondary }]}>
                  {checkedCount}/{totalChecklist}
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${checklistProgress * 100}%`,
                      backgroundColor: status.color,
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>📅</Text>
        <Text style={[styles.emptyTitle, { color: ds.textPrimary }]}>
          {dates.length === 0
            ? '아직 일정이 없어요'
            : '이 날짜에 일정이 없어요'}
        </Text>
        <Text style={[styles.emptySubtitle, { color: ds.textSecondary }]}>
          일정을 추가해보세요
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: ds.bg }, isDesktop && styles.desktopPageContainer]}>
      {/* 날짜 선택 */}
      {dates.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.dateSelector, isDesktop && { maxWidth: 800, width: '100%' as any, alignSelf: 'center' as const }]}
          style={styles.dateSelectorScroll}
        >
          {dates.map((dateStr) => {
            const isActive = dateStr === activeDate;
            const { day, weekday } = formatDateChip(dateStr);
            return (
              <Pressable
                key={dateStr}
                onPress={() => setSelectedDate(dateStr)}
                style={[
                  styles.dateChip,
                  {
                    backgroundColor: isActive ? '#667eea' : ds.chipBg,
                    borderColor: isActive ? '#667eea' : ds.chipBorder,
                  },
                  isDesktop && styles.desktopDateChip,
                  isWeb && ({ cursor: 'pointer' } as any),
                ]}
              >
                <Text
                  style={[
                    styles.dateChipDay,
                    { color: isActive ? '#ffffff' : ds.textPrimary },
                  ]}
                >
                  {day}
                </Text>
                <Text
                  style={[
                    styles.dateChipWeekday,
                    { color: isActive ? 'rgba(255,255,255,0.8)' : ds.textSecondary },
                  ]}
                >
                  {weekday}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* 일정 목록 */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      ) : (
        <FlatList
          data={filteredSchedules}
          keyExtractor={(item) => item.id}
          renderItem={renderScheduleCard}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 40 + insets.bottom },
            isDesktop && { maxWidth: 800, width: '100%' as any, alignSelf: 'center' as const },
          ]}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor="#667eea"
              colors={['#667eea']}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dateSelectorScroll: {
    flexGrow: 0,
  },
  dateSelector: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
  },
  dateChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 70,
  },
  dateChipDay: {
    fontSize: 14,
    fontWeight: '700',
  },
  dateChipWeekday: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timelineLine: {
    width: 28,
    alignItems: 'center',
    paddingTop: 6,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  scheduleCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    marginLeft: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTime: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  placeName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  memo: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  checklistSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.1)',
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  checklistLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  checklistCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(128,128,128,0.15)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  // 데스크톱 반응형 스타일
  desktopPageContainer: {
    alignItems: 'center' as const,
  },
  desktopDateChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 85,
  },
});
