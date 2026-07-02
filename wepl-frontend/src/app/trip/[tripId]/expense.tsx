import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  useExpenses,
  useExpenseSummary,
  useExpenseStats,
  useAddExpense,
} from '@/hooks/useExpenses';
import { useResponsive } from '@/hooks/useResponsive';

const EXPENSE_CATEGORIES = [
  { key: 'FOOD', label: '식비', icon: '🍽️', color: '#f5576c' },
  { key: 'TRANSPORT', label: '교통', icon: '🚗', color: '#4facfe' },
  { key: 'ACCOMMODATION', label: '숙소', icon: '🏨', color: '#a18cd1' },
  { key: 'SHOPPING', label: '쇼핑', icon: '🛍️', color: '#fa709a' },
  { key: 'ACTIVITY', label: '액티비티', icon: '🎯', color: '#f093fb' },
  { key: 'ETC', label: '기타', icon: '📦', color: '#6b7280' },
];

const SPLIT_OPTIONS = [
  { key: 'EQUAL', label: '균등 분배' },
  { key: 'CUSTOM', label: '직접 입력' },
  { key: 'FULL', label: '전액 부담' },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

/** 가계부 화면 */
export default function ExpenseScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { isDesktop, isWeb, contentMaxWidth } = useResponsive();

  const { data: expenses, isLoading, refetch, isRefetching } = useExpenses(tripId);
  const { data: summary } = useExpenseSummary(tripId);
  const { data: stats } = useExpenseStats(tripId);
  const addMutation = useAddExpense(tripId);

  const [showAddModal, setShowAddModal] = useState(false);

  // 추가 폼 상태
  const [newDescription, setNewDescription] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('FOOD');
  const [newSplitType, setNewSplitType] = useState('EQUAL');
  const [addError, setAddError] = useState('');

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const ds = {
    bg: isDark ? '#0a0a0f' : '#f5f5fa',
    cardBg: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
    cardBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    textPrimary: isDark ? '#ffffff' : '#1a1a2e',
    textSecondary: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
    modalBg: isDark ? '#1a1a2e' : '#ffffff',
    inputBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    inputBorder: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
    inputText: isDark ? '#ffffff' : '#1a1a2e',
    placeholder: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)',
  };

  const handleAdd = async () => {
    setAddError('');
    if (!newDescription.trim()) {
      setAddError('내용을 입력해주세요.');
      return;
    }
    const amount = parseInt(newAmount, 10);
    if (!amount || amount <= 0) {
      setAddError('올바른 금액을 입력해주세요.');
      return;
    }
    try {
      await addMutation.mutateAsync({
        description: newDescription.trim(),
        amount,
        category: newCategory,
        splitType: newSplitType,
      });
      setShowAddModal(false);
      resetForm();
      refetch();
    } catch (e: any) {
      setAddError(e?.message || '추가에 실패했습니다.');
    }
  };

  const resetForm = () => {
    setNewDescription('');
    setNewAmount('');
    setNewCategory('FOOD');
    setNewSplitType('EQUAL');
    setAddError('');
  };

  // 카테고리별 통계 최대값 (바 차트용)
  const maxStatAmount = (stats ?? []).reduce(
    (max: number, s: any) => Math.max(max, s.total ?? 0),
    1,
  );

  // 전체 금액 합계
  const totalAmount = (expenses ?? []).reduce(
    (sum: number, e: any) => sum + (e.amount ?? 0),
    0,
  );

  const renderHeader = () => (
    <View>
      {/* 정산 요약 + 카테고리 통계 */}
      <View style={isDesktop ? styles.desktopStatsRow : undefined}>
      {/* 정산 요약 */}
      {summary && summary.length > 0 && (
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: ds.cardBg, borderColor: ds.cardBorder },
            isDesktop && styles.desktopStatsCard,
          ]}
        >
          <Text style={[styles.summaryTitle, { color: ds.textPrimary }]}>
            💸 정산 요약
          </Text>
          {summary.map((item: any, idx: number) => (
            <View key={idx} style={styles.settlementRow}>
              <View style={styles.settlementPerson}>
                <View style={[styles.personAvatar, { backgroundColor: '#f5576c' }]}>
                  <Text style={styles.personAvatarText}>
                    {(item.from?.nickname ?? '?').charAt(0)}
                  </Text>
                </View>
                <Text style={[styles.personName, { color: ds.textPrimary }]}>
                  {item.from?.nickname ?? '???'}
                </Text>
              </View>

              <View style={styles.settlementArrow}>
                <Text style={styles.arrowText}>→</Text>
                <Text style={[styles.settlementAmount, { color: '#667eea' }]}>
                  {formatCurrency(item.amount ?? 0)}
                </Text>
              </View>

              <View style={styles.settlementPerson}>
                <View style={[styles.personAvatar, { backgroundColor: '#10b981' }]}>
                  <Text style={styles.personAvatarText}>
                    {(item.to?.nickname ?? '?').charAt(0)}
                  </Text>
                </View>
                <Text style={[styles.personName, { color: ds.textPrimary }]}>
                  {item.to?.nickname ?? '???'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 카테고리 통계 */}
      {stats && stats.length > 0 && (
        <View
          style={[
            styles.statsCard,
            { backgroundColor: ds.cardBg, borderColor: ds.cardBorder },
            isDesktop && styles.desktopStatsCard,
          ]}
        >
          <Text style={[styles.statsTitle, { color: ds.textPrimary }]}>
            📊 카테고리별 지출
          </Text>
          {stats.map((stat: any) => {
            const catInfo = EXPENSE_CATEGORIES.find((c) => c.key === stat.category);
            const barWidth = ((stat.total ?? 0) / maxStatAmount) * 100;
            return (
              <View key={stat.category} style={styles.statRow}>
                <View style={styles.statLabelRow}>
                  <Text style={[styles.statLabel, { color: ds.textSecondary }]}>
                    {catInfo?.icon ?? '📦'} {catInfo?.label ?? stat.category}
                  </Text>
                  <Text style={[styles.statAmount, { color: ds.textPrimary }]}>
                    {formatCurrency(stat.total ?? 0)}
                  </Text>
                </View>
                <View style={styles.statBarBg}>
                  <View
                    style={[
                      styles.statBarFill,
                      {
                        width: `${Math.max(barWidth, 2)}%`,
                        backgroundColor: catInfo?.color ?? '#667eea',
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
      </View>

      {/* 총 지출 */}
      {totalAmount > 0 && (
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: ds.textSecondary }]}>
            총 지출
          </Text>
          <Text style={[styles.totalAmount, { color: ds.textPrimary }]}>
            {formatCurrency(totalAmount)}
          </Text>
        </View>
      )}

      {/* 지출 목록 헤더 */}
      <Text style={[styles.sectionTitle, { color: ds.textPrimary }]}>
        📝 지출 내역
      </Text>
    </View>
  );

  const renderExpenseItem = ({ item }: { item: any }) => {
    const catInfo = EXPENSE_CATEGORIES.find((c) => c.key === item.category);
    return (
      <View
        style={[
          styles.expenseCard,
          { backgroundColor: ds.cardBg, borderColor: ds.cardBorder },
        ]}
      >
        <View style={styles.expenseRow}>
          <View
            style={[
              styles.expenseCategoryIcon,
              { backgroundColor: (catInfo?.color ?? '#667eea') + '18' },
            ]}
          >
            <Text style={styles.expenseCategoryIconText}>
              {catInfo?.icon ?? '📦'}
            </Text>
          </View>

          <View style={styles.expenseInfo}>
            <Text
              style={[styles.expenseDescription, { color: ds.textPrimary }]}
              numberOfLines={1}
            >
              {item.description}
            </Text>
            <View style={styles.expenseMetaRow}>
              {item.paidBy?.nickname && (
                <Text style={[styles.expensePaidBy, { color: ds.textSecondary }]}>
                  💳 {item.paidBy.nickname}
                </Text>
              )}
              <Text style={[styles.expenseCategory, { color: ds.textSecondary }]}>
                {catInfo?.label ?? item.category}
              </Text>
            </View>
          </View>

          <Text style={[styles.expenseAmount, { color: ds.textPrimary }]}>
            {formatCurrency(item.amount ?? 0)}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>💰</Text>
        <Text style={[styles.emptyTitle, { color: ds.textPrimary }]}>
          아직 지출 내역이 없어요
        </Text>
        <Text style={[styles.emptySubtitle, { color: ds.textSecondary }]}>
          여행 경비를 기록해보세요
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: ds.bg }, isDesktop && styles.desktopPageContainer]}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      ) : (
        <FlatList
          data={expenses ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderExpenseItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 100 + insets.bottom },
            isDesktop && { maxWidth: contentMaxWidth, width: '100%' as any, alignSelf: 'center' as const },
          ]}
          ListHeaderComponent={renderHeader}
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

      {/* FAB 추가 버튼 */}
      <Pressable
        onPress={() => {
          resetForm();
          setShowAddModal(true);
        }}
        style={[styles.fab, { bottom: 24 + insets.bottom }, isWeb && ({ cursor: 'pointer' } as any)]}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.fabGradient}
        >
          <Text style={styles.fabIcon}>＋</Text>
        </LinearGradient>
      </Pressable>

      {/* 지출 추가 모달 */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <Pressable
          style={[styles.modalOverlay, isDesktop && styles.desktopModalOverlay]}
          onPress={() => setShowAddModal(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: ds.modalBg }, isDesktop && styles.desktopModalContent]}
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHandle} />
              <Text style={[styles.modalTitle, { color: ds.textPrimary }]}>
                💰 지출 추가
              </Text>

              {addError ? (
                <View style={styles.modalError}>
                  <Text style={styles.modalErrorText}>⚠️ {addError}</Text>
                </View>
              ) : null}

              {/* 내용 */}
              <Text style={[styles.modalLabel, { color: ds.textSecondary }]}>
                내용 *
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: ds.inputBg,
                    borderColor: ds.inputBorder,
                    color: ds.inputText,
                  },
                ]}
                placeholder="예: 점심 식사"
                placeholderTextColor={ds.placeholder}
                value={newDescription}
                onChangeText={setNewDescription}
              />

              {/* 금액 */}
              <Text style={[styles.modalLabel, { color: ds.textSecondary }]}>
                금액 (원) *
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: ds.inputBg,
                    borderColor: ds.inputBorder,
                    color: ds.inputText,
                  },
                ]}
                placeholder="0"
                placeholderTextColor={ds.placeholder}
                value={newAmount}
                onChangeText={setNewAmount}
                keyboardType="numeric"
              />

              {/* 카테고리 */}
              <Text style={[styles.modalLabel, { color: ds.textSecondary }]}>
                카테고리
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryPicker}
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.key}
                    onPress={() => setNewCategory(cat.key)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor:
                          newCategory === cat.key
                            ? cat.color + '20'
                            : ds.inputBg,
                        borderColor:
                          newCategory === cat.key ? cat.color : ds.inputBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        {
                          color:
                            newCategory === cat.key ? cat.color : ds.textSecondary,
                        },
                      ]}
                    >
                      {cat.icon} {cat.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* 분배 방식 */}
              <Text style={[styles.modalLabel, { color: ds.textSecondary }]}>
                분배 방식
              </Text>
              <View style={styles.splitPicker}>
                {SPLIT_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.key}
                    onPress={() => setNewSplitType(opt.key)}
                    style={[
                      styles.splitChip,
                      {
                        backgroundColor:
                          newSplitType === opt.key ? '#667eea20' : ds.inputBg,
                        borderColor:
                          newSplitType === opt.key ? '#667eea' : ds.inputBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.splitChipText,
                        {
                          color:
                            newSplitType === opt.key ? '#667eea' : ds.textSecondary,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* 추가 버튼 */}
              <Pressable
                onPress={handleAdd}
                disabled={addMutation.isPending}
                style={({ pressed }) => [
                  styles.modalButton,
                  pressed && { opacity: 0.85 },
                  addMutation.isPending && { opacity: 0.6 },
                ]}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalButtonGradient}
                >
                  {addMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalButtonText}>추가하기</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  // 정산 요약
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  settlementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.08)',
  },
  settlementPerson: {
    alignItems: 'center',
    width: 60,
  },
  personAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  personAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  personName: {
    fontSize: 12,
    fontWeight: '600',
  },
  settlementArrow: {
    alignItems: 'center',
    flex: 1,
  },
  arrowText: {
    fontSize: 18,
    color: '#667eea',
    marginBottom: 2,
  },
  settlementAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  // 통계
  statsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  statRow: {
    marginBottom: 12,
  },
  statLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  statAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  statBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(128,128,128,0.12)',
    overflow: 'hidden',
  },
  statBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  // 총 지출
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '800',
  },
  // 섹션 제목
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  // 지출 카드
  expenseCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseCategoryIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  expenseCategoryIconText: {
    fontSize: 18,
  },
  expenseInfo: {
    flex: 1,
    marginRight: 8,
  },
  expenseDescription: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  expenseMetaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  expensePaidBy: {
    fontSize: 12,
    fontWeight: '500',
  },
  expenseCategory: {
    fontSize: 12,
    fontWeight: '500',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
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
  // 모달
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '85%',
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
  categoryPicker: {
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  splitPicker: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  splitChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  splitChipText: {
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
  desktopStatsRow: {
    flexDirection: 'row' as const,
    gap: 14,
  },
  desktopStatsCard: {
    flex: 1,
  },
  desktopModalOverlay: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  desktopModalContent: {
    borderRadius: 20,
    maxWidth: 520,
    width: '90%' as any,
  },
});
