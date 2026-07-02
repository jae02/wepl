/**
 * 웹 전용 타임라인 — 좌측 날짜 패널 + 우측 타임라인 카드
 */

import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { colors, getThemeColors } from '@/theme';
import { useSchedules, useScheduleDates } from '@/hooks/useSchedules';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PLANNED: { label: '예정', color: '#3B82F6', bg: '#3B82F620' },
  ONGOING: { label: '진행중', color: '#F59E0B', bg: '#F59E0B20' },
  COMPLETED: { label: '완료', color: '#10B981', bg: '#10B98120' },
  SKIPPED: { label: '건너뜀', color: '#6B7280', bg: '#6B728020' },
};

function formatDateKR(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
  } catch { return dateStr; }
}

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
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>여행 일정을 시간순으로 확인하세요</Text>
        </View>

        <View style={styles.body}>
          {/* 좌측 날짜 패널 */}
          <View style={[styles.datePanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.datePanelTitle, { color: theme.textSecondary }]}>📆 날짜 선택</Text>
            <Pressable
              onPress={() => setSelectedDate(undefined)}
              style={[
                styles.dateItem,
                !selectedDate && { backgroundColor: colors.primary[500] + '15' },
                { cursor: 'pointer' } as any,
              ]}
            >
              <Text style={[styles.dateText, { color: !selectedDate ? colors.primary[500] : theme.textSecondary }, !selectedDate && styles.dateTextActive]}>
                전체 보기
              </Text>
            </Pressable>
            {datesLoading ? <ActivityIndicator color={colors.primary[500]} style={{ marginTop: 16 }} /> : null}
            {(dates ?? []).map((date: string) => {
              const isActive = selectedDate === date;
              return (
                <Pressable
                  key={date}
                  onPress={() => setSelectedDate(date)}
                  style={({ hovered }: any) => [
                    styles.dateItem,
                    isActive && { backgroundColor: colors.primary[500] + '15' },
                    hovered && !isActive && { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' },
                    { cursor: 'pointer' } as any,
                  ]}
                >
                  <Text style={[styles.dateText, { color: isActive ? colors.primary[500] : theme.text }, isActive && styles.dateTextActive]}>
                    {formatDateKR(date)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* 우측 타임라인 */}
          <ScrollView style={styles.timelineArea} contentContainerStyle={styles.timelineContent}>
            {isLoading ? (
              <ActivityIndicator size="large" color={colors.primary[500]} style={{ marginTop: 60 }} />
            ) : (schedules ?? []).length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 48, marginBottom: 16 }}>📋</Text>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>일정이 없습니다</Text>
                <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
                  {selectedDate ? '이 날짜에 등록된 일정이 없습니다' : '아직 일정이 등록되지 않았습니다'}
                </Text>
              </View>
            ) : (
              (schedules ?? []).map((item: any, index: number) => {
                const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PLANNED;
                const title = item.wishlistPlace?.name ?? item.customTitle ?? '제목 없음';
                const address = item.wishlistPlace?.address ?? item.customAddress;
                const isLast = index === (schedules ?? []).length - 1;

                return (
                  <View key={item.id} style={styles.timelineItem}>
                    {/* 타임라인 도트 + 라인 */}
                    <View style={styles.timelineLine}>
                      <View style={[styles.dot, { backgroundColor: status.color }]} />
                      {!isLast && <View style={[styles.line, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} />}
                    </View>

                    {/* 카드 */}
                    <Pressable
                      style={({ hovered }: any) => [
                        styles.scheduleCard,
                        { backgroundColor: theme.card, borderColor: theme.border },
                        hovered && styles.scheduleCardHovered,
                        { cursor: 'pointer' } as any,
                      ]}
                    >
                      <View style={styles.cardHeader}>
                        <View style={styles.timeRange}>
                          <Text style={[styles.timeText, { color: colors.primary[500] }]}>
                            {item.startTime ?? '--:--'} ~ {item.endTime ?? '--:--'}
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                        </View>
                      </View>
                      <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{title}</Text>
                      {address ? <Text style={[styles.cardAddress, { color: theme.textSecondary }]} numberOfLines={1}>📍 {address}</Text> : null}
                      <View style={styles.cardMeta}>
                        {item._count?.checklistItems > 0 && (
                          <Text style={[styles.metaItem, { color: theme.textTertiary }]}>✅ 체크리스트 {item._count.checklistItems}</Text>
                        )}
                        {item._count?.diaryEntries > 0 && (
                          <Text style={[styles.metaItem, { color: theme.textTertiary }]}>📝 다이어리 {item._count.diaryEntries}</Text>
                        )}
                      </View>
                    </Pressable>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { maxWidth: 960, width: '100%', alignSelf: 'center', paddingHorizontal: 32, paddingTop: 32, flex: 1 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4 },
  body: { flexDirection: 'row', flex: 1, gap: 24 },
  datePanel: { width: 220, borderRadius: 16, borderWidth: 1, padding: 16, alignSelf: 'flex-start' },
  datePanelTitle: { fontSize: 13, fontWeight: '700', marginBottom: 12, textTransform: 'uppercase' as any, letterSpacing: 0.5 },
  dateItem: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, marginBottom: 4 },
  dateText: { fontSize: 14, fontWeight: '500' },
  dateTextActive: { fontWeight: '700' },
  timelineArea: { flex: 1 },
  timelineContent: { paddingBottom: 60 },
  timelineItem: { flexDirection: 'row', marginBottom: 0 },
  timelineLine: { width: 32, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 20 },
  line: { width: 2, flex: 1, marginTop: 4 },
  scheduleCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 12, marginLeft: 8 },
  scheduleCardHovered: { transform: [{ scale: 1.01 }], shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  timeRange: {},
  timeText: { fontSize: 14, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  cardAddress: { fontSize: 13, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', gap: 16, marginTop: 4 },
  metaItem: { fontSize: 12 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 18, fontWeight: '600' },
  emptySubtext: { fontSize: 14, marginTop: 8 },
});
