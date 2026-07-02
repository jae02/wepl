/**
 * 웹 전용 회원가입 화면
 * PC 브라우저 전용 스플릿 레이아웃 (좌: 브랜딩, 우: 회원가입 폼)
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
import { useSignup } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/auth.store';

// ─── 브랜딩 영역 피처 하이라이트 ────────────────────────────────────────────────

const FEATURES = [
  { emoji: '🌍', text: '전 세계 여행 계획' },
  { emoji: '👥', text: '친구와 함께하는 여행' },
  { emoji: '✨', text: '특별한 여행 경험' },
];

// ─── 컴포넌트 ───────────────────────────────────────────────────────────────────

export default function SignupWebScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = getThemeColors(colorScheme);
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const signupMutation = useSignup();
  const authLogin = useAuthStore((s) => s.login);

  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSignup = async () => {
    setError('');
    if (!nickname.trim() || !email.trim() || !password.trim()) {
      setError('모든 필드를 입력해주세요.');
      return;
    }
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    try {
      const result = await signupMutation.mutateAsync({
        email: email.trim(),
        password,
        nickname: nickname.trim(),
      });
      authLogin(result.accessToken, result.user);
    } catch (e: any) {
      setError(e?.message || '회원가입에 실패했습니다.');
    }
  };

  const handleKeyPress = (e: any) => {
    if (e.nativeEvent?.key === 'Enter' || e.key === 'Enter') {
      handleSignup();
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
          <Text style={styles.logoEmoji}>✈️</Text>
          <Text style={styles.logoText}>WEPL</Text>
          <Text style={styles.tagline}>새로운 여행이 시작됩니다</Text>

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

      {/* ─── 우측: 회원가입 폼 ─── */}
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
          <Text style={[styles.formTitle, { color: theme.text }]}>회원가입</Text>
          <Text style={[styles.formSubtitle, { color: theme.textSecondary }]}>
            WEPL에 가입하고 여행을 시작하세요
          </Text>

          {/* 에러 메시지 */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* 닉네임 입력 */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>닉네임</Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: isDark ? colors.dark.elevated : colors.gray[50],
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="닉네임을 입력하세요"
                placeholderTextColor={theme.textTertiary}
                value={nickname}
                onChangeText={setNickname}
                onKeyPress={handleKeyPress}
              />
            </View>
          </View>

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

          {/* 비밀번호 확인 입력 */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>비밀번호 확인</Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: isDark ? colors.dark.elevated : colors.gray[50],
                  borderColor: passwordsMatch
                    ? colors.success
                    : passwordsMismatch
                    ? colors.error
                    : theme.border,
                  borderWidth: passwordsMatch || passwordsMismatch ? 1.5 : 1,
                },
              ]}
            >
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="비밀번호를 다시 입력하세요"
                placeholderTextColor={theme.textTertiary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                onKeyPress={handleKeyPress}
              />
              <Pressable
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={[styles.visibilityToggle, { cursor: 'pointer' } as any]}
              >
                <Text style={styles.visibilityIcon}>
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </Text>
              </Pressable>
            </View>
            {/* 비밀번호 일치 여부 표시 */}
            {passwordsMatch && (
              <Text style={styles.matchSuccess}>✅ 비밀번호가 일치합니다</Text>
            )}
            {passwordsMismatch && (
              <Text style={styles.matchError}>❌ 비밀번호가 일치하지 않습니다</Text>
            )}
          </View>

          {/* 회원가입 버튼 */}
          <Pressable
            onPress={handleSignup}
            onHoverIn={() => setHoveredButton('signup')}
            onHoverOut={() => setHoveredButton(null)}
            disabled={signupMutation.isPending}
            style={[
              styles.signupButton,
              hoveredButton === 'signup' && styles.signupButtonHovered,
              signupMutation.isPending && styles.buttonDisabled,
              { cursor: 'pointer' } as any,
            ]}
          >
            {signupMutation.isPending ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.signupButtonText}>회원가입</Text>
            )}
          </Pressable>

          {/* 로그인 링크 */}
          <View style={styles.linkContainer}>
            <Text style={[styles.linkText, { color: theme.textSecondary }]}>
              이미 계정이 있으신가요?{' '}
            </Text>
            <Pressable
              onPress={() => router.push('/(auth)/login')}
              onHoverIn={() => setHoveredButton('login')}
              onHoverOut={() => setHoveredButton(null)}
              style={[{ cursor: 'pointer' } as any]}
            >
              <Text
                style={[
                  styles.linkAction,
                  hoveredButton === 'login' && styles.linkActionHovered,
                ]}
              >
                로그인
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
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    top: -70,
    right: -100,
  },
  decorCircle2: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    bottom: 40,
    left: -60,
  },
  decorCircle3: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    top: '55%' as any,
    left: '25%' as any,
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
    paddingVertical: spacing['3xl'],
  },
  formCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing['3xl'],
  },
  formTitle: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
  },
  formSubtitle: {
    fontSize: typography.sizes.base,
    marginBottom: spacing['2xl'],
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
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.xs,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 46,
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

  // 비밀번호 일치 표시
  matchSuccess: {
    color: colors.success,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    marginTop: spacing.xs,
    paddingLeft: spacing.xs,
  },
  matchError: {
    color: colors.error,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    marginTop: spacing.xs,
    paddingLeft: spacing.xs,
  },

  // 회원가입 버튼
  signupButton: {
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' as any,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  signupButtonHovered: {
    opacity: 0.9,
    transform: [{ translateY: -1 }],
  },
  signupButtonText: {
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
