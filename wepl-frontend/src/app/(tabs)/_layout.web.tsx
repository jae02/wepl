/**
 * 웹 전용 탭 레이아웃 — 좌측 사이드바 네비게이션
 * Metro 번들러가 .web.tsx를 우선 선택하여 웹에서만 사용됩니다.
 */

import { Slot, useRouter, usePathname } from 'expo-router';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useAuthStore } from '@/stores/auth.store';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { colors } from '@/theme';

const SIDEBAR_WIDTH = 260;

interface NavItem {
  icon: string;
  label: string;
  path: string;
  matchPaths: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    icon: '🏠',
    label: '대시보드',
    path: '/(tabs)/',
    matchPaths: ['/', '/(tabs)', '/(tabs)/index', '/index'],
  },
  {
    icon: '👤',
    label: '프로필',
    path: '/(tabs)/profile',
    matchPaths: ['/profile', '/(tabs)/profile'],
  },
];

export default function WebTabLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const themeColors = {
    sidebarBg: isDark ? 'rgba(15,15,30,0.97)' : 'rgba(255,255,255,0.97)',
    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    contentBg: isDark ? colors.dark.bg : colors.light.bg,
    textPrimary: isDark ? colors.dark.text : colors.light.text,
    textSecondary: isDark ? colors.dark.textSecondary : colors.light.textSecondary,
    textMuted: isDark ? colors.dark.textTertiary : colors.light.textTertiary,
    navHover: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    logoutHover: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.06)',
  };

  const isActive = (item: NavItem): boolean => {
    return item.matchPaths.some((p) => pathname === p);
  };

  const handleLogout = async () => {
    await useAuthStore.getState().logout();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      {/* ─── 사이드바 ─── */}
      <View
        style={[
          styles.sidebar,
          {
            backgroundColor: themeColors.sidebarBg,
            borderRightColor: themeColors.borderColor,
          },
        ]}
      >
        <ScrollView
          style={styles.sidebarScroll}
          contentContainerStyle={styles.sidebarScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 로고 */}
          <View style={styles.logoContainer}>
            <Text style={styles.logoEmoji}>✈️</Text>
            <Text style={[styles.logoText, { color: colors.primary[500] }]}>
              WEPL
            </Text>
          </View>

          {/* 구분선 */}
          <View
            style={[
              styles.divider,
              { backgroundColor: themeColors.borderColor },
            ]}
          />

          {/* 네비게이션 항목 */}
          <View style={styles.navSection}>
            {NAV_ITEMS.map((item) => {
              const active = isActive(item);
              return (
                <Pressable
                  key={item.path}
                  onPress={() => router.push(item.path as any)}
                  style={({ pressed, hovered }) => [
                    styles.navItem,
                    active && {
                      backgroundColor:
                        colors.primary[500] + '1A', // 10% opacity
                    },
                    !active && hovered && {
                      backgroundColor: themeColors.navHover,
                    },
                    pressed && { opacity: 0.8 },
                    { cursor: 'pointer' } as any,
                  ]}
                >
                  <Text style={styles.navIcon}>{item.icon}</Text>
                  <Text
                    style={[
                      styles.navLabel,
                      {
                        color: active
                          ? colors.primary[500]
                          : themeColors.textSecondary,
                        fontWeight: active ? '700' : '500',
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                  {/* 활성 표시 바 */}
                  {active && (
                    <View
                      style={[
                        styles.activeIndicator,
                        { backgroundColor: colors.primary[500] },
                      ]}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* 스페이서 — 하단 섹션을 밀어냄 */}
          <View style={styles.spacer} />

          {/* 하단 구분선 */}
          <View
            style={[
              styles.divider,
              { backgroundColor: themeColors.borderColor },
            ]}
          />

          {/* 로그아웃 */}
          <Pressable
            onPress={handleLogout}
            style={({ pressed, hovered }) => [
              styles.navItem,
              styles.logoutItem,
              hovered && {
                backgroundColor: themeColors.logoutHover,
              },
              pressed && { opacity: 0.8 },
              { cursor: 'pointer' } as any,
            ]}
          >
            <Text style={styles.navIcon}>🚪</Text>
            <Text
              style={[
                styles.navLabel,
                { color: colors.error, fontWeight: '500' },
              ]}
            >
              로그아웃
            </Text>
          </Pressable>

          {/* 버전 정보 */}
          <View style={styles.versionContainer}>
            <Text style={[styles.versionText, { color: themeColors.textMuted }]}>
              WEPL v1.0.0
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* ─── 메인 콘텐츠 ─── */}
      <View style={[styles.content, { backgroundColor: themeColors.contentBg }]}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },

  // ─── 사이드바 ───
  sidebar: {
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
  },
  sidebarScroll: {
    flex: 1,
  },
  sidebarScrollContent: {
    flexGrow: 1,
    paddingTop: 28,
    paddingBottom: 20,
  },

  // ─── 로고 ───
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
    marginBottom: 8,
  },
  logoEmoji: {
    fontSize: 28,
    marginRight: 10,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 3,
  },

  // ─── 구분선 ───
  divider: {
    height: 1,
    marginHorizontal: 20,
    marginVertical: 16,
  },

  // ─── 네비게이션 ───
  navSection: {
    gap: 4,
    paddingHorizontal: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 4,
    position: 'relative',
  },
  navIcon: {
    fontSize: 20,
    marginRight: 14,
  },
  navLabel: {
    fontSize: 15,
    letterSpacing: 0.2,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 2,
  },

  // ─── 하단 ───
  spacer: {
    flex: 1,
    minHeight: 40,
  },
  logoutItem: {
    marginTop: 4,
  },
  versionContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 4,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
  },

  // ─── 콘텐츠 ───
  content: {
    flex: 1,
  },
});
