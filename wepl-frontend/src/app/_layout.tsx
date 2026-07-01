import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { Providers } from '@/components/Providers';
import { useAuthStore } from '@/stores/auth.store';

/** 인증 상태에 따라 자동 리디렉트하는 가드 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isRestoring = useAuthStore((s) => s.isRestoring);

  useEffect(() => {
    // 토큰 복원 중이면 대기
    if (isRestoring) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // 미인증 상태에서 보호된 경로 접근 → 로그인으로 이동
      router.replace('/login');
    } else if (isAuthenticated && inAuthGroup) {
      // 인증 상태에서 로그인/회원가입 화면 → 홈으로 이동
      router.replace('/');
    }
  }, [isAuthenticated, segments, isRestoring]);

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <Providers>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <AuthGuard>
        <Slot />
      </AuthGuard>
    </Providers>
  );
}
