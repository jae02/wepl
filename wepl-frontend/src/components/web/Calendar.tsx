/**
 * 웹 전용 캘린더 컴포넌트
 * PC 브라우저에서만 렌더링되는 월간 그리드 캘린더
 * 여행 일정을 컬러 바로 표시하며 다크/라이트 모드 지원
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius, shadows } from '@/theme';
import { getThemeColors } from '@/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// ─── 타입 정의 ──────────────────────────────────────────────────────────────────

interface TripData {
  id: string;
  title: string;
  theme: string | null;
  startDate: string;
  endDate: string;
}

interface CalendarProps {
  trips: TripData[];
  selectedDate?: Date | null;
  onDateClick?: (date: Date) => void;
  onTripClick?: (tripId: string) => void;
}

// ─── 테마별 컬러 매핑 ───────────────────────────────────────────────────────────

const THEME_COLORS: Record<string, string> = {
  CULTURE: '#667eea',
  FOOD: '#f5576c',
  NATURE: '#00f2fe',
  ADVENTURE: '#fa709a',
  RELAXATION: '#a18cd1',
  SHOPPING: '#fcb69f',
  DEFAULT: '#667eea',
};

function getTripColor(theme: string | null): string {
  if (!theme) return THEME_COLORS.DEFAULT;
  return THEME_COLORS[theme.toUpperCase()] || THEME_COLORS.DEFAULT;
}

// ─── 날짜 유틸리티 ──────────────────────────────────────────────────────────────

const KOREAN_DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTH_NAMES = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return d >= s && d <= e;
}

// ─── 컴포넌트 ───────────────────────────────────────────────────────────────────

export default function Calendar({ trips, selectedDate, onDateClick, onTripClick }: CalendarProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = getThemeColors(colorScheme);
  const isDark = colorScheme === 'dark';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();

  // 이전/다음 월 이동
  const goToPrevMonth = useCallback(() => {
    setCurrentDate(new Date(year, month - 1, 1));
  }, [year, month]);

  const goToNextMonth = useCallback(() => {
    setCurrentDate(new Date(year, month + 1, 1));
  }, [year, month]);

  // 캘린더 그리드 데이터 계산
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const daysInPrevMonth = getDaysInMonth(year, month - 1);

    const days: Array<{ date: Date; day: number; isCurrentMonth: boolean }> = [];

    // 이전 달 날짜들
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      days.push({
        date: new Date(year, month - 1, day),
        day,
        isCurrentMonth: false,
      });
    }

    // 현재 달 날짜들
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(year, month, day),
        day,
        isCurrentMonth: true,
      });
    }

    // 다음 달 날짜들 (6주 = 42칸 채우기)
    const remaining = 42 - days.length;
    for (let day = 1; day <= remaining; day++) {
      days.push({
        date: new Date(year, month + 1, day),
        day,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month]);

  // 각 날짜에 해당하는 여행 매핑
  const tripsByDay = useMemo(() => {
    const map = new Map<string, TripData[]>();
    calendarDays.forEach(({ date }) => {
      const key = date.toISOString().split('T')[0];
      const matchingTrips = trips.filter((trip) => {
        const start = new Date(trip.startDate);
        const end = new Date(trip.endDate);
        return isDateInRange(date, start, end);
      });
      if (matchingTrips.length > 0) {
        map.set(key, matchingTrips);
      }
    });
    return map;
  }, [calendarDays, trips]);

  // 주 단위로 분할
  const weeks = useMemo(() => {
    const result: typeof calendarDays[] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* ─── 헤더: 월/년 + 네비게이션 ─── */}
      <View style={styles.header}>
        <Pressable
          onPress={goToPrevMonth}
          style={({ hovered }: any) => [
            styles.navButton,
            { backgroundColor: hovered ? (isDark ? colors.dark.elevated : colors.gray[100]) : 'transparent' },
          ]}
        >
          <Text style={[styles.navButtonText, { color: theme.text }]}>◀</Text>
        </Pressable>

        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {year}년 {MONTH_NAMES[month]}
        </Text>

        <Pressable
          onPress={goToNextMonth}
          style={({ hovered }: any) => [
            styles.navButton,
            { backgroundColor: hovered ? (isDark ? colors.dark.elevated : colors.gray[100]) : 'transparent' },
          ]}
        >
          <Text style={[styles.navButtonText, { color: theme.text }]}>▶</Text>
        </Pressable>
      </View>

      {/* ─── 요일 헤더 ─── */}
      <View style={styles.dayHeaderRow}>
        {KOREAN_DAYS.map((day, index) => (
          <View key={day} style={styles.dayHeaderCell}>
            <Text
              style={[
                styles.dayHeaderText,
                index === 0 && styles.sundayText,
                index === 6 && styles.saturdayText,
                index !== 0 && index !== 6 && { color: theme.textSecondary },
              ]}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* ─── 캘린더 그리드 ─── */}
      <View style={[styles.gridContainer, { borderTopColor: theme.border }]}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((dayData, dayIndex) => {
              const dateKey = dayData.date.toISOString().split('T')[0];
              const dayTrips = tripsByDay.get(dateKey) || [];
              const isToday = isSameDay(dayData.date, today);
              const dayOfWeek = dayData.date.getDay();
              const cellIndex = weekIndex * 7 + dayIndex;
              const isHovered = hoveredDay === cellIndex;
              const isSelected = selectedDate ? isSameDay(dayData.date, selectedDate) : false;

              return (
                <Pressable
                  key={dayIndex}
                  onPress={() => onDateClick?.(dayData.date)}
                  onHoverIn={() => setHoveredDay(cellIndex)}
                  onHoverOut={() => setHoveredDay(null)}
                  style={[
                    styles.dayCell,
                    { borderColor: theme.border },
                    isSelected && {
                      backgroundColor: isDark
                        ? 'rgba(99, 102, 241, 0.2)'
                        : 'rgba(99, 102, 241, 0.15)',
                      borderColor: '#667eea',
                      borderWidth: 2,
                    },
                    !isSelected && isHovered && {
                      backgroundColor: isDark
                        ? 'rgba(99, 102, 241, 0.08)'
                        : 'rgba(99, 102, 241, 0.04)',
                    },
                    { cursor: 'pointer' } as any,
                  ]}
                >
                  {/* 날짜 번호 */}
                  <View style={styles.dayNumberContainer}>
                    {isToday ? (
                      <View style={styles.todayCircle}>
                        <Text style={styles.todayText}>{dayData.day}</Text>
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.dayNumber,
                          !dayData.isCurrentMonth && { color: theme.textTertiary, opacity: 0.4 },
                          dayData.isCurrentMonth && dayOfWeek === 0 && styles.sundayText,
                          dayData.isCurrentMonth && dayOfWeek === 6 && styles.saturdayText,
                          dayData.isCurrentMonth &&
                            dayOfWeek !== 0 &&
                            dayOfWeek !== 6 && { color: theme.text },
                        ]}
                      >
                        {dayData.day}
                      </Text>
                    )}
                  </View>

                  {/* 여행 바 */}
                  <View style={styles.tripBarsContainer}>
                    {dayTrips.slice(0, 3).map((trip, tripIndex) => {
                      const tripColor = getTripColor(trip.theme);
                      const tripStart = new Date(trip.startDate);
                      const isFirstDay = isSameDay(dayData.date, tripStart);

                      return (
                        <View
                          key={trip.id + tripIndex}
                          style={[
                            styles.tripBar,
                            {
                              backgroundColor: tripColor,
                              opacity: dayData.isCurrentMonth ? 1 : 0.3,
                            },
                          ]}
                        >
                          {isFirstDay && (
                            <Text style={styles.tripBarText} numberOfLines={1}>
                              {trip.title}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                    {dayTrips.length > 3 && (
                      <Text style={[styles.moreTripsText, { color: theme.textSecondary }]}>
                        +{dayTrips.length - 3}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── 스타일 ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.lg,
  },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.5,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },

  // 요일 헤더
  dayHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.sm,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  dayHeaderText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sundayText: {
    color: '#EF4444',
  },
  saturdayText: {
    color: '#3B82F6',
  },

  // 그리드
  gridContainer: {
    borderTopWidth: 1,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    minHeight: 90,
    borderWidth: 0.5,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },

  // 날짜 번호
  dayNumberContainer: {
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  dayNumber: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  todayCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },

  // 여행 바
  tripBarsContainer: {
    flex: 1,
    gap: 2,
  },
  tripBar: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minHeight: 18,
    justifyContent: 'center',
  },
  tripBarText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.2,
  },
  moreTripsText: {
    fontSize: 10,
    fontWeight: typography.weights.medium,
    paddingHorizontal: 4,
  },
});
