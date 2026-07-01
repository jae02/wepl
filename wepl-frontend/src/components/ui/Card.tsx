/**
 * 카드 컴포넌트
 * 섀도우 + 보더 기반의 카드 컨테이너
 * Pressable 변형 및 그라디언트 헤더 옵션 지원
 */

import React, { useCallback, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { colors, spacing, radius, shadows } from '@/theme';

// ─── 타입 정의 ──────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Pressable 카드로 변환 */
  onPress?: () => void;
  /** 그라디언트 헤더 (그라디언트 색상 배열) */
  gradientHeader?: readonly [string, string, ...string[]];
  /** 그라디언트 헤더 내용 */
  headerContent?: React.ReactNode;
  /** 그라디언트 헤더 높이 */
  headerHeight?: number;
  /** 패딩 제거 */
  noPadding?: boolean;
  /** 카드 높이 (elevated) */
  elevated?: boolean;
}

// ─── 컴포넌트 ───────────────────────────────────────────────────────────────────

export function Card({
  children,
  style,
  onPress,
  gradientHeader,
  headerContent,
  headerHeight = 120,
  noPadding = false,
  elevated = false,
}: CardProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  // 프레스 스케일 애니메이션
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    if (!onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [onPress, scaleAnim]);

  const handlePressOut = useCallback(() => {
    if (!onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [onPress, scaleAnim]);

  const cardStyle: ViewStyle = {
    backgroundColor: elevated
      ? (isDark ? colors.dark.elevated : colors.light.elevated)
      : (isDark ? colors.dark.card : colors.light.card),
    borderColor: isDark ? colors.dark.border : colors.light.border,
  };

  const shadowStyle = elevated ? shadows.lg : shadows.md;

  const content = (
    <>
      {/* 그라디언트 헤더 */}
      {gradientHeader && (
        <LinearGradient
          colors={gradientHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientHeader, { height: headerHeight }]}
        >
          {headerContent}
        </LinearGradient>
      )}

      {/* 카드 본문 */}
      <View style={[!noPadding && styles.body]}>
        {children}
      </View>
    </>
  );

  // Pressable 변형
  if (onPress) {
    return (
      <Animated.View
        style={[
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={({ pressed }) => [
            styles.card,
            cardStyle,
            shadowStyle,
            gradientHeader && styles.cardWithHeader,
            pressed && styles.cardPressed,
            style,
          ]}
        >
          {content}
        </Pressable>
      </Animated.View>
    );
  }

  // 일반 카드
  return (
    <View
      style={[
        styles.card,
        cardStyle,
        shadowStyle,
        gradientHeader && styles.cardWithHeader,
        style,
      ]}
    >
      {content}
    </View>
  );
}

// ─── 스타일시트 ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardWithHeader: {
    padding: 0,
  },
  cardPressed: {
    opacity: 0.95,
  },
  gradientHeader: {
    width: '100%',
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  body: {
    padding: spacing.lg,
  },
});
