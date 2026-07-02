/**
 * 웹 전용 프로필 화면
 * PC 브라우저 전용 프리미엄 대시보드 스타일 프로필 페이지
 * .web.tsx 확장자로 Metro 번들러가 웹 플랫폼에서 자동 선택
 */

import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, radius, shadows } from '@/theme';
import { getThemeColors } from '@/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/stores/auth.store';
import { useTrips } from '@/hooks/useTrips';

// ─── 아바타 그라디언트 컬러 팔레트 ──────────────────────────────────────────────

const AVATAR_GRADIENTS = [
  ['#667eea', '#764ba2'],
  ['#f5576c', '#ff6b6b'],
  ['#4facfe', '#00f2fe'],
  ['#fa709a', '#fee140'],
  ['#a18cd1', '#fbc2eb'],
  ['#43e97b', '#38f9d7'],
];

function getAvatarGradient(name: string): string[] {
  const charCode = name.charCodeAt(0) || 0;
  return AVATAR_GRADIENTS[charCode % AVATAR_GRADIENTS.length];
}

// ─── 날짜 포매터 ────────────────────────────────────────────────────────────────

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}년 ${month}월 ${day}일`;
}

// ─── 컴포넌트 ───────────────────────────────────────────────────────────────────

export default function ProfileWebScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = getThemeColors(colorScheme);
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { data: trips } = useTrips();

  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  // 여행 통계 계산
  const tripStats = useMemo(() => {
    if (!trips || !Array.isArray(trips)) {
      return { total: 0, upcoming: 0, completed: 0 };
    }

    const now = new Date();
    const upcoming = trips.filter((trip) => new Date(trip.startDate) > now).length;
    const completed = trips.filter((trip) => new Date(trip.endDate) < now).length;

    return {
      total: trips.length,
      upcoming,
      completed,
    };
  }, [trips]);

  // 아바타
  const nickname = user?.nickname || '사용자';
  const firstLetter = nickname.charAt(0).toUpperCase();
  const avatarGradient = getAvatarGradient(nickname);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: isDark ? colors.dark.bg : colors.light.bg }]}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.container}>
        {/* ─── 페이지 헤더 ─── */}
        <Text style={[styles.pageTitle, { color: theme.text }]}>프로필</Text>

        {/* ─── 프로필 카드 ─── */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
            shadows.lg,
          ]}
        >
          {/* 배경 그라디언트 바 */}
          <View
            style={[
              styles.profileBanner,
              {
                backgroundImage: `linear-gradient(135deg, ${avatarGradient[0]}, ${avatarGradient[1]})`,
              } as any,
            ]}
          />

          {/* 아바타 */}
          <View style={styles.avatarContainer}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundImage: `linear-gradient(135deg, ${avatarGradient[0]}, ${avatarGradient[1]})`,
                  borderColor: theme.card,
                } as any,
              ]}
            >
              <Text style={styles.avatarLetter}>{firstLetter}</Text>
            </View>
          </View>

          {/* 사용자 정보 */}
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.text }]}>{nickname}</Text>
            <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
              {user?.email || ''}
            </Text>
            {user?.createdAt && (
              <View style={styles.joinDateRow}>
                <Text style={[styles.joinDateLabel, { color: theme.textTertiary }]}>
                  📅 가입일: {formatDate(user.createdAt)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ─── 통계 카드 ─── */}
        <View style={styles.statsRow}>
          {/* 내 여행 수 */}
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
              shadows.md,
              hoveredButton === 'stat-total' && {
                transform: [{ translateY: -2 }],
                borderColor: colors.primary[400],
              },
            ]}
            onPointerEnter={() => setHoveredButton('stat-total')}
            onPointerLeave={() => setHoveredButton(null)}
          >
            <Text style={styles.statEmoji}>📋</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{tripStats.total}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>내 여행 수</Text>
          </View>

          {/* 다가오는 여행 */}
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
              shadows.md,
              hoveredButton === 'stat-upcoming' && {
                transform: [{ translateY: -2 }],
                borderColor: colors.info,
              },
            ]}
            onPointerEnter={() => setHoveredButton('stat-upcoming')}
            onPointerLeave={() => setHoveredButton(null)}
          >
            <Text style={styles.statEmoji}>✈️</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{tripStats.upcoming}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>다가오는 여행</Text>
          </View>

          {/* 완료된 여행 */}
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
              shadows.md,
              hoveredButton === 'stat-completed' && {
                transform: [{ translateY: -2 }],
                borderColor: colors.success,
              },
            ]}
            onPointerEnter={() => setHoveredButton('stat-completed')}
            onPointerLeave={() => setHoveredButton(null)}
          >
            <Text style={styles.statEmoji}>📅</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{tripStats.completed}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>완료된 여행</Text>
          </View>
        </View>

        {/* ─── 액션 섹션 ─── */}
        <View
          style={[
            styles.actionSection,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
            shadows.md,
          ]}
        >
          <Text style={[styles.actionTitle, { color: theme.text }]}>계정 관리</Text>

          {/* 로그아웃 버튼 */}
          <Pressable
            onPress={handleLogout}
            onHoverIn={() => setHoveredButton('logout')}
            onHoverOut={() => setHoveredButton(null)}
            style={[
              styles.logoutButton,
              hoveredButton === 'logout' && styles.logoutButtonHovered,
              { cursor: 'pointer' } as any,
            ]}
          >
            <Text style={styles.logoutButtonText}>🚪 로그아웃</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── 스타일 ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing['4xl'],
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: 800,
    paddingHorizontal: spacing['2xl'],
  },

  // 페이지 타이틀
  pageTitle: {
    fontSize: typography.sizes['4xl'],
    fontWeight: typography.weights.bold,
    marginBottom: spacing['3xl'],
    letterSpacing: 0.5,
  },

  // ─── 프로필 카드 ───
  profileCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing['2xl'],
  },
  profileBanner: {
    height: 120,
    width: '100%',
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: -48,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
  },
  avatarLetter: {
    fontSize: 40,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  userInfo: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing['3xl'],
  },
  userName: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: typography.sizes.base,
    marginBottom: spacing.md,
  },
  joinDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  joinDateLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },

  // ─── 통계 카드 ───
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  statCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    letterSpacing: 0.3,
  },

  // ─── 액션 섹션 ───
  actionSection: {
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['2xl'],
  },
  actionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.lg,
  },
  logoutButton: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonHovered: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  logoutButtonText: {
    color: colors.error,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.5,
  },
});
