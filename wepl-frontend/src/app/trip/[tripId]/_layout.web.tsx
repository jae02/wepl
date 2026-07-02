import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Slot, useRouter, usePathname, useLocalSearchParams } from 'expo-router';
import { useTrip } from '@/hooks/useTrips';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { colors, getThemeColors } from '@/theme';

const TABS = [
  { key: 'wishlist', label: '📌 위시리스트' },
  { key: 'timeline', label: '📅 타임라인' },
  { key: 'expense', label: '💰 가계부' },
] as const;

function getActiveTab(pathname: string): string {
  if (pathname.includes('timeline')) return 'timeline';
  if (pathname.includes('expense')) return 'expense';
  return 'wishlist';
}

export default function TripDetailWebLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { data: trip, isLoading } = useTrip(tripId);

  const scheme = useColorScheme();
  const themeColors = getThemeColors(scheme ?? 'light');
  const isDark = (scheme ?? 'light') === 'dark';

  const activeTab = getActiveTab(pathname);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: themeColors.card,
            borderBottomColor: themeColors.border,
          },
        ]}
      >
        {/* Breadcrumb Row */}
        <View style={styles.headerInner}>
          <View style={styles.breadcrumbRow}>
            <Pressable
              onPress={() => router.push('/')}
              style={({ hovered }: any) => [
                styles.breadcrumbLink,
                hovered && {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(0,0,0,0.04)',
                },
              ]}
            >
              {({ hovered }: any) => (
                <Text
                  style={[
                    styles.breadcrumbLinkText,
                    { color: colors.primary[500] },
                    hovered && { opacity: 0.8 },
                  ]}
                >
                  ← 홈
                </Text>
              )}
            </Pressable>

            <Text
              style={[
                styles.breadcrumbSeparator,
                { color: themeColors.textTertiary },
              ]}
            >
              {' / '}
            </Text>

            <Text
              style={[styles.breadcrumbTitle, { color: themeColors.text }]}
              numberOfLines={1}
            >
              {isLoading ? '불러오는 중...' : trip?.title ?? '여행'}
            </Text>
          </View>
        </View>

        {/* Tab Bar Row */}
        <View style={styles.headerInner}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBarContent}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;

              return (
                <Pressable
                  key={tab.key}
                  onPress={() =>
                    router.push(`/trip/${tripId}/${tab.key}` as any)
                  }
                  style={({ hovered }: any) => [
                    styles.tab,
                    isActive && styles.tabActive,
                    isActive && {
                      borderBottomColor: colors.primary[500],
                    },
                    !isActive && {
                      borderBottomColor: 'transparent',
                    },
                    hovered &&
                      !isActive && {
                        backgroundColor: isDark
                          ? 'rgba(255,255,255,0.04)'
                          : 'rgba(0,0,0,0.03)',
                      },
                    { cursor: 'pointer' as any },
                  ]}
                >
                  {({ hovered }: any) => (
                    <Text
                      style={[
                        styles.tabLabel,
                        {
                          color: isActive
                            ? colors.primary[500]
                            : themeColors.textTertiary,
                        },
                        hovered &&
                          !isActive && {
                            color: themeColors.textSecondary,
                          },
                      ]}
                    >
                      {tab.label}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: '100%' as any,
  },
  header: {
    borderBottomWidth: 1,
  },
  headerInner: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
    gap: 4,
  },
  breadcrumbLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    cursor: 'pointer' as any,
  },
  breadcrumbLinkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  breadcrumbSeparator: {
    fontSize: 14,
  },
  breadcrumbTitle: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  tabBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 3,
    borderRadius: 0,
    cursor: 'pointer' as any,
  },
  tabActive: {},
  tabLabel: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  content: {
    flex: 1,
  },
});
