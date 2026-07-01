/**
 * 텍스트 입력 컴포넌트
 * 라벨, 에러 메시지, 포커스 애니메이션, 비밀번호 토글 지원
 * 다크 모드 호환
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { colors, typography, spacing, radius, animation } from '@/theme';

// ─── 타입 정의 ──────────────────────────────────────────────────────────────────

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

// ─── 컴포넌트 ───────────────────────────────────────────────────────────────────

export function Input({
  label,
  error,
  icon,
  rightIcon,
  secureTextEntry,
  containerStyle,
  ...textInputProps
}: InputProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // 포커스 시 보더 색상 애니메이션
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: animation.fast,
      useNativeDriver: false,
    }).start();
  }, [borderAnim]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: animation.fast,
      useNativeDriver: false,
    }).start();
  }, [borderAnim]);

  // 보더 색상 보간
  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error
        ? colors.error
        : isDark
          ? colors.dark.border
          : colors.light.border,
      error ? colors.error : colors.primary[500],
    ],
  });

  const isSecure = secureTextEntry && !isPasswordVisible;

  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* 라벨 */}
      {label && (
        <Text
          style={[
            styles.label,
            { color: error ? colors.error : themeColors.textSecondary },
            isFocused && !error && { color: colors.primary[500] },
          ]}
        >
          {label}
        </Text>
      )}

      {/* 입력 필드 래퍼 */}
      <Animated.View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: isDark ? colors.dark.elevated : colors.light.elevated,
            borderColor: borderColor,
          },
          isFocused && styles.inputWrapperFocused,
        ]}
      >
        {/* 왼쪽 아이콘 */}
        {icon && <View style={styles.iconLeft}>{icon}</View>}

        {/* TextInput */}
        <TextInput
          {...textInputProps}
          secureTextEntry={isSecure}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={themeColors.textTertiary}
          style={[
            styles.input,
            { color: themeColors.text },
            icon ? styles.inputWithLeftIcon : undefined,
            (secureTextEntry || rightIcon) ? styles.inputWithRightIcon : undefined,
          ]}
        />

        {/* 비밀번호 토글 버튼 */}
        {secureTextEntry && (
          <Pressable
            onPress={() => setIsPasswordVisible((prev) => !prev)}
            style={styles.iconRight}
            hitSlop={8}
          >
            <Text style={[styles.eyeIcon, { color: themeColors.textTertiary }]}>
              {isPasswordVisible ? '🙈' : '👁️'}
            </Text>
          </Pressable>
        )}

        {/* 커스텀 오른쪽 아이콘 */}
        {!secureTextEntry && rightIcon && (
          <View style={styles.iconRight}>{rightIcon}</View>
        )}
      </Animated.View>

      {/* 에러 메시지 */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

// ─── 스타일시트 ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.sm,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  inputWrapperFocused: {
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: spacing.lg,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.regular,
  },
  inputWithLeftIcon: {
    paddingLeft: spacing.xs,
  },
  inputWithRightIcon: {
    paddingRight: spacing.xs,
  },
  iconLeft: {
    paddingLeft: spacing.lg,
  },
  iconRight: {
    paddingRight: spacing.lg,
  },
  eyeIcon: {
    fontSize: typography.sizes.xl,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
});
