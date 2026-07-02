import { Tabs, usePathname } from 'expo-router';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/useResponsive';
import { useRouter } from 'expo-router';

const SIDEBAR_WIDTH = 240;

/** 커스텀 탭 바 스타일이 적용된 하단 탭 레이아웃 */
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { isDesktop, isWeb } = useResponsive();
  const router = useRouter();
  const pathname = usePathname();

  const activeTint = '#667eea';
  const inactiveTint = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';
  const tabBarBg = isDark ? 'rgba(18,18,24,0.92)' : 'rgba(255,255,255,0.92)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const sidebarBg = isDark ? 'rgba(15,15,22,0.95)' : 'rgba(248,248,252,0.95)';

  const tabs = [
    { name: 'index', title: '홈', icon: '🏠', path: '/' },
    { name: 'profile', title: '프로필', icon: '👤', path: '/profile' },
  ];

  // 데스크톱: 사이드바 + 콘텐츠 레이아웃
  if (isDesktop) {
    return (
      <View style={styles.desktopContainer}>
        {/* 사이드바 */}
        <View
          style={[
            styles.sidebar,
            {
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 16,
              backgroundColor: sidebarBg,
              borderRightColor: borderColor,
            },
          ]}
        >
          {/* 앱 로고 */}
          <View style={styles.sidebarLogo}>
            <Text style={styles.sidebarLogoEmoji}>✈️</Text>
            <Text style={[styles.sidebarLogoText, { color: isDark ? '#fff' : '#1a1a2e' }]}>
              WEPL
            </Text>
          </View>

          {/* 네비게이션 항목 */}
          <View style={styles.sidebarNav}>
            {tabs.map((tab) => {
              const isActive = pathname === tab.path || (tab.path === '/' && pathname === '/index');
              return (
                <Pressable
                  key={tab.name}
                  onPress={() => router.push(tab.path as any)}
                  style={({ pressed }) => [
                    styles.sidebarItem,
                    isActive && styles.sidebarItemActive,
                    pressed && { opacity: 0.7 },
                    isWeb && ({ cursor: 'pointer' } as any),
                  ]}
                >
                  <Text style={[styles.sidebarItemIcon, isActive && styles.sidebarItemIconActive]}>
                    {tab.icon}
                  </Text>
                  <Text
                    style={[
                      styles.sidebarItemText,
                      {
                        color: isActive ? activeTint : inactiveTint,
                        fontWeight: isActive ? '700' : '500',
                      },
                    ]}
                  >
                    {tab.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* 하단 브랜딩 */}
          <View style={styles.sidebarFooter}>
            <Text style={[styles.sidebarFooterText, { color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)' }]}>
              함께 만드는 완벽한 여행
            </Text>
          </View>
        </View>

        {/* 메인 콘텐츠 */}
        <View style={styles.desktopContent}>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarStyle: { display: 'none' },
            }}
          >
            <Tabs.Screen name="index" options={{ title: '홈' }} />
            <Tabs.Screen name="profile" options={{ title: '프로필' }} />
          </Tabs>
        </View>
      </View>
    );
  }

  // 모바일: 기존 하단 탭 바
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: inactiveTint,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 0 : 12,
          left: 16,
          right: 16,
          height: 64 + (Platform.OS === 'ios' ? insets.bottom : 0),
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
          paddingTop: 8,
          backgroundColor: tabBarBg,
          borderTopWidth: 1,
          borderTopColor: borderColor,
          borderRadius: Platform.OS === 'ios' ? 0 : 20,
          ...(Platform.OS !== 'ios' && {
            borderWidth: 1,
            borderColor,
            elevation: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
          }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Text style={[styles.icon, focused && styles.iconActive]}>🏠</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '프로필',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Text style={[styles.icon, focused && styles.iconActive]}>👤</Text>
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 32,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  iconWrapActive: {
    backgroundColor: 'rgba(102, 126, 234, 0.12)',
  },
  icon: {
    fontSize: 18,
    opacity: 0.6,
  },
  iconActive: {
    opacity: 1,
    fontSize: 20,
  },
  // 데스크톱 사이드바 스타일
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  sidebarLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 32,
  },
  sidebarLogoEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  sidebarLogoText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 3,
  },
  sidebarNav: {
    flex: 1,
    gap: 4,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  sidebarItemActive: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },
  sidebarItemIcon: {
    fontSize: 20,
    opacity: 0.6,
  },
  sidebarItemIconActive: {
    opacity: 1,
  },
  sidebarItemText: {
    fontSize: 15,
  },
  sidebarFooter: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sidebarFooterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  desktopContent: {
    flex: 1,
  },
});
