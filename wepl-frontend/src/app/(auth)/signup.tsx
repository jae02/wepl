import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Animated as RNAnimated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSignup } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/auth.store';
import { useResponsive } from '@/hooks/useResponsive';

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const signupMutation = useSignup();
  const authLogin = useAuthStore((s) => s.login);
  const { isDesktop, isWeb } = useResponsive();

  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // 헤더 애니메이션
  const headerOpacity = useRef(new RNAnimated.Value(0)).current;
  const headerTranslateY = useRef(new RNAnimated.Value(-15)).current;

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(headerOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      RNAnimated.timing(headerTranslateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validate = (): boolean => {
    if (!nickname.trim()) {
      setError('닉네임을 입력해주세요.');
      return false;
    }
    if (nickname.trim().length < 2) {
      setError('닉네임은 2자 이상이어야 합니다.');
      return false;
    }
    if (!email.trim()) {
      setError('이메일을 입력해주세요.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('올바른 이메일 형식을 입력해주세요.');
      return false;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return false;
    }
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    setError('');
    if (!validate()) return;

    try {
      const result = await signupMutation.mutateAsync({
        nickname: nickname.trim(),
        email: email.trim(),
        password,
      });
      authLogin(result.accessToken, result.user);
    } catch (e: any) {
      setError(e?.message || '회원가입에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const renderInput = (
    label: string,
    icon: string,
    value: string,
    onChangeText: (t: string) => void,
    options?: {
      secure?: boolean;
      keyboardType?: TextInput['props']['keyboardType'];
      returnKeyType?: TextInput['props']['returnKeyType'];
      autoCapitalize?: TextInput['props']['autoCapitalize'];
      placeholder?: string;
      onSubmitEditing?: () => void;
    },
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <Text style={styles.inputIcon}>{icon}</Text>
        <TextInput
          style={[styles.input, options?.secure && styles.passwordInput]}
          placeholder={options?.placeholder || `${label}을(를) 입력하세요`}
          placeholderTextColor="rgba(255,255,255,0.35)"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={options?.secure && !showPassword}
          keyboardType={options?.keyboardType}
          autoCapitalize={options?.autoCapitalize ?? 'none'}
          autoCorrect={false}
          returnKeyType={options?.returnKeyType || 'next'}
          onSubmitEditing={options?.onSubmitEditing}
        />
        {options?.secure && (
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            style={styles.visibilityToggle}
            hitSlop={8}
          >
            <Text style={styles.visibilityIcon}>
              {showPassword ? '🙈' : '👁️'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f0c29', '#302b63', '#24243e']}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'web' ? undefined : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
            isDesktop && styles.scrollContentDesktop,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 헤더 */}
          <RNAnimated.View
            style={[
              styles.header,
              { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] },
            ]}
          >
            <Text style={styles.headerTitle}>회원가입</Text>
            <Text style={styles.headerSubtitle}>WEPL과 함께 여행을 시작하세요</Text>
          </RNAnimated.View>

          <View style={isDesktop ? styles.desktopFormCard : undefined}>
          {/* 에러 메시지 */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* 입력 필드들 */}
          {renderInput('닉네임', '😊', nickname, setNickname, {
            autoCapitalize: 'words',
            placeholder: '닉네임을 입력하세요',
          })}
          {renderInput('이메일', '📧', email, setEmail, {
            keyboardType: 'email-address',
            placeholder: '이메일을 입력하세요',
          })}
          {renderInput('비밀번호', '🔒', password, setPassword, {
            secure: true,
            placeholder: '6자 이상 입력하세요',
          })}
          {renderInput('비밀번호 확인', '🔑', passwordConfirm, setPasswordConfirm, {
            secure: true,
            returnKeyType: 'done',
            placeholder: '비밀번호를 다시 입력하세요',
            onSubmitEditing: handleSignup,
          })}

          {/* 회원가입 버튼 */}
          <Pressable
            onPress={handleSignup}
            disabled={signupMutation.isPending}
            style={({ pressed }) => [
              styles.signupButton,
              pressed && styles.signupButtonPressed,
              signupMutation.isPending && styles.signupButtonDisabled,
              isWeb && ({ cursor: 'pointer' } as any),
            ]}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.signupButtonGradient}
            >
              {signupMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.signupButtonText}>회원가입</Text>
              )}
            </LinearGradient>
          </Pressable>

          {/* 로그인 링크 */}
          <Pressable
            onPress={() => router.back()}
            style={[styles.loginLink, isWeb && ({ cursor: 'pointer' } as any)]}
          >
            <Text style={styles.loginLinkText}>
              이미 계정이 있으신가요?{' '}
              <Text style={styles.loginLinkHighlight}>로그인</Text>
            </Text>
          </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0c29',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    height: 54,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    height: '100%',
  },
  passwordInput: {
    paddingRight: 40,
  },
  visibilityToggle: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  visibilityIcon: {
    fontSize: 18,
  },
  signupButton: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  signupButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  signupButtonDisabled: {
    opacity: 0.6,
  },
  signupButtonGradient: {
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  loginLink: {
    marginTop: 24,
    alignItems: 'center',
    padding: 8,
  },
  loginLinkText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  loginLinkHighlight: {
    color: '#a78bfa',
    fontWeight: '600',
  },
  // 데스크톱 반응형 스타일
  scrollContentDesktop: {
    alignItems: 'center' as const,
  },
  desktopFormCard: {
    width: '100%' as any,
    maxWidth: 440,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  } as any,
});
