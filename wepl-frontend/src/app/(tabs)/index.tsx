import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Animated as RNAnimated,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/stores/auth.store';
import { useTrips, useCreateTrip, useJoinTrip, useDeleteTrip } from '@/hooks/useTrips';
import { useMySchedulesByDate } from '@/hooks/useSchedules';
import { useResponsive } from '@/hooks/useResponsive';
import Calendar from '@/components/web/Calendar';

// 여행 테마 → 그라데이션 색상 매핑
const THEME_GRADIENTS: Record<string, [string, string]> = {
  CULTURE: ['#667eea', '#764ba2'],
  FOOD: ['#f093fb', '#f5576c'],
  NATURE: ['#4facfe', '#00f2fe'],
  ADVENTURE: ['#fa709a', '#fee140'],
  RELAXATION: ['#a18cd1', '#fbc2eb'],
  SHOPPING: ['#ffecd2', '#fcb69f'],
  DEFAULT: ['#667eea', '#764ba2'],
};

const THEME_LABELS: Record<string, string> = {
  CULTURE: '🏛️ 문화',
  FOOD: '🍽️ 맛집',
  NATURE: '🌿 자연',
  ADVENTURE: '🎯 모험',
  RELAXATION: '🧘 힐링',
  SHOPPING: '🛍️ 쇼핑',
};

