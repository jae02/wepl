/**
 * 웹 전용 가계부 — 요약 카드 + 카테고리 차트 + 지출 테이블 + N빵 정산 현황
 */

import { useState, useMemo } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView,
  TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { colors, getThemeColors } from '@/theme';
import {
  useExpenses, useCreateExpense, useDeleteExpense,
  useExpenseStats, useExpenseSummary, useToggleSplitPaid,
} from '@/hooks/useExpenses';
import { useTripMembers } from '@/hooks/useTrips';
import { useAuthStore } from '@/stores/auth.store';

// ─── 카테고리 정의 ───────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  { key: 'FOOD', label: '🍽️ 식비', color: '#f5576c' },
  { key: 'TRANSPORT', label: '🚗 교통', color: '#4facfe' },
  { key: 'ACCOMMODATION', label: '🏨 숙소', color: '#667eea' },
  { key: 'ACTIVITY', label: '🎯 활동', color: '#fa709a' },
  { key: 'SHOPPING', label: '🛍️ 쇼핑', color: '#fcb69f' },
  { key: 'OTHER', label: '📌 기타', color: '#6b7280' },
];

const CATEGORY_COLOR: Record<string, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.key, c.color]),
);

// ─── 유틸 ────────────────────────────────────────────────────────────────────────

