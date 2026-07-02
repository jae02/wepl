/**
 * 웹 전용 가계부 — 요약 카드 + 카테고리 차트 + 지출 테이블
 */

import { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView,
  TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { colors, getThemeColors } from '@/theme';
import { useExpenses, useCreateExpense, useExpenseStats, useExpenseSummary } from '@/hooks/useExpenses';

const EXPENSE_CATEGORIES = [
  { key: 'FOOD', label: '🍽️ 식비', color: '#f5576c' },
  { key: 'TRANSPORT', label: '🚗 교통', color: '#3B82F6' },
  { key: 'ACCOMMODATION', label: '🏨 숙소', color: '#8B5CF6' },
  { key: 'SHOPPING', label: '🛍️ 쇼핑', color: '#F59E0B' },
  { key: 'ACTIVITY', label: '🎯 액티비티', color: '#10B981' },
  { key: 'OTHER', label: '📌 기타', color: '#6B7280' },
];

const CATEGORY_COLOR: Record<string, string> = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.key, c.color]));

function formatAmount(amount: number, currency?: string): string {
  return `${currency ?? '₩'}${amount.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  try { return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }); }
  catch { return dateStr; }
}

export default function ExpenseWebScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const scheme = useColorScheme() ?? 'dark';
  const isDark = scheme === 'dark';
  const theme = getThemeColors(scheme);

  const { data: expenses, isLoading, refetch } = useExpenses(tripId ?? '');
  const { data: stats } = useExpenseStats(tripId ?? '');
  const { data: summary } = useExpenseSummary(tripId ?? '');
  const createMutation = useCreateExpense(tripId ?? '');

  const [showModal, setShowModal] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('KRW');
  const [category, setCategory] = useState('FOOD');
  const [formError, setFormError] = useState('');

  // 통계 계산
  const totalAmount = (expenses ?? []).reduce((sum: number, e: any) => sum + (e.amount ?? 0), 0);
  const memberCount = (summary as any[])?.length || 1;
  const perPerson = Math.round(totalAmount / memberCount);
  const categoryCount = new Set((expenses ?? []).map((e: any) => e.category)).size;

  // 카테고리별 합계
  const catTotals: Record<string, number> = {};
  (expenses ?? []).forEach((e: any) => { catTotals[e.category] = (catTotals[e.category] ?? 0) + (e.amount ?? 0); });
  const maxCatAmount = Math.max(...Object.values(catTotals), 1);

  const handleCreate = async () => {
    setFormError('');
    if (!desc.trim() || !amount.trim()) { setFormError('내용과 금액을 입력해주세요.'); return; }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) { setFormError('올바른 금액을 입력해주세요.'); return; }
    try {
      await createMutation.mutateAsync({ description: desc.trim(), amount: numAmount, currency, category } as any);
      setShowModal(false); setDesc(''); setAmount(''); refetch();
    } catch (e: any) { setFormError(e?.message || '추가 실패'); }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.contentContainer}>
      <View style={styles.inner}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>💰 가계부</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>여행 경비를 한눈에 관리하세요</Text>
        </View>

        {/* 요약 카드 */}
        <View style={styles.summaryRow}>
          {[
            { icon: '💰', label: '총 지출', value: formatAmount(totalAmount, currency === 'JPY' ? '¥' : '₩') },
            { icon: '👥', label: '1인당', value: formatAmount(perPerson, currency === 'JPY' ? '¥' : '₩') },
            { icon: '📊', label: '카테고리', value: `${categoryCount}개` },
          ].map((card) => (
            <View key={card.label} style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={styles.summaryIcon}>{card.icon}</Text>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{card.label}</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{card.value}</Text>
            </View>
          ))}
        </View>

        {/* 카테고리 차트 */}
        {Object.keys(catTotals).length > 0 && (
          <View style={[styles.chartSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>📊 카테고리별 지출</Text>
            {Object.entries(catTotals).sort(([, a], [, b]) => b - a).map(([cat, total]) => {
              const catInfo = EXPENSE_CATEGORIES.find((c) => c.key === cat);
              const barWidth = Math.max((total / maxCatAmount) * 100, 5);
              return (
                <View key={cat} style={styles.chartRow}>
                  <Text style={[styles.chartLabel, { color: theme.textSecondary }]}>{catInfo?.label ?? cat}</Text>
                  <View style={styles.chartBarBg}>
                    <View style={[styles.chartBar, { width: `${barWidth}%`, backgroundColor: CATEGORY_COLOR[cat] ?? '#6b7280' }]} />
                  </View>
                  <Text style={[styles.chartAmount, { color: theme.text }]}>{formatAmount(total)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* 지출 테이블 */}
        <View style={[styles.tableSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>📋 지출 내역</Text>

          {/* 테이블 헤더 */}
          <View style={[styles.tableHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.thDate, { color: theme.textSecondary }]}>날짜</Text>
            <Text style={[styles.thDesc, { color: theme.textSecondary }]}>내용</Text>
            <Text style={[styles.thCat, { color: theme.textSecondary }]}>카테고리</Text>
            <Text style={[styles.thAmount, { color: theme.textSecondary }]}>금액</Text>
          </View>

          {isLoading ? (
            <ActivityIndicator color={colors.primary[500]} style={{ marginVertical: 40 }} />
          ) : (expenses ?? []).length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🧾</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>등록된 지출이 없습니다</Text>
            </View>
          ) : (
            (expenses ?? []).map((item: any, idx: number) => {
              const catInfo = EXPENSE_CATEGORIES.find((c) => c.key === item.category);
              const isOdd = idx % 2 === 1;
              return (
                <Pressable
                  key={item.id}
                  style={({ hovered }: any) => [
                    styles.tableRow,
                    isOdd && { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' },
                    hovered && { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                    { cursor: 'pointer' } as any,
                  ]}
                >
                  <Text style={[styles.tdDate, { color: theme.textSecondary }]}>{formatDate(item.createdAt)}</Text>
                  <Text style={[styles.tdDesc, { color: theme.text }]} numberOfLines={1}>{item.description}</Text>
                  <View style={styles.tdCat}>
                    <View style={[styles.catBadge, { backgroundColor: (CATEGORY_COLOR[item.category] ?? '#6b7280') + '20' }]}>
                      <Text style={[styles.catBadgeText, { color: CATEGORY_COLOR[item.category] ?? '#6b7280' }]}>
                        {catInfo?.label ?? item.category}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.tdAmount, { color: theme.text }]}>{formatAmount(item.amount, item.currency === 'JPY' ? '¥' : '₩')}</Text>
                </Pressable>
              );
            })
          )}
        </View>
      </View>

      {/* FAB */}
      <Pressable onPress={() => setShowModal(true)} style={[styles.fab, { cursor: 'pointer' } as any]}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.fabGradient}>
          <Text style={styles.fabText}>+ 지출 추가</Text>
        </LinearGradient>
      </Pressable>

      {/* 모달 */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>새 지출 추가</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: theme.text, borderColor: theme.border }]}
              placeholder="내용 (예: 점심 식사)" placeholderTextColor={theme.textTertiary}
              value={desc} onChangeText={setDesc}
            />
            <View style={styles.amountRow}>
              <TextInput
                style={[styles.input, styles.amountInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: theme.text, borderColor: theme.border }]}
                placeholder="금액" placeholderTextColor={theme.textTertiary}
                value={amount} onChangeText={setAmount} keyboardType="numeric"
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
                    <Text style={{ fontSize: 13, fontWeight: '600', color: currency === c ? colors.primary[500] : theme.textSecondary }}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
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
                  <Text style={{ fontSize: 12, color: category === cat.key ? cat.color : theme.textSecondary }}>{cat.label}</Text>
                </Pressable>
              ))}
            </View>
            {formError ? <Text style={styles.errorText}>⚠️ {formError}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowModal(false)} style={[styles.cancelBtn, { cursor: 'pointer' } as any]}>
                <Text style={[styles.cancelText, { color: theme.textSecondary }]}>취소</Text>
              </Pressable>
              <Pressable onPress={handleCreate} style={[styles.submitBtn, { cursor: 'pointer' } as any]}>
                <LinearGradient colors={['#667eea', '#764ba2']} style={styles.submitGradient}>
                  <Text style={styles.submitText}>{createMutation.isPending ? '추가 중...' : '추가하기'}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingBottom: 100 },
  inner: { maxWidth: 1100, width: '100%', alignSelf: 'center', paddingHorizontal: 32, paddingTop: 32 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4 },
  summaryRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  summaryCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 24, alignItems: 'center' },
  summaryIcon: { fontSize: 32, marginBottom: 8 },
  summaryLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  summaryValue: { fontSize: 24, fontWeight: '800' },
  chartSection: { borderRadius: 16, borderWidth: 1, padding: 24, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20 },
  chartRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  chartLabel: { width: 100, fontSize: 13, fontWeight: '500' },
  chartBarBg: { flex: 1, height: 24, borderRadius: 6, backgroundColor: 'rgba(128,128,128,0.1)', overflow: 'hidden' },
  chartBar: { height: '100%', borderRadius: 6 },
  chartAmount: { width: 90, textAlign: 'right', fontSize: 14, fontWeight: '700' },
  tableSection: { borderRadius: 16, borderWidth: 1, padding: 24, marginBottom: 24 },
  tableHeader: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, marginBottom: 4 },
  thDate: { width: 80, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' as any },
  thDesc: { flex: 1, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' as any },
  thCat: { width: 120, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' as any },
  thAmount: { width: 100, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' as any, textAlign: 'right' },
  tableRow: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 4, borderRadius: 8, alignItems: 'center' },
  tdDate: { width: 80, fontSize: 13 },
  tdDesc: { flex: 1, fontSize: 14, fontWeight: '500' },
  tdCat: { width: 120 },
  catBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catBadgeText: { fontSize: 11, fontWeight: '600' },
  tdAmount: { width: 100, fontSize: 14, fontWeight: '700', textAlign: 'right' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 15 },
  fab: { position: 'fixed' as any, bottom: 32, right: 32, borderRadius: 16, overflow: 'hidden' },
  fabGradient: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
  fabText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '100%', maxWidth: 520, borderRadius: 20, padding: 32, borderWidth: 1 },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 24 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 16 },
  amountRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  amountInput: { flex: 1, marginBottom: 0 },
  currencySelector: { flexDirection: 'row', gap: 4 },
  currencyBtn: { paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  catOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  errorText: { color: '#EF4444', fontSize: 13, marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20 },
  cancelText: { fontSize: 15, fontWeight: '600' },
  submitBtn: { borderRadius: 12, overflow: 'hidden' },
  submitGradient: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
