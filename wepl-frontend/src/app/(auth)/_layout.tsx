import { Stack } from 'expo-router';

/** 인증 그룹 레이아웃 — 헤더 없는 스택 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    />
  );
}