const THEME_OPTIONS = Object.entries(THEME_LABELS);

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/** 홈 화면 — 내 여행 방 목록 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { isDesktop, isWeb, contentMaxWidth, gridColumns } = useResponsive();

  const user = useAuthStore((s) => s.user);
  const { data: trips, isLoading, refetch, isRefetching } = useTrips();
  const createTripMutation = useCreateTrip();
  const joinTripMutation = useJoinTrip();
  const deleteTripMutation = useDeleteTrip();

  // 모달 상태
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showFABMenu, setShowFABMenu] = useState(false);

  // 캘린더 상태
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const selectedDateStr = selectedDate ? new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0] : undefined;
  const { data: daySchedules, isLoading: isLoadingSchedules } = useMySchedulesByDate(selectedDateStr);

  // 생성 폼
  const [newTitle, setNewTitle] = useState('');
  const [newTheme, setNewTheme] = useState('CULTURE');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [createError, setCreateError] = useState('');

  // 참가 폼
  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState('');

  // FAB 애니메이션
  const fabRotation = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.timing(fabRotation, {
      toValue: showFABMenu ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showFABMenu]);

  const fabRotateInterpolate = fabRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const handleCreateTrip = async () => {
    setCreateError('');
    if (!newTitle.trim()) {
      setCreateError('여행 이름을 입력해주세요.');
      return;
    }
    try {
      await createTripMutation.mutateAsync({
        title: newTitle.trim(),
        theme: newTheme,
        startDate: newStartDate || undefined,
        endDate: newEndDate || undefined,
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewTheme('CULTURE');
      setNewStartDate('');
      setNewEndDate('');
      refetch();
    } catch (e: any) {
      setCreateError(e?.message || '여행 생성에 실패했습니다.');
    }
  };

  const handleJoinTrip = async () => {
    setJoinError('');
    if (!inviteCode.trim()) {
      setJoinError('초대 코드를 입력해주세요.');
      return;
    }
    try {
      await joinTripMutation.mutateAsync({ inviteCode: inviteCode.trim() });
      setShowJoinModal(false);
      setInviteCode('');
      refetch();
    } catch (e: any) {
      setJoinError(e?.message || '참가에 실패했습니다.');
    }
  };

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const dynamicStyles = {
    background: isDark ? '#0a0a0f' : '#f5f5fa',
    cardBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
    cardBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    textPrimary: isDark ? '#ffffff' : '#1a1a2e',
    textSecondary: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
    modalBg: isDark ? '#1a1a2e' : '#ffffff',
    overlayBg: 'rgba(0,0,0,0.6)',
    inputBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    inputBorder: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
    inputText: isDark ? '#ffffff' : '#1a1a2e',
    placeholderText: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)',
  };

  // 여행 삭제 핸들러
  const handleDeleteTrip = (tripId: string, title: string) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`"${title}" 여행을 삭제하시겠습니까?`)) {
        deleteTripMutation.mutateAsync(tripId).then(() => refetch()).catch(() => {});
      }
    } else {
      Alert.alert(
        '여행 삭제',
        `"${title}" 여행을 삭제하시겠습니까?\n모든 데이터가 함께 삭제됩니다.`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteTripMutation.mutateAsync(tripId);
                refetch();
              } catch {}
            },
          },
        ],
      );
    }
  };

  // 여행 카드 렌더링
  const renderTripCard = ({ item }: { item: any }) => {
    const gradient = THEME_GRADIENTS[item.theme] || THEME_GRADIENTS.DEFAULT;
    const themeLabel = THEME_LABELS[item.theme] || item.theme;
    const startDate = formatDate(item.startDate);
    const endDate = formatDate(item.endDate);
    const dateRange = startDate && endDate ? `${startDate} - ${endDate}` : '날짜 미정';
    const memberCount = item._count?.members ?? item.memberCount ?? 0;

    return (
      <Pressable
        onPress={() => router.push(`/trip/${item.id}/timeline`)}
        onLongPress={() => handleDeleteTrip(item.id, item.title)}
        style={({ pressed }) => [
          styles.tripCard,
          {
            backgroundColor: dynamicStyles.cardBg,
            borderColor: dynamicStyles.cardBorder,
          },
          pressed && styles.tripCardPressed,
          isDesktop && styles.desktopTripCard,
          isWeb && ({ cursor: 'pointer' } as any),
        ]}
      >
        {/* 카드 상단 그라데이션 바 */}
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cardGradientBar}
        />

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text
              style={[styles.tripTitle, { color: dynamicStyles.textPrimary }]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <View style={[styles.themeBadge, { backgroundColor: gradient[0] + '20' }]}>
              <Text style={[styles.themeBadgeText, { color: gradient[0] }]}>
                {themeLabel}
              </Text>
            </View>
          </View>

          <View style={styles.cardMeta}>
            <Text style={[styles.cardMetaText, { color: dynamicStyles.textSecondary }]}>
              📅 {dateRange}
            </Text>
            <Text style={[styles.cardMetaText, { color: dynamicStyles.textSecondary }]}>
              👥 {memberCount}명
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  // 헤더 컨텐츠 (캘린더 + 일정)
  const renderHeaderContent = () => (
    <View style={styles.calendarSection}>
      <Text style={[styles.sectionTitle, { color: dynamicStyles.textPrimary }]}>
        📅 캘린더 개요
      </Text>
      <View style={{ marginBottom: 16 }}>
        <Calendar
          trips={trips ?? []}
          selectedDate={selectedDate}
          onDateClick={setSelectedDate}
        />
      </View>
      
      {selectedDate && (
        <View style={[styles.schedulePanel, { backgroundColor: dynamicStyles.cardBg, borderColor: dynamicStyles.cardBorder }]}>
          <Text style={[styles.scheduleTitle, { color: dynamicStyles.textPrimary }]}>
            {selectedDate.toLocaleDateString('ko-KR')} 일정
          </Text>
          {isLoadingSchedules ? (
            <ActivityIndicator size="small" color="#667eea" style={{ marginTop: 10 }} />
          ) : !daySchedules || daySchedules.length === 0 ? (
            <Text style={[styles.emptySchedule, { color: dynamicStyles.textSecondary }]}>
              선택한 날짜에 일정이 없습니다.
            </Text>
          ) : (
            <View style={styles.scheduleList}>
              {daySchedules.map((schedule: any) => (
                <Pressable
                  key={schedule.id}
                  onPress={() => router.push(`/trip/${schedule.tripId}/timeline`)}
                  style={[styles.scheduleCard, { backgroundColor: dynamicStyles.inputBg }]}
                >
                  <Text style={[styles.scheduleTime, { color: '#667eea' }]}>
                    {schedule.startTime || '시간 미정'} {schedule.endTime ? `- ${schedule.endTime}` : ''}
                  </Text>
                  <Text style={[styles.scheduleTitleText, { color: dynamicStyles.textPrimary }]}>
                    {schedule.wishlistPlace?.name ?? schedule.customTitle ?? '제목 없음'}
                  </Text>
                  <Text style={[styles.scheduleTripText, { color: dynamicStyles.textSecondary }]}>
                    {schedule.trip.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: dynamicStyles.textPrimary, marginTop: 24 }]}>
        📋 내 여행 목록
      </Text>
    </View>
  );

  // 빈 상태
  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>✈️</Text>
        <Text style={[styles.emptyTitle, { color: dynamicStyles.textPrimary }]}>
          첫 여행을 만들어보세요!
        </Text>
        <Text style={[styles.emptySubtitle, { color: dynamicStyles.textSecondary }]}>
          친구들과 함께 완벽한 여행 계획을 세워보세요
        </Text>
        <Pressable
          onPress={() => setShowCreateModal(true)}
          style={({ pressed }) => [styles.emptyButton, pressed && { opacity: 0.8 }]}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.emptyButtonGradient}
          >
            <Text style={styles.emptyButtonText}>+ 새 여행 만들기</Text>
          </LinearGradient>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: dynamicStyles.background }, isDesktop && styles.desktopPageContainer]}>
      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }, isDesktop && { maxWidth: contentMaxWidth, width: '100%' as any, alignSelf: 'center' as const }]}>
        <View>
          <Text style={[styles.greeting, { color: dynamicStyles.textSecondary }]}>
            안녕하세요, {user?.nickname ?? '여행자'}님 👋
          </Text>
          <Text style={[styles.headerTitle, { color: dynamicStyles.textPrimary }]}>
            내 여행
          </Text>
        </View>
      </View>

      {/* 여행 목록 */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      ) : (
        <FlatList
          data={trips ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderTripCard}
          key={isDesktop ? `grid-${gridColumns}` : 'list'}
          numColumns={isDesktop ? gridColumns : 1}
          columnWrapperStyle={isDesktop && gridColumns > 1 ? styles.desktopGridRow : undefined}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 100 + insets.bottom },
            isDesktop && { maxWidth: contentMaxWidth, width: '100%' as any, alignSelf: 'center' as const },
          ]}
          ListHeaderComponent={renderHeaderContent}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor="#667eea"
              colors={['#667eea']}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB + 메뉴 */}
      {showFABMenu && (
        <Pressable
          style={styles.fabOverlay}
          onPress={() => setShowFABMenu(false)}
        >
          <View style={[styles.fabMenu, { bottom: 90 + insets.bottom, right: 20 }]}>
            <Pressable
              onPress={() => {
                setShowFABMenu(false);
                setShowCreateModal(true);
              }}
              style={({ pressed }) => [
                styles.fabMenuItem,
                { backgroundColor: dynamicStyles.modalBg },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={styles.fabMenuIcon}>🌍</Text>
              <Text style={[styles.fabMenuText, { color: dynamicStyles.textPrimary }]}>
                새 여행 만들기
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setShowFABMenu(false);
                setShowJoinModal(true);
              }}
              style={({ pressed }) => [
                styles.fabMenuItem,
                { backgroundColor: dynamicStyles.modalBg },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={styles.fabMenuIcon}>🔗</Text>
              <Text style={[styles.fabMenuText, { color: dynamicStyles.textPrimary }]}>
                초대 코드 입력
              </Text>
            </Pressable>
          </View>
        </Pressable>
      )}

      <Pressable
        onPress={() => setShowFABMenu(!showFABMenu)}
        style={[styles.fab, { bottom: 24 + insets.bottom }, isWeb && ({ cursor: 'pointer' } as any)]}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.fabGradient}
        >
          <RNAnimated.Text
            style={[styles.fabIcon, { transform: [{ rotate: fabRotateInterpolate }] }]}
          >
            ＋
          </RNAnimated.Text>
        </LinearGradient>
      </Pressable>

      {/* 여행 생성 모달 */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: dynamicStyles.overlayBg }, isDesktop && styles.desktopModalOverlay]}
          onPress={() => setShowCreateModal(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: dynamicStyles.modalBg }, isDesktop && styles.desktopModalContent]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: dynamicStyles.textPrimary }]}>
              🌍 새 여행 만들기
            </Text>

            {createError ? (
              <View style={styles.modalError}>
                <Text style={styles.modalErrorText}>⚠️ {createError}</Text>
              </View>
            ) : null}

            <Text style={[styles.modalLabel, { color: dynamicStyles.textSecondary }]}>
              여행 이름
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: dynamicStyles.inputBg,
                  borderColor: dynamicStyles.inputBorder,
                  color: dynamicStyles.inputText,
                },
              ]}
              placeholder="예: 도쿄 여행 🗼"
              placeholderTextColor={dynamicStyles.placeholderText}
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={[styles.modalLabel, { color: dynamicStyles.textSecondary }]}>
              여행 테마
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.themeSelector}
            >
              {THEME_OPTIONS.map(([key, label]) => (
                <Pressable
                  key={key}
                  onPress={() => setNewTheme(key)}
                  style={[
                    styles.themeChip,
                    {
                      backgroundColor:
                        newTheme === key
                          ? (THEME_GRADIENTS[key]?.[0] ?? '#667eea') + '20'
                          : dynamicStyles.inputBg,
                      borderColor:
                        newTheme === key
                          ? THEME_GRADIENTS[key]?.[0] ?? '#667eea'
                          : dynamicStyles.inputBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.themeChipText,
                      {
                        color:
                          newTheme === key
                            ? THEME_GRADIENTS[key]?.[0] ?? '#667eea'
                            : dynamicStyles.textSecondary,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* 여행 일정 */}
            <Text style={[styles.modalLabel, { color: dynamicStyles.textSecondary }]}>
              여행 일정
            </Text>
            <View style={styles.dateRow}>
              <View style={styles.dateInputWrap}>
                <Text style={[styles.dateSmallLabel, { color: dynamicStyles.textSecondary }]}>시작일</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    styles.dateInput,
                    {
                      backgroundColor: dynamicStyles.inputBg,
                      borderColor: newStartDate ? '#667eea' : dynamicStyles.inputBorder,
                      color: dynamicStyles.inputText,
                    },
                  ]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={dynamicStyles.placeholderText}
                  value={newStartDate}
                  onChangeText={setNewStartDate}
                  maxLength={10}
                />
              </View>
              <Text style={[styles.dateSep, { color: dynamicStyles.textSecondary }]}>~</Text>
              <View style={styles.dateInputWrap}>
                <Text style={[styles.dateSmallLabel, { color: dynamicStyles.textSecondary }]}>종료일</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    styles.dateInput,
                    {
                      backgroundColor: dynamicStyles.inputBg,
                      borderColor: newEndDate ? '#667eea' : dynamicStyles.inputBorder,
                      color: dynamicStyles.inputText,
                    },
                  ]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={dynamicStyles.placeholderText}
                  value={newEndDate}
                  onChangeText={setNewEndDate}
                  maxLength={10}
                />
              </View>
            </View>

            <Pressable
              onPress={handleCreateTrip}
              disabled={createTripMutation.isPending}
              style={({ pressed }) => [
                styles.modalButton,
                pressed && { opacity: 0.85 },
                createTripMutation.isPending && { opacity: 0.6 },
              ]}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modalButtonGradient}
              >
                {createTripMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalButtonText}>만들기</Text>
                )}
              </LinearGradient>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 초대 코드 모달 */}
      <Modal
        visible={showJoinModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: dynamicStyles.overlayBg }, isDesktop && styles.desktopModalOverlay]}
          onPress={() => setShowJoinModal(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: dynamicStyles.modalBg }, isDesktop && styles.desktopModalContent]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: dynamicStyles.textPrimary }]}>
              🔗 초대 코드 입력
            </Text>

            {joinError ? (
              <View style={styles.modalError}>
                <Text style={styles.modalErrorText}>⚠️ {joinError}</Text>
              </View>
            ) : null}

            <Text style={[styles.modalLabel, { color: dynamicStyles.textSecondary }]}>
              초대 코드
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: dynamicStyles.inputBg,
                  borderColor: dynamicStyles.inputBorder,
                  color: dynamicStyles.inputText,
                },
              ]}
              placeholder="초대 코드를 입력하세요"
              placeholderTextColor={dynamicStyles.placeholderText}
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
            />

            <Pressable
              onPress={handleJoinTrip}
              disabled={joinTripMutation.isPending}
              style={({ pressed }) => [
                styles.modalButton,
                pressed && { opacity: 0.85 },
                joinTripMutation.isPending && { opacity: 0.6 },
              ]}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modalButtonGradient}
              >
                {joinTripMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalButtonText}>참가하기</Text>
                )}
              </LinearGradient>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  calendarSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  schedulePanel: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptySchedule: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12,
  },
  scheduleList: {
    gap: 8,
  },
  scheduleCard: {
    padding: 12,
    borderRadius: 8,
  },
  scheduleTime: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  scheduleTitleText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  scheduleTripText: {
    fontSize: 12,
  },
  tripCard: {
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tripCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  cardGradientBar: {
    height: 4,
  },
  cardContent: {
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  themeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  themeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  cardMetaText: {
    fontSize: 13,
    fontWeight: '500',
  },
  // 빈 상태
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  emptyButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  fabGradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabIcon: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
  fabOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  fabMenu: {
    position: 'absolute',
    gap: 8,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  fabMenuIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  fabMenuText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // 모달 공통
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.3)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  modalInput: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
    marginBottom: 16,
  },
  modalError: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  modalErrorText: {
    color: '#ef4444',
    fontSize: 13,
    textAlign: 'center',
  },
  themeSelector: {
    marginBottom: 20,
  },
  themeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  themeChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
  },
  modalButtonGradient: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // 데스크톱 반응형 스타일
  desktopPageContainer: {
    alignItems: 'center' as const,
  },
  desktopGridRow: {
    gap: 14,
  },
  desktopTripCard: {
    flex: 1,
  },
  desktopModalOverlay: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  desktopModalContent: {
    borderRadius: 20,
    maxWidth: 480,
    width: '90%' as any,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 16,
  },
  dateInputWrap: {
    flex: 1,
  },
  dateSmallLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    marginLeft: 4,
  },
  dateInput: {
    marginBottom: 0,
    textAlign: 'center' as const,
  },
  dateSep: {
    fontSize: 16,
    fontWeight: '600',
    paddingBottom: 14,
  },
});
