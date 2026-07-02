/**
 * 웹 전용 로그인 화면
 * PC 브라우저 전용 스플릿 레이아웃 (좌: 브랜딩, 우: 로그인 폼)
 * .web.tsx 확장자로 Metro 번들러가 웹 플랫폼에서 자동 선택
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, radius, shadows } from '@/theme';
import { getThemeColors } from '@/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLogin } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/auth.store';

// ─── 브랜딩 영역 피처 하이라이트 ────────────────────────────────────────────────

const FEATURES = [
  { emoji: '📅', text: '스마트한 일정 관리' },
  { emoji: '💰', text: '편리한 공동 가계부' },
  { emoji: '📸', text: '소중한 여행 다이어리' },
];

// ─── 컴포넌트 ───────────────────────────────────────────────────────────────────

export default function LoginWebScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = getThemeColors(colorScheme);
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const loginMutation = useLogin();
  const authLogin = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    try {
      const result = await loginMutation.mutateAsync({ email: email.trim(), password });
      authLogin(result.accessToken, result.user);
    } catch (e: any) {
      setError(e?.message || '로그인에 실패했습니다.');
    }
  };

  const handleKeyPress = (e: any) => {
    if (e.nativeEvent?.key === 'Enter' || e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <View style={styles.root}>
      {/* ─── 좌측: 브랜딩 영역 ─── */}
      <View style={styles.brandingSide}>
        {/* 장식 그라디언트 원 */}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
        <View style={styles.decorCircle3} />

        <View style={styles.brandingContent}>
          {/* 로고 */}
          <Text style={styles.logoEmoji}>✈️</Text>
          <Text style={styles.logoText}>WEPL</Text>
          <Text style={styles.tagline}>함께 만드는 완벽한 여행</Text>

          {/* 피처 목록 */}
          <View style={styles.featuresContainer}>
            {FEATURES.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <Text style={styles.featureEmoji}>{feature.emoji}</Text>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ─── 우측: 로그인 폼 ─── */}
      <ScrollView
        style={[styles.formSide, { backgroundColor: isDark ? colors.dark.bg : colors.light.bg }]}
        contentContainerStyle={styles.formSideContent}
      >
        <View
          style={[
            styles.formCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
            shadows.xl,
          ]}
        >
          {/* 타이틀 */}
          <Text style={[styles.formTitle, { color: theme.text }]}>로그인</Text>
          <Text style={[styles.formSubtitle, { color: theme.textSecondary }]}>
            WEPL 계정으로 로그인하세요
          </Text>

          {/* 에러 메시지 */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* 이메일 입력 */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>이메일</Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: isDark ? colors.dark.elevated : colors.gray[50],
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={styles.inputIcon}>📧</Text>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="이메일을 입력하세요"
                placeholderTextColor={theme.textTertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                onKeyPress={handleKeyPress}
              />
            </View>
          </View>

          {/* 비밀번호 입력 */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>비밀번호</Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: isDark ? colors.dark.elevated : colors.gray[50],
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="비밀번호를 입력하세요"
                placeholderTextColor={theme.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                onKeyPress={handleKeyPress}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={[styles.visibilityToggle, { cursor: 'pointer' } as any]}
              >
                <Text style={styles.visibilityIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </Pressable>
            </View>
          </View>

          {/* 로그인 버튼 */}
          <Pressable
            onPress={handleLogin}
            onHoverIn={() => setHoveredButton('login')}
            onHoverOut={() => setHoveredButton(null)}
            disabled={loginMutation.isPending}
            style={[
              styles.loginButton,
              hoveredButton === 'login' && styles.loginButtonHovered,
              loginMutation.isPending && styles.buttonDisabled,
              { cursor: 'pointer' } as any,
            ]}
          >
            {loginMutation.isPending ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.loginButtonText}>로그인</Text>
            )}
          </Pressable>

          {/* 회원가입 링크 */}
          <View style={styles.linkContainer}>
            <Text style={[styles.linkText, { color: theme.textSecondary }]}>
              계정이 없으신가요?{' '}
            </Text>
            <Pressable
              onPress={() => router.push('/(auth)/signup')}
              onHoverIn={() => setHoveredButton('signup')}
              onHoverOut={() => setHoveredButton(null)}
              style={[{ cursor: 'pointer' } as any]}
            >
              <Text
                style={[
                  styles.linkAction,
                  hoveredButton === 'signup' && styles.linkActionHovered,
                ]}
              >
                회원가입
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── 스타일 ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    minHeight: '100%' as any,
  },

  // ─── 좌측 브랜딩 ───
  brandingSide: {
    flex: 1,
    backgroundImage: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' as any,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    top: -50,
    left: -80,
  },
  decorCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    bottom: 60,
    right: -40,
  },
  decorCircle3: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    top: '40%' as any,
    right: '20%' as any,
  },
  brandingContent: {
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
    zIndex: 1,
  },
  logoEmoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  logoText: {
    fontSize: 48,
    fontWeight: typography.weights.bold,
    color: colors.white,
    letterSpacing: 8,
    marginBottom: spacing.lg,
  },
  tagline: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.medium,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing['4xl'],
    letterSpacing: 1,
  },
  featuresContainer: {
    gap: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.regular,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.5,
  },

  // ─── 우측 폼 영역 ───
  formSide: {
    flex: 1,
  },
  formSideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['4xl'],
    paddingVertical: spacing['4xl'],
  },
  formCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing['4xl'],
  },
  formTitle: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
  },
  formSubtitle: {
    fontSize: typography.sizes.base,
    marginBottom: spacing['3xl'],
  },

  // 에러
  errorContainer: {
    backgroundColor: colors.errorLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },

  // 입력 필드
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.sm,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.base,
    height: '100%' as any,
    outlineStyle: 'none' as any,
  },
  visibilityToggle: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  visibilityIcon: {
    fontSize: 16,
  },

  // 로그인 버튼
  loginButton: {
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' as any,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  loginButtonHovered: {
    opacity: 0.9,
    transform: [{ translateY: -1 }],
  },
  loginButtonText: {
    color: colors.white,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    letterSpacing: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // 링크
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkText: {
    fontSize: typography.sizes.sm,
  },
  linkAction: {
    color: colors.primary[500],
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  linkActionHovered: {
    textDecorationLine: 'underline',
  },
});
