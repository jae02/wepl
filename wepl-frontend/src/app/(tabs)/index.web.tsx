/**
 * 웹 전용 대시보드 홈 화면
 * 캘린더 + 여행 그리드 + 사이드 패널 레이아웃
 * Metro 번들러가 .web.tsx를 우선 선택하여 웹에서만 사용됩니다.
 */

import { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/stores/auth.store';
import { useTrips, useCreateTrip, useJoinTrip } from '@/hooks/useTrips';
import Calendar from '@/components/web/Calendar';
import { colors, getThemeColors } from '@/theme';

// ─── 상수 ────────────────────────────────────────────────────────────────────────

const SIDE_PANEL_WIDTH = 320;

const THEME_GRADIENTS: Record<string, [string, string]> = {
  CULTURE: ['#667eea', '#764ba2'],
  FOOD: ['#f093fb', '#f5576c'],
  NATURE: ['#4facfe', '#00f2fe'],
  ADVENTURE: ['#fa709a', '#fee140'],
  RELAXATION: ['#a18cd1', '#fbc2eb'],
  SHOPPING: ['#ffecd2', '#fcb69f'],
  DEFAULT: ['#667eea', '#764ba2'],
};

const THEME_LABELS: Record<string, string> = {
  CULTURE: '🏛️ 문화',
  FOOD: '🍽️ 맛집',
  NATURE: '🌿 자연',
  ADVENTURE: '🎯 모험',
  RELAXATION: '🧘 힐링',
  SHOPPING: '🛍️ 쇼핑',
};

const THEME_OPTIONS = Object.entries(THEME_LABELS);

// ─── 유틸리티 ────────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateRange(startDate?: string, endDate?: string): string {
  const s = formatDate(startDate);
  const e = formatDate(endDate);
  return s && e ? `${s} - ${e}` : '날짜 미정';
}

