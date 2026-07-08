import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated as RNAnimated,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Slot, useRouter, useLocalSearchParams, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/useResponsive';
import { useSocket } from '@/hooks/useSocket';


type TabKey = 'wishlist' | 'timeline' | 'expense';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'timeline', label: '타임라인', icon: '📅' },
  { key: 'wishlist', label: '위시리스트', icon: '📌' },
  { key: 'expense', label: '가계부', icon: '💰' },
];

/** 여행 상세 레이아웃 — 상단 탭 네비게이션 */
export default function TripDetailLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { width } = useWindowDimensions();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { isDesktop, isWeb, contentMaxWidth } = useResponsive();

  // 소켓 연결
  useSocket(tripId);

  // 현재 활성 탭 계산
  const currentSegment = segments[segments.length - 1] as TabKey | undefined;
  const activeTab = currentSegment && TABS.some((t) => t.key === currentSegment)
    ? currentSegment
    : 'wishlist';

  const indicatorAnim = useRef(new RNAnimated.Value(0)).current;
  const effectiveTabBarWidth = isDesktop ? Math.min(width - 48, contentMaxWidth) : width - 48;
  const tabWidth = effectiveTabBarWidth / TABS.length;

  // 탭 변경 시 인디케이터 애니메이션
  const activeIndex = TABS.findIndex((t) => t.key === activeTab);
  RNAnimated.timing(indicatorAnim, {
    toValue: activeIndex * tabWidth,
    duration: 250,
    useNativeDriver: true,
  }).start();

  const handleTabPress = useCallback(
    (tab: TabKey) => {
      router.replace(`/trip/${tripId}/${tab}`);
    },
    [tripId, router],
  );

  const ds = {
    bg: isDark ? '#0a0a0f' : '#f5f5fa',
    headerBg: isDark ? '#0f0f18' : '#ffffff',
    headerBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    textPrimary: isDark ? '#ffffff' : '#1a1a2e',
    textSecondary: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)',
    tabBg: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
  };

  return (
    <View style={[styles.container, { backgroundColor: ds.bg }]}>
      {/* 헤더 */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: ds.headerBg,
            borderBottomColor: ds.headerBorder,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }, isWeb && ({ cursor: 'pointer' } as any)]}
            hitSlop={12}
          >
            <Text style={[styles.backIcon, { color: ds.textPrimary }]}>←</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: ds.textPrimary }]} numberOfLines={1}>
            여행 상세
          </Text>
          <View style={styles.backButton} />
        </View>

        {/* 탭 바 */}
        <View style={[styles.tabBar, { backgroundColor: ds.tabBg }, isDesktop && { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as any }]}>
          {/* 인디케이터 */}
          <RNAnimated.View
            style={[
              styles.tabIndicator,
              {
                width: tabWidth - 4,
                transform: [{ translateX: RNAnimated.add(indicatorAnim, 2) }],
              },
            ]}
          />
          {TABS.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => handleTabPress(tab.key)}
              style={[styles.tab, { width: tabWidth }, isWeb && ({ cursor: 'pointer' } as any)]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  isDesktop && styles.desktopTabLabel,
                  {
                    color:
                      activeTab === tab.key ? '#667eea' : ds.textSecondary,
                    fontWeight: activeTab === tab.key ? '700' : '500',
                  },
                ] as any}
              >
                {tab.icon} {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 탭 콘텐츠 */}
      <View style={styles.content as any}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: Platform.OS === 'web' ? '100%' : '100%',
    overflow: 'hidden',
  },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    height: 40,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 22,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 2,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 0,
    borderRadius: 10,
    backgroundColor: 'rgba(102, 126, 234, 0.12)',
  },
  tab: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tabLabel: {
    fontSize: 13,
  },
  // 데스크톱 반응형 스타일
  desktopTabLabel: {
    fontSize: 15,
  },
  content: {
    flex: 1,
  },
});