function formatAmount(amount: number, currency?: string): string {
  return `${currency ?? '₩'}${amount.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────────────────────────

export default function ExpenseWebScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const scheme = useColorScheme() ?? 'dark';
  const isDark = scheme === 'dark';
  const theme = getThemeColors(scheme);
  const user = useAuthStore((s) => s.user);

  // ── 데이터 훅 ──
  const { data: expenses, isLoading, refetch } = useExpenses(tripId ?? '');
  const { data: stats } = useExpenseStats(tripId ?? '');
  const { data: summary } = useExpenseSummary(tripId ?? '');
  const { data: members } = useTripMembers(tripId ?? '');
  const createMutation = useCreateExpense(tripId ?? '');
  const deleteMutation = useDeleteExpense(tripId ?? '');
  const togglePaidMutation = useToggleSplitPaid(tripId ?? '');

  // ── 모달 state ──
  const [showModal, setShowModal] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('KRW');
  const [category, setCategory] = useState('FOOD');
  const [splitType, setSplitType] = useState<'EQUAL' | 'CUSTOM'>('EQUAL');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [formError, setFormError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ── 통계 계산 ──
  const totalAmount = useMemo(
    () => (expenses ?? []).reduce((sum: number, e: any) => sum + (e.amount ?? 0), 0),
    [expenses],
  );
  const memberCount = (members as any[])?.length || 1;
  const perPerson = Math.round(totalAmount / memberCount);
  const categoryCount = new Set((expenses ?? []).map((e: any) => e.category)).size;

  // 카테고리별 합계
  const catTotals: Record<string, number> = {};
  (expenses ?? []).forEach((e: any) => {
    catTotals[e.category] = (catTotals[e.category] ?? 0) + (e.amount ?? 0);
  });
  const maxCatAmount = Math.max(...Object.values(catTotals), 1);

  // ── 정산 현황 데이터 ──
  const settlements = useMemo(() => {
    if (!Array.isArray(summary)) return [];
    return summary as Array<{
      from: { id: string; nickname: string };
      to: { id: string; nickname: string };
      amount: number;
      isPaid?: boolean;
      expenseId?: string;
      splitId?: string;
    }>;
  }, [summary]);

  // ── 멤버 선택 토글 ──
  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  };

  const selectAllMembers = () => {
    if (!members) return;
    const allIds = (members as any[]).map((m: any) => m.user?.id ?? m.userId);
    setSelectedMemberIds(allIds);
  };

  // ── 모달 열기/리셋 ──
  const openModal = () => {
    setDesc('');
    setAmount('');
    setCurrency('KRW');
    setCategory('FOOD');
    setSplitType('EQUAL');
    setFormError('');
    // 기본으로 전체 멤버 선택
    if (members) {
      const allIds = (members as any[]).map((m: any) => m.user?.id ?? m.userId);
      setSelectedMemberIds(allIds);
    } else {
      setSelectedMemberIds([]);
    }
    setShowModal(true);
  };

  // ── 지출 생성 ──
  const handleCreate = async () => {
    setFormError('');
    if (!desc.trim() || !amount.trim()) {
      setFormError('내용과 금액을 입력해주세요.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('올바른 금액을 입력해주세요.');
      return;
    }
    if (selectedMemberIds.length === 0) {
      setFormError('정산 대상 멤버를 선택해주세요.');
      return;
    }
    try {
      await createMutation.mutateAsync({
        description: desc.trim(),
        amount: numAmount,
        currency,
        category,
        splitType: splitType === 'EQUAL' ? 'EQUAL' : 'CUSTOM',
        splitUserIds: selectedMemberIds,
      });
      setShowModal(false);
      refetch();
    } catch (e: any) {
      setFormError(e?.message || '추가 실패');
    }
  };

  // ── 지출 삭제 ──
  const handleDelete = async (expenseId: string) => {
    try {
      await deleteMutation.mutateAsync(expenseId);
      setDeleteConfirmId(null);
    } catch {
      // silently fail — user can retry
    }
  };

  // ── 정산 완료 토글 ──
  const handleTogglePaid = (expenseId: string, splitId: string) => {
    togglePaidMutation.mutate({ expenseId, splitId });
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.inner}>
        {/* ── 헤더 ── */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>💰 가계부</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            여행 경비를 한눈에 관리하세요
          </Text>
        </View>

        {/* ── 요약 카드 ── */}
        <View style={styles.summaryRow}>
          {[
            {
              icon: '💰',
              label: '총 지출',
              value: formatAmount(totalAmount, currency === 'JPY' ? '¥' : '₩'),
              gradient: ['#667eea', '#764ba2'] as const,
            },
            {
              icon: '👥',
              label: '1인당',
              value: formatAmount(perPerson, currency === 'JPY' ? '¥' : '₩'),
              gradient: ['#f5576c', '#ff6f91'] as const,
            },
            {
              icon: '📊',
              label: '카테고리',
              value: `${categoryCount}개`,
              gradient: ['#4facfe', '#00f2fe'] as const,
            },
          ].map((card) => (
            <View
              key={card.label}
              style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <LinearGradient
                colors={card.gradient}
                style={styles.summaryIconBg}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.summaryIcon}>{card.icon}</Text>
              </LinearGradient>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                {card.label}
              </Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{card.value}</Text>
            </View>
          ))}
        </View>

        {/* ── 정산 현황 (N빵) ── */}
        {settlements.length > 0 && (
          <View style={[styles.settlementSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>💸 정산 현황</Text>
              <View style={[styles.settlementBadge, { backgroundColor: colors.primary[500] + '20' }]}>
                <Text style={[styles.settlementBadgeText, { color: colors.primary[500] }]}>
                  {settlements.filter((s) => s.isPaid).length}/{settlements.length} 완료
                </Text>
              </View>
            </View>
            <View style={styles.settlementGrid}>
              {settlements.map((item, idx) => {
                const isPaid = !!item.isPaid;
                return (
                  <View
                    key={`settlement-${idx}`}
                    style={[
                      styles.settlementCard,
                      {
                        backgroundColor: isPaid
                          ? (isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)')
                          : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
                        borderColor: isPaid ? colors.success + '40' : theme.border,
                      },
                    ]}
                  >
                    <View style={styles.settlementInfo}>
                      <View style={styles.settlementFlow}>
                        <View style={[styles.avatarSmall, { backgroundColor: '#f5576c' + '30' }]}>
                          <Text style={styles.avatarText}>
                            {item.from.nickname.charAt(0)}
                          </Text>
                        </View>
                        <Text style={[styles.settlementArrow, { color: theme.textTertiary }]}>→</Text>
                        <View style={[styles.avatarSmall, { backgroundColor: '#4facfe' + '30' }]}>
                          <Text style={styles.avatarText}>
                            {item.to.nickname.charAt(0)}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.settlementText,
                          { color: theme.text },
                          isPaid && styles.paidTextStrike,
                        ]}
                        numberOfLines={1}
                      >
                        {item.from.nickname} → {item.to.nickname}에게
                      </Text>
                      <Text
                        style={[
                          styles.settlementAmount,
                          { color: isPaid ? colors.success : colors.primary[500] },
                          isPaid && styles.paidTextStrike,
                        ]}
                      >
                        {formatAmount(item.amount)}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        if (item.expenseId && item.splitId) {
                          handleTogglePaid(item.expenseId, item.splitId);
                        }
                      }}
                      style={[
                        styles.paidToggle,
                        {
                          backgroundColor: isPaid ? colors.success : 'transparent',
                          borderColor: isPaid ? colors.success : theme.border,
                          cursor: 'pointer',
                        } as any,
                      ]}
                    >
                      <Text style={[styles.paidToggleText, { color: isPaid ? '#fff' : theme.textSecondary }]}>
                        {isPaid ? '✓ 완료' : '미정산'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── 카테고리 차트 ── */}
        {Object.keys(catTotals).length > 0 && (
          <View style={[styles.chartSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>📊 카테고리별 지출</Text>
            {Object.entries(catTotals)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, total]) => {
                const catInfo = EXPENSE_CATEGORIES.find((c) => c.key === cat);
                const barWidth = Math.max((total / maxCatAmount) * 100, 5);
                const percentage = totalAmount > 0 ? Math.round((total / totalAmount) * 100) : 0;
                return (
                  <View key={cat} style={styles.chartRow}>
                    <Text style={[styles.chartLabel, { color: theme.textSecondary }]}>
                      {catInfo?.label ?? cat}
                    </Text>
                    <View style={styles.chartBarBg}>
                      <LinearGradient
                        colors={[CATEGORY_COLOR[cat] ?? '#6b7280', (CATEGORY_COLOR[cat] ?? '#6b7280') + 'CC']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.chartBar, { width: `${barWidth}%` } as any]}
                      />
                    </View>
                    <Text style={[styles.chartPercent, { color: theme.textTertiary }]}>
                      {percentage}%
                    </Text>
                    <Text style={[styles.chartAmount, { color: theme.text }]}>
                      {formatAmount(total)}
                    </Text>
                  </View>
                );
              })}
          </View>
        )}

        {/* ── 지출 테이블 ── */}
        <View style={[styles.tableSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>📋 지출 내역</Text>

          {/* 테이블 헤더 */}
          <View style={[styles.tableHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.thDate, { color: theme.textSecondary }]}>날짜</Text>
            <Text style={[styles.thDesc, { color: theme.textSecondary }]}>내용</Text>
            <Text style={[styles.thCat, { color: theme.textSecondary }]}>카테고리</Text>
            <Text style={[styles.thAmount, { color: theme.textSecondary }]}>금액</Text>
            <Text style={[styles.thAction, { color: theme.textSecondary }]}> </Text>
          </View>

          {isLoading ? (
            <ActivityIndicator color={colors.primary[500]} style={{ marginVertical: 40 }} />
          ) : (expenses ?? []).length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🧾</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                등록된 지출이 없습니다
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
                아래 버튼으로 첫 번째 지출을 추가해보세요
              </Text>
            </View>
          ) : (
            (expenses ?? []).map((item: any, idx: number) => {
              const catInfo = EXPENSE_CATEGORIES.find((c) => c.key === item.category);
              const isOdd = idx % 2 === 1;
              const isDeleting = deleteConfirmId === item.id;
              return (
                <View key={item.id}>
                  <Pressable
                    style={({ hovered }: any) => [
                      styles.tableRow,
                      isOdd && {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                      },
                      hovered && {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      },
                      { cursor: 'pointer' } as any,
                    ]}
                  >
                    <Text style={[styles.tdDate, { color: theme.textSecondary }]}>
                      {formatDate(item.createdAt)}
                    </Text>
                    <Text style={[styles.tdDesc, { color: theme.text }]} numberOfLines={1}>
                      {item.description}
                    </Text>
                    <View style={styles.tdCat}>
                      <View
                        style={[
                          styles.catBadge,
                          { backgroundColor: (CATEGORY_COLOR[item.category] ?? '#6b7280') + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.catBadgeText,
                            { color: CATEGORY_COLOR[item.category] ?? '#6b7280' },
                          ]}
                        >
                          {catInfo?.label ?? item.category}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.tdAmount, { color: theme.text }]}>
                      {formatAmount(item.amount, item.currency === 'JPY' ? '¥' : '₩')}
                    </Text>
                    <View style={styles.tdAction}>
                      {isDeleting ? (
                        <View style={styles.deleteConfirmRow}>
                          <Pressable
                            onPress={() => handleDelete(item.id)}
                            style={[styles.confirmDeleteBtn, { cursor: 'pointer' } as any]}
                          >
                            <Text style={styles.confirmDeleteText}>삭제</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => setDeleteConfirmId(null)}
                            style={[styles.cancelDeleteBtn, { cursor: 'pointer' } as any]}
                          >
                            <Text style={[styles.cancelDeleteText, { color: theme.textSecondary }]}>
                              취소
                            </Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => setDeleteConfirmId(item.id)}
                          style={({ hovered }: any) => [
                            styles.deleteBtn,
                            hovered && { backgroundColor: colors.error + '15' },
                            { cursor: 'pointer' } as any,
                          ]}
                        >
                          <Text style={[styles.deleteBtnText, { color: colors.error }]}>🗑</Text>
                        </Pressable>
                      )}
                    </View>
                  </Pressable>
                </View>
              );
            })
          )}
        </View>
      </View>

      {/* ── FAB ── */}
      <Pressable onPress={openModal} style={[styles.fab, { cursor: 'pointer' } as any]}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.fabGradient}>
          <Text style={styles.fabText}>+ 지출 추가</Text>
        </LinearGradient>
      </Pressable>

      {/* ── 지출 추가 모달 ── */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.modal, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>새 지출 추가</Text>

              {/* 내용 */}
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="내용 (예: 점심 식사)"
                placeholderTextColor={theme.textTertiary}
                value={desc}
                onChangeText={setDesc}
              />

              {/* 금액 + 통화 */}
              <View style={styles.amountRow}>
                <TextInput
                  style={[
                    styles.input,
                    styles.amountInput,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  placeholder="금액"
                  placeholderTextColor={theme.textTertiary}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                />
                <View style={styles.currencySelector}>
                  {['KRW', 'JPY', 'USD'].map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setCurrency(c)}
                      style={[
                        styles.currencyBtn,
                        { borderColor: currency === c ? colors.primary[500] : theme.border },
                        currency === c && { backgroundColor: colors.primary[500] + '15' },
                        { cursor: 'pointer' } as any,
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: currency === c ? colors.primary[500] : theme.textSecondary,
                        }}
                      >
                        {c}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* 카테고리 */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>카테고리</Text>
              <View style={styles.catGrid}>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.key}
                    onPress={() => setCategory(cat.key)}
                    style={[
                      styles.catOption,
                      { borderColor: category === cat.key ? cat.color : theme.border },
                      category === cat.key && { backgroundColor: cat.color + '20' },
                      { cursor: 'pointer' } as any,
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: category === cat.key ? cat.color : theme.textSecondary,
                        fontWeight: category === cat.key ? '600' : '400',
                      }}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* 정산 방식 */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>정산 방식</Text>
              <View style={styles.splitTypeRow}>
                {[
                  { key: 'EQUAL' as const, label: '균등분할', icon: '⚖️' },
                  { key: 'CUSTOM' as const, label: '직접입력', icon: '✏️' },
                ].map((type) => (
                  <Pressable
                    key={type.key}
                    onPress={() => setSplitType(type.key)}
                    style={[
                      styles.splitTypeBtn,
                      {
                        borderColor: splitType === type.key ? colors.primary[500] : theme.border,
                        backgroundColor: splitType === type.key ? colors.primary[500] + '12' : 'transparent',
                      },
                      { cursor: 'pointer' } as any,
                    ]}
                  >
                    <Text style={styles.splitTypeIcon}>{type.icon}</Text>
                    <Text
                      style={[
                        styles.splitTypeLabel,
                        {
                          color: splitType === type.key ? colors.primary[500] : theme.textSecondary,
                          fontWeight: splitType === type.key ? '700' : '500',
                        },
                      ]}
                    >
                      {type.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* 멤버 선택 */}
              <View style={styles.memberHeader}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary, marginBottom: 0 }]}>
                  정산 대상 멤버
                </Text>
                <Pressable onPress={selectAllMembers} style={[{ cursor: 'pointer' } as any]}>
                  <Text style={[styles.selectAllText, { color: colors.primary[500] }]}>전체 선택</Text>
                </Pressable>
              </View>
              <View style={styles.memberGrid}>
                {(members as any[] ?? []).map((member: any) => {
                  const userId = member.user?.id ?? member.userId;
                  const nickname = member.user?.nickname ?? '멤버';
                  const isSelected = selectedMemberIds.includes(userId);
                  return (
                    <Pressable
                      key={userId}
                      onPress={() => toggleMember(userId)}
                      style={[
                        styles.memberChip,
                        {
                          borderColor: isSelected ? colors.primary[500] : theme.border,
                          backgroundColor: isSelected ? colors.primary[500] + '15' : 'transparent',
                        },
                        { cursor: 'pointer' } as any,
                      ]}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          {
                            borderColor: isSelected ? colors.primary[500] : theme.border,
                            backgroundColor: isSelected ? colors.primary[500] : 'transparent',
                          },
                        ]}
                      >
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <View style={[styles.memberAvatar, { backgroundColor: colors.primary[500] + '25' }]}>
                        <Text style={styles.memberAvatarText}>{nickname.charAt(0)}</Text>
                      </View>
                      <Text
                        style={[
                          styles.memberName,
                          { color: isSelected ? colors.primary[500] : theme.textSecondary },
                        ]}
                      >
                        {nickname}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {selectedMemberIds.length > 0 && amount && (
                <View style={[styles.splitPreview, { backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)' }]}>
                  <Text style={[styles.splitPreviewText, { color: colors.primary[500] }]}>
                    💡 {selectedMemberIds.length}명 ×{' '}
                    {formatAmount(Math.round(parseFloat(amount || '0') / selectedMemberIds.length))} / 인
                  </Text>
                </View>
              )}

              {/* 에러 */}
              {formError ? (
                <Text style={styles.errorText}>⚠️ {formError}</Text>
              ) : null}

              {/* 액션 버튼 */}
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setShowModal(false)}
                  style={[styles.cancelBtn, { cursor: 'pointer' } as any]}
                >
                  <Text style={[styles.cancelText, { color: theme.textSecondary }]}>취소</Text>
                </Pressable>
                <Pressable
                  onPress={handleCreate}
                  disabled={createMutation.isPending}
                  style={[styles.submitBtn, { cursor: 'pointer' } as any]}
                >
                  <LinearGradient colors={['#667eea', '#764ba2']} style={styles.submitGradient}>
                    <Text style={styles.submitText}>
                      {createMutation.isPending ? '추가 중...' : '추가하기'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingBottom: 120 },
  inner: {
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingTop: 32,
  },

  // ── 헤더 ──
  header: { marginBottom: 28 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4, letterSpacing: 0.2 },

  // ── 요약 카드 ──
  summaryRow: { flexDirection: 'row', gap: 16, marginBottom: 28 },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  summaryIconBg: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  summaryIcon: { fontSize: 24 },
  summaryLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  summaryValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },

  // ── 정산 현황 ──
  settlementSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  settlementBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  settlementBadgeText: { fontSize: 12, fontWeight: '700' },
  settlementGrid: { gap: 12 },
  settlementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  settlementInfo: { flex: 1, gap: 6 },
  settlementFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 12, fontWeight: '700' },
  settlementArrow: { fontSize: 16, fontWeight: '700' },
  settlementText: { fontSize: 14, fontWeight: '500' },
  settlementAmount: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  paidTextStrike: { textDecorationLine: 'line-through', opacity: 0.6 },
  paidToggle: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    marginLeft: 12,
  },
  paidToggleText: { fontSize: 13, fontWeight: '700' },

  // ── 카테고리 차트 ──
  chartSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    marginBottom: 28,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  chartLabel: { width: 100, fontSize: 13, fontWeight: '500' },
  chartBarBg: {
    flex: 1,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(128,128,128,0.1)',
    overflow: 'hidden',
  },
  chartBar: { height: '100%', borderRadius: 6 },
  chartPercent: { width: 40, textAlign: 'right', fontSize: 12, fontWeight: '600' },
  chartAmount: { width: 90, textAlign: 'right', fontSize: 14, fontWeight: '700' },

  // ── 지출 테이블 ──
  tableSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    marginBottom: 28,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  thDate: {
    width: 80,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase' as any,
  },
  thDesc: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase' as any,
  },
  thCat: {
    width: 120,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase' as any,
  },
  thAmount: {
    width: 100,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase' as any,
    textAlign: 'right',
  },
  thAction: { width: 60, fontSize: 12, fontWeight: '700' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  tdDate: { width: 80, fontSize: 13 },
  tdDesc: { flex: 1, fontSize: 14, fontWeight: '500' },
  tdCat: { width: 120 },
  catBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catBadgeText: { fontSize: 11, fontWeight: '600' },
  tdAmount: { width: 100, fontSize: 14, fontWeight: '700', textAlign: 'right' },
  tdAction: { width: 60, alignItems: 'center' },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: { fontSize: 14 },
  deleteConfirmRow: { flexDirection: 'row', gap: 4 },
  confirmDeleteBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  confirmDeleteText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cancelDeleteBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  cancelDeleteText: { fontSize: 11, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptySubtext: { fontSize: 13, marginTop: 4 },

  // ── FAB ──
  fab: {
    position: 'fixed' as any,
    bottom: 32,
    right: 32,
    borderRadius: 16,
    overflow: 'hidden',
    // shadow
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  fabGradient: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
  fabText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // ── 모달 ──
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  modal: {
    width: '100%',
    maxWidth: 560,
    borderRadius: 20,
    padding: 32,
    borderWidth: 1,
  },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 16,
  },
  amountRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  amountInput: { flex: 1, marginBottom: 0 },
  currencySelector: { flexDirection: 'row', gap: 4 },
  currencyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  catOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },

  // ── 정산 방식 ──
  splitTypeRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  splitTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  splitTypeIcon: { fontSize: 18 },
  splitTypeLabel: { fontSize: 14 },

  // ── 멤버 선택 ──
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  selectAllText: { fontSize: 13, fontWeight: '600' },
  memberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { color: '#fff', fontSize: 11, fontWeight: '800' },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: { fontSize: 12, fontWeight: '700', color: '#6366F1' },
  memberName: { fontSize: 13, fontWeight: '500' },
  splitPreview: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  splitPreviewText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },

  // ── 에러 / 액션 ──
  errorText: { color: '#EF4444', fontSize: 13, marginBottom: 12 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20 },
  cancelText: { fontSize: 15, fontWeight: '600' },
  submitBtn: { borderRadius: 12, overflow: 'hidden' },
  submitGradient: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