function getDDay(startDate?: string): number | null {
  if (!startDate) return null;
  const now = new Date();
  const start = new Date(startDate);
  now.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  const diff = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────────────────────────

export default function WebHomeScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const themeColors = getThemeColors(scheme ?? 'dark');

  const user = useAuthStore((s) => s.user);
  const { data: trips, isLoading, refetch } = useTrips();
  const createTripMutation = useCreateTrip();
  const joinTripMutation = useJoinTrip();

  // 생성 폼 상태
  const [newTitle, setNewTitle] = useState('');
  const [newTheme, setNewTheme] = useState('CULTURE');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [createError, setCreateError] = useState('');

  // 참가 폼 상태
  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState('');

  // 다가오는 여행 (미래 날짜, 시작일 기준 오름차순)
  const upcomingTrips = useMemo(() => {
    if (!trips) return [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return trips
      .filter((t: any) => {
        if (!t.startDate) return false;
        const start = new Date(t.startDate);
        start.setHours(0, 0, 0, 0);
        return start >= now;
      })
      .sort(
        (a: any, b: any) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      )
      .slice(0, 5);
  }, [trips]);

  // 다이나믹 색상
  const dc = {
    bg: isDark ? '#0a0a12' : '#f5f6fa',
    cardBg: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
    cardBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    panelBg: isDark ? 'rgba(20,20,35,0.95)' : 'rgba(255,255,255,0.97)',
    panelBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    textPrimary: isDark ? '#ffffff' : '#0f172a',
    textSecondary: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)',
    textMuted: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)',
    inputBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
    inputBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    inputText: isDark ? '#ffffff' : '#0f172a',
    placeholder: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
    sectionBg: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
    sectionBorder: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    hoverBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    ddayBg: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
  };

  // ─── 핸들러 ──────────────

  const handleCreateTrip = async () => {
    setCreateError('');
    if (!newTitle.trim()) {
      setCreateError('여행 이름을 입력해주세요.');
      return;
    }
    try {
      await createTripMutation.mutateAsync({
        title: newTitle.trim(),
        theme: newTheme,
        startDate: newStartDate || undefined,
        endDate: newEndDate || undefined,
      });
      setNewTitle('');
      setNewTheme('CULTURE');
      setNewStartDate('');
      setNewEndDate('');
      refetch();
    } catch (e: any) {
      setCreateError(e?.message || '여행 생성에 실패했습니다.');
    }
  };

  const handleJoinTrip = async () => {
    setJoinError('');
    if (!inviteCode.trim()) {
      setJoinError('초대 코드를 입력해주세요.');
      return;
    }
    try {
      await joinTripMutation.mutateAsync({ inviteCode: inviteCode.trim() });
      setInviteCode('');
      refetch();
    } catch (e: any) {
      setJoinError(e?.message || '참가에 실패했습니다.');
    }
  };

  const handleTripClick = (tripId: string) => {
    router.push(`/trip/${tripId}/wishlist`);
  };

  // ─── 로딩 상태 ───
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: dc.bg }]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={[styles.loadingText, { color: dc.textSecondary }]}>
          여행 데이터를 불러오는 중...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: dc.bg }]}>
      {/* ─── 메인 영역 (좌) ─── */}
      <ScrollView
        style={styles.mainArea}
        contentContainerStyle={styles.mainContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: dc.textPrimary }]}>
            👋 Welcome, {user?.nickname ?? '여행자'}님!
          </Text>
          <Text style={[styles.subtitle, { color: dc.textSecondary }]}>
            오늘의 여행 현황을 확인하세요
          </Text>
        </View>

        {/* 캘린더 섹션 */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: dc.sectionBg,
              borderColor: dc.sectionBorder,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📅</Text>
            <Text style={[styles.sectionTitle, { color: dc.textPrimary }]}>
              여행 캘린더
            </Text>
          </View>
          <Calendar
            trips={trips ?? []}
            onTripClick={(tripId: string) => handleTripClick(tripId)}
          />
        </View>

        {/* 여행 그리드 */}
        <View style={styles.gridSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📋</Text>
            <Text style={[styles.sectionTitle, { color: dc.textPrimary }]}>
              내 여행 목록
            </Text>
            <Text style={[styles.tripCount, { color: dc.textSecondary }]}>
              {trips?.length ?? 0}개
            </Text>
          </View>

          {(!trips || trips.length === 0) ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>✈️</Text>
              <Text style={[styles.emptyTitle, { color: dc.textPrimary }]}>
                첫 여행을 만들어보세요!
              </Text>
              <Text style={[styles.emptySubtitle, { color: dc.textSecondary }]}>
                오른쪽 패널에서 새 여행을 생성하거나{'\n'}초대 코드로 참여할 수 있습니다.
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {trips.map((item: any) => {
                const gradient =
                  THEME_GRADIENTS[item.theme] || THEME_GRADIENTS.DEFAULT;
                const themeLabel = THEME_LABELS[item.theme] || item.theme;
                const dateRange = formatDateRange(item.startDate, item.endDate);
                const memberCount =
                  item._count?.members ?? item.memberCount ?? 0;

                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handleTripClick(item.id)}
                    style={({ pressed, hovered }) => [
                      styles.tripCard,
                      {
                        backgroundColor: dc.cardBg,
                        borderColor: dc.cardBorder,
                      },
                      hovered && {
                        transform: [{ scale: 1.02 }],
                        shadowColor: gradient[0],
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.2,
                        shadowRadius: 20,
                      },
                      pressed && { opacity: 0.9 },
                      { cursor: 'pointer' } as any,
                    ]}
                  >
                    {/* 그라데이션 상단 바 */}
                    <LinearGradient
                      colors={gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.cardGradientBar}
                    />

                    <View style={styles.cardBody}>
                      {/* 제목 + 테마 뱃지 */}
                      <View style={styles.cardTop}>
                        <Text
                          style={[
                            styles.cardTitle,
                            { color: dc.textPrimary },
                          ]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <View
                          style={[
                            styles.themeBadge,
                            { backgroundColor: gradient[0] + '18' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.themeBadgeText,
                              { color: gradient[0] },
                            ]}
                          >
                            {themeLabel}
                          </Text>
                        </View>
                      </View>

                      {/* 메타 정보 */}
                      <View style={styles.cardMeta}>
                        <Text
                          style={[
                            styles.cardMetaText,
                            { color: dc.textSecondary },
                          ]}
                        >
                          📅 {dateRange}
                        </Text>
                        <Text
                          style={[
                            styles.cardMetaText,
                            { color: dc.textSecondary },
                          ]}
                        >
                          👥 {memberCount}명
                        </Text>
                      </View>

                      {/* 초대 코드 */}
                      {item.inviteCode && (
                        <View style={styles.cardFooter}>
                          <Text
                            style={[
                              styles.inviteCodeLabel,
                              { color: dc.textMuted },
                            ]}
                          >
                            초대코드
                          </Text>
                          <Text
                            style={[
                              styles.inviteCodeValue,
                              {
                                color: colors.primary[400],
                                backgroundColor: dc.ddayBg,
                              },
                            ]}
                          >
                            {item.inviteCode}
                          </Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ─── 사이드 패널 (우) ─── */}
      <ScrollView
        style={[
          styles.sidePanel,
          {
            backgroundColor: dc.panelBg,
            borderLeftColor: dc.panelBorder,
          },
        ]}
        contentContainerStyle={styles.sidePanelContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 새 여행 만들기 */}
        <View
          style={[
            styles.panelCard,
            {
              backgroundColor: dc.sectionBg,
              borderColor: dc.sectionBorder,
            },
          ]}
        >
          <View style={styles.panelCardHeader}>
            <Text style={styles.panelCardIcon}>➕</Text>
            <Text style={[styles.panelCardTitle, { color: dc.textPrimary }]}>
              새 여행 만들기
            </Text>
          </View>

          {createError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {createError}</Text>
            </View>
          ) : null}

          {/* 제목 입력 */}
          <Text style={[styles.inputLabel, { color: dc.textSecondary }]}>
            여행 이름
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: dc.inputBg,
                borderColor: dc.inputBorder,
                color: dc.inputText,
              },
            ]}
            placeholder="예: 도쿄 여행 🗼"
            placeholderTextColor={dc.placeholder}
            value={newTitle}
            onChangeText={setNewTitle}
          />

          {/* 테마 선택 */}
          <Text style={[styles.inputLabel, { color: dc.textSecondary }]}>
            여행 테마
          </Text>
          <View style={styles.themeGrid}>
            {THEME_OPTIONS.map(([key, label]) => {
              const isSelected = newTheme === key;
              const gradient = THEME_GRADIENTS[key] || THEME_GRADIENTS.DEFAULT;
              return (
                <Pressable
                  key={key}
                  onPress={() => setNewTheme(key)}
                  style={({ hovered }) => [
                    styles.themeOption,
                    {
                      backgroundColor: isSelected
                        ? gradient[0] + '1A'
                        : dc.inputBg,
                      borderColor: isSelected ? gradient[0] : dc.inputBorder,
                    },
                    hovered && !isSelected && {
                      backgroundColor: dc.hoverBg,
                    },
                    { cursor: 'pointer' } as any,
                  ]}
                >
                  <Text
                    style={[
                      styles.themeOptionText,
                      {
                        color: isSelected ? gradient[0] : dc.textSecondary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* 여행 일정 선택 */}
          <Text style={[styles.inputLabel, { color: dc.textSecondary }]}>
            여행 일정
          </Text>
          <View style={styles.dateRow}>
            <View style={styles.dateInputWrap}>
              <Text style={[styles.dateLabel, { color: dc.textMuted }]}>시작일</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.dateInput,
                  {
                    backgroundColor: dc.inputBg,
                    borderColor: newStartDate ? colors.primary[500] : dc.inputBorder,
                    color: dc.inputText,
                  },
                ]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={dc.placeholder}
                value={newStartDate}
                onChangeText={setNewStartDate}
                maxLength={10}
              />
            </View>
            <Text style={[styles.dateSep, { color: dc.textMuted }]}>~</Text>
            <View style={styles.dateInputWrap}>
              <Text style={[styles.dateLabel, { color: dc.textMuted }]}>종료일</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.dateInput,
                  {
                    backgroundColor: dc.inputBg,
                    borderColor: newEndDate ? colors.primary[500] : dc.inputBorder,
                    color: dc.inputText,
                  },
                ]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={dc.placeholder}
                value={newEndDate}
                onChangeText={setNewEndDate}
                maxLength={10}
              />
            </View>
          </View>
          {!!newStartDate && !!newEndDate && (
            <View style={[styles.datePreview, { backgroundColor: colors.primary[500] + '10' }]}>
              <Text style={[styles.datePreviewText, { color: colors.primary[500] }]}>
                📅 {formatDateRange(newStartDate, newEndDate)}
              </Text>
            </View>
          )}

          {/* 생성 버튼 */}
          <Pressable
            onPress={handleCreateTrip}
            disabled={createTripMutation.isPending}
            style={({ pressed }) => [
              styles.gradientButton,
              pressed && { opacity: 0.85 },
              createTripMutation.isPending && { opacity: 0.6 },
              { cursor: 'pointer' } as any,
            ]}
          >
            <LinearGradient
              colors={[colors.primary[500], colors.primary[700]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButtonInner}
            >
              {createTripMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.gradientButtonText}>여행 만들기</Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>

        {/* 구분선 */}
        <View style={[styles.panelDivider, { backgroundColor: dc.panelBorder }]} />

        {/* 초대코드 참여 */}
        <View
          style={[
            styles.panelCard,
            {
              backgroundColor: dc.sectionBg,
              borderColor: dc.sectionBorder,
            },
          ]}
        >
          <View style={styles.panelCardHeader}>
            <Text style={styles.panelCardIcon}>🔗</Text>
            <Text style={[styles.panelCardTitle, { color: dc.textPrimary }]}>
              초대코드 참여
            </Text>
          </View>

          {joinError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {joinError}</Text>
            </View>
          ) : null}

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: dc.inputBg,
                borderColor: dc.inputBorder,
                color: dc.inputText,
              },
            ]}
            placeholder="초대 코드를 입력하세요"
            placeholderTextColor={dc.placeholder}
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="characters"
          />

          <Pressable
            onPress={handleJoinTrip}
            disabled={joinTripMutation.isPending}
            style={({ pressed }) => [
              styles.joinButton,
              {
                backgroundColor: dc.inputBg,
                borderColor: colors.primary[500] + '40',
              },
              pressed && { opacity: 0.85 },
              joinTripMutation.isPending && { opacity: 0.6 },
              { cursor: 'pointer' } as any,
            ]}
          >
            {joinTripMutation.isPending ? (
              <ActivityIndicator color={colors.primary[500]} size="small" />
            ) : (
              <Text
                style={[styles.joinButtonText, { color: colors.primary[500] }]}
              >
                참가하기
              </Text>
            )}
          </Pressable>
        </View>

        {/* 구분선 */}
        <View style={[styles.panelDivider, { backgroundColor: dc.panelBorder }]} />

        {/* 다가오는 여행 */}
        <View
          style={[
            styles.panelCard,
            {
              backgroundColor: dc.sectionBg,
              borderColor: dc.sectionBorder,
            },
          ]}
        >
          <View style={styles.panelCardHeader}>
            <Text style={styles.panelCardIcon}>⏰</Text>
            <Text style={[styles.panelCardTitle, { color: dc.textPrimary }]}>
              다가오는 여행
            </Text>
          </View>

          {upcomingTrips.length === 0 ? (
            <Text style={[styles.noUpcoming, { color: dc.textMuted }]}>
              예정된 여행이 없습니다
            </Text>
          ) : (
            <View style={styles.upcomingList}>
              {upcomingTrips.map((trip: any) => {
                const dDay = getDDay(trip.startDate);
                const gradient =
                  THEME_GRADIENTS[trip.theme] || THEME_GRADIENTS.DEFAULT;
                return (
                  <Pressable
                    key={trip.id}
                    onPress={() => handleTripClick(trip.id)}
                    style={({ pressed, hovered }) => [
                      styles.upcomingItem,
                      hovered && {
                        backgroundColor: dc.hoverBg,
                      },
                      pressed && { opacity: 0.85 },
                      { cursor: 'pointer' } as any,
                    ]}
                  >
                    {/* D-day 뱃지 */}
                    <View
                      style={[
                        styles.ddayBadge,
                        { backgroundColor: dc.ddayBg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.ddayText,
                          { color: colors.primary[400] },
                        ]}
                      >
                        {dDay === 0 ? 'D-Day' : `D-${dDay}`}
                      </Text>
                    </View>

                    {/* 정보 */}
                    <View style={styles.upcomingInfo}>
                      <Text
                        style={[
                          styles.upcomingTitle,
                          { color: dc.textPrimary },
                        ]}
                        numberOfLines={1}
                      >
                        {trip.title}
                      </Text>
                      <Text
                        style={[
                          styles.upcomingDate,
                          { color: dc.textSecondary },
                        ]}
                      >
                        {formatDate(trip.startDate)}
                      </Text>
                    </View>

                    {/* 테마 색상 점 */}
                    <View
                      style={[
                        styles.themeDot,
                        { backgroundColor: gradient[0] },
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── 스타일 ──────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },

  // ─── 로딩 ───
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // ─── 메인 영역 ───
  mainArea: {
    flex: 1,
  },
  mainContent: {
    padding: 32,
    paddingBottom: 60,
  },

  // 헤더
  header: {
    marginBottom: 32,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },

  // 섹션 공통
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    marginBottom: 28,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  tripCount: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 10,
  },

  // ─── 그리드 ───
  gridSection: {
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },

  // 여행 카드
  tripCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    width: '31%',
    minWidth: 260,
    marginBottom: 0,
    // @ts-ignore web transition
    transitionProperty: 'transform, box-shadow',
    transitionDuration: '0.2s',
  },
  cardGradientBar: {
    height: 4,
  },
  cardBody: {
    padding: 18,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  themeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  themeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 10,
  },
  cardMetaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  inviteCodeLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  inviteCodeValue: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },

  // 빈 상태
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ─── 사이드 패널 ───
  sidePanel: {
    width: SIDE_PANEL_WIDTH,
    borderLeftWidth: 1,
  },
  sidePanelContent: {
    padding: 20,
    paddingTop: 32,
  },

  // 패널 카드
  panelCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
  },
  panelCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  panelCardIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  panelCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  panelDivider: {
    height: 1,
    marginVertical: 16,
  },

  // 에러 박스
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    textAlign: 'center',
  },

  // 입력
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 2,
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 14,
  },

  // 테마 그리드
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  themeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  themeOptionText: {
    fontSize: 13,
  },

  // 버튼
  gradientButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButtonInner: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  gradientButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  joinButton: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // 다가오는 여행
  noUpcoming: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
  upcomingList: {
    gap: 6,
  },
  upcomingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 12,
  },
  ddayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 52,
    alignItems: 'center',
  },
  ddayText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  upcomingDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  themeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 8,
  },
  dateInputWrap: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  dateInput: {
    marginBottom: 0,
    textAlign: 'center',
  },
  dateSep: {
    fontSize: 16,
    fontWeight: '600',
    paddingBottom: 12,
  },
  datePreview: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  datePreviewText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
