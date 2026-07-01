import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/stores/auth.store';

/** 프로필 화면 */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const initial = user?.nickname?.charAt(0)?.toUpperCase() ?? '?';

  const ds = {
    bg: isDark ? '#0a0a0f' : '#f5f5fa',
    cardBg: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
    cardBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    textPrimary: isDark ? '#ffffff' : '#1a1a2e',
    textSecondary: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
  };

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: () => logout(),
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: ds.bg }]}>
      <View style={[styles.content, { paddingTop: insets.top + 20 }]}>
        {/* 프로필 아바타 */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={[styles.nickname, { color: ds.textPrimary }]}>
            {user?.nickname ?? '여행자'}
          </Text>
          <Text style={[styles.email, { color: ds.textSecondary }]}>
            {user?.email ?? ''}
          </Text>
        </View>

        {/* 정보 카드 */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: ds.cardBg, borderColor: ds.cardBorder },
          ]}
        >
          <Text style={[styles.infoCardTitle, { color: ds.textSecondary }]}>
            앱 정보
          </Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: ds.textSecondary }]}>앱 이름</Text>
            <Text style={[styles.infoValue, { color: ds.textPrimary }]}>WEPL</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: ds.textSecondary }]}>버전</Text>
            <Text style={[styles.infoValue, { color: ds.textPrimary }]}>1.0.0</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: ds.textSecondary }]}>설명</Text>
            <Text style={[styles.infoValue, { color: ds.textPrimary }]}>
              함께 만드는 완벽한 여행
            </Text>
          </View>
        </View>

        {/* 로그아웃 버튼 */}
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            { borderColor: 'rgba(239, 68, 68, 0.3)' },
            pressed && styles.logoutButtonPressed,
          ]}
        >
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 36,
    paddingTop: 20,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
  },
  nickname: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
  },
  infoCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoDivider: {
    height: 1,
    backgroundColor: 'rgba(128,128,128,0.1)',
  },
  logoutButton: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  logoutButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '700',
  },
});
