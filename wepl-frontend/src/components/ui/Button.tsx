/**
 * 프리미엄 버튼 컴포넌트
 * 그라디언트, 아웃라인, 고스트, 위험 변형 지원
 * 프레스 시 스케일 애니메이션 + 로딩 상태 포함
 */

import React, { useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { colors, typography, spacing, radius, shadows } from '@/theme';

// ─── 타입 정의 ──────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

// ─── 사이즈별 스타일 맵 ─────────────────────────────────────────────────────────

const sizeStyles: Record<ButtonSize, { height: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { height: 36, paddingHorizontal: spacing.lg, fontSize: typography.sizes.sm },
  md: { height: 48, paddingHorizontal: spacing['2xl'], fontSize: typography.sizes.base },
  lg: { height: 56, paddingHorizontal: spacing['3xl'], fontSize: typography.sizes.lg },
};

// ─── 컴포넌트 ───────────────────────────────────────────────────────────────────

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  style,
}: ButtonProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  // 프레스 스케일 애니메이션
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const isDisabled = disabled || loading;
  const sizeConfig = sizeStyles[size];

  // 변형별 스타일 계산
  const variantContainerStyle = getVariantContainerStyle(variant, isDark, isDisabled);
  const variantTextStyle = getVariantTextStyle(variant, isDark, isDisabled);
  const indicatorColor = getIndicatorColor(variant, isDark);

  // Primary는 LinearGradient 사용
  const isPrimary = variant === 'primary';

  const containerStyle: ViewStyle = {
    height: sizeConfig.height,
    paddingHorizontal: sizeConfig.paddingHorizontal,
    borderRadius: radius.md,
    ...(fullWidth ? { width: '100%' } : {}),
  };

  const content = (
    <>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={indicatorColor}
          style={styles.loader}
        />
      ) : icon ? (
        <>{icon}</>
      ) : null}
      <Text
        style={[
          styles.text,
          { fontSize: sizeConfig.fontSize },
          variantTextStyle,
          loading && styles.textLoading,
        ]}
      >
        {title}
      </Text>
    </>
  );

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.base,
          containerStyle,
          !isPrimary && variantContainerStyle,
          !isPrimary && pressed && !isDisabled && styles.pressed,
        ]}
      >
        {isPrimary ? (
          <LinearGradient
            colors={
              isDisabled
                ? [colors.gray[300], colors.gray[400]]
                : [colors.primary[500], colors.primary[700]]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.gradient,
              containerStyle,
              !isDisabled && shadows.glow,
            ]}
          >
            {content}
          </LinearGradient>
        ) : (
          content
        )}
      </Pressable>
    </Animated.View>
  );
}

// ─── 변형별 스타일 헬퍼 ─────────────────────────────────────────────────────────

function getVariantContainerStyle(
  variant: ButtonVariant,
  isDark: boolean,
  isDisabled: boolean,
): ViewStyle {
  if (isDisabled) {
    return {
      backgroundColor: isDark ? colors.dark.elevated : colors.gray[100],
      borderWidth: 0,
    };
  }

  switch (variant) {
    case 'secondary':
      return {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: colors.primary[500],
      };
    case 'ghost':
      return {
        backgroundColor: 'transparent',
        borderWidth: 0,
      };
    case 'danger':
      return {
        backgroundColor: colors.error,
        borderWidth: 0,
      };
    default:
      return {};
  }
}

function getVariantTextStyle(
  variant: ButtonVariant,
  isDark: boolean,
  isDisabled: boolean,
): TextStyle {
  if (isDisabled) {
    return { color: colors.gray[400] };
  }

  switch (variant) {
    case 'primary':
      return { color: colors.white };
    case 'secondary':
      return { color: colors.primary[500] };
    case 'ghost':
      return { color: isDark ? colors.dark.text : colors.light.text };
    case 'danger':
      return { color: colors.white };
    default:
      return {};
  }
}

function getIndicatorColor(variant: ButtonVariant, isDark: boolean): string {
  switch (variant) {
    case 'primary':
    case 'danger':
      return colors.white;
    case 'secondary':
      return colors.primary[500];
    case 'ghost':
      return isDark ? colors.dark.text : colors.light.text;
    default:
      return colors.white;
  }
}

// ─── 스타일시트 ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.3,
  },
  textLoading: {
    marginLeft: spacing.sm,
  },
  loader: {
    marginRight: spacing.xs,
  },
  pressed: {
    opacity: 0.85,
  },
  fullWidth: {
    width: '100%',
  },
});
