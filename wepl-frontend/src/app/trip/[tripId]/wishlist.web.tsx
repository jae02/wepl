/**
 * 웹 전용 위시리스트 — 카테고리 필터 + 3열 카드 그리드
 */

import { useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView,
  TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { colors, getThemeColors } from '@/theme';
import { useWishlist, useCreateWishlistItem } from '@/hooks/useWishlist';

const CATEGORIES = [
  { key: 'ALL', label: '전체', color: '#667eea' },
  { key: 'RESTAURANT', label: '🍽️ 맛집', color: '#f5576c' },
  { key: 'CULTURE', label: '🏛️ 문화', color: '#667eea' },
  { key: 'NATURE', label: '🌿 자연', color: '#00f2fe' },
  { key: 'ACTIVITY', label: '🎯 모험', color: '#fa709a' },
  { key: 'CAFE', label: '🧘 카페', color: '#a18cd1' },
  { key: 'SHOPPING', label: '🛍️ 쇼핑', color: '#fcb69f' },
  { key: 'ACCOMMODATION', label: '🏨 숙소', color: '#4facfe' },
  { key: 'OTHER', label: '📌 기타', color: '#6b7280' },
];

const CATEGORY_COLORS: Record<string, string> = {
  RESTAURANT: '#f5576c', FOOD: '#f5576c', CULTURE: '#667eea',
  NATURE: '#00f2fe', ACTIVITY: '#fa709a', ADVENTURE: '#fa709a',
  CAFE: '#a18cd1', RELAXATION: '#a18cd1', SHOPPING: '#fcb69f',
  ACCOMMODATION: '#4facfe', OTHER: '#6b7280',
};

export default function WishlistWebScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const scheme = useColorScheme() ?? 'dark';
  const isDark = scheme === 'dark';
  const theme = getThemeColors(scheme);

  const { data: wishlist, isLoading, refetch } = useWishlist(tripId ?? '');
  const createMutation = useCreateWishlistItem(tripId ?? '');

  const [filter, setFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('RESTAURANT');
  const [formAddress, setFormAddress] = useState('');
  const [formError, setFormError] = useState('');

  const filtered = filter === 'ALL'
    ? wishlist ?? []
    : (wishlist ?? []).filter((w: any) => w.category === filter);

  const handleCreate = async () => {
    setFormError('');
    if (!formName.trim()) { setFormError('장소명을 입력해주세요.'); return; }
    try {
      await createMutation.mutateAsync({ name: formName.trim(), category: formCategory, address: formAddress.trim() || undefined } as any);
      setShowModal(false); setFormName(''); setFormAddress(''); refetch();
    } catch (e: any) { setFormError(e?.message || '추가 실패'); }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.contentContainer}>
      <View style={styles.inner}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>📌 위시리스트</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            가고 싶은 장소를 모아보세요 · {filtered.length}개
          </Text>
        </View>

        {/* 카테고리 필터 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
          {CATEGORIES.map((cat) => {
            const isActive = filter === cat.key;
            return (
              <Pressable
                key={cat.key}
                onPress={() => setFilter(cat.key)}
                style={[
                  styles.filterChip,
                  { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
                  isActive && { backgroundColor: cat.color, borderColor: cat.color },
                  { cursor: 'pointer' } as any,
                ]}
              >
                <Text style={[styles.filterText, { color: isActive ? '#fff' : theme.textSecondary }]}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* 카드 그리드 */}
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary[500]} style={{ marginTop: 60 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>📍</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>위시리스트가 비어있습니다</Text>
            <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>+ 버튼을 눌러 장소를 추가해보세요</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filtered.map((item: any) => {
              const catColor = CATEGORY_COLORS[item.category] ?? '#6b7280';
              return (
                <Pressable
                  key={item.id}
                  style={({ hovered }: any) => [
                    styles.card,
                    { backgroundColor: theme.card, borderColor: theme.border },
                    hovered && styles.cardHovered,
                    { cursor: 'pointer' } as any,
                  ]}
                >
                  {/* 상단 악센트 바 */}
                  <View style={[styles.cardAccent, { backgroundColor: catColor }]} />
                  <View style={styles.cardBody}>
                    <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                    <View style={[styles.badge, { backgroundColor: catColor + '20' }]}>
                      <Text style={[styles.badgeText, { color: catColor }]}>
                        {CATEGORIES.find((c) => c.key === item.category)?.label ?? item.category}
                      </Text>
                    </View>
                    {item.address ? (
                      <Text style={[styles.cardAddress, { color: theme.textSecondary }]} numberOfLines={1}>📍 {item.address}</Text>
                    ) : null}
                    <View style={styles.cardMeta}>
                      {item.rating ? <Text style={[styles.metaText, { color: theme.textSecondary }]}>{'⭐'.repeat(Math.min(Math.round(item.rating), 5))}</Text> : null}
                      {item.priceLevel ? <Text style={[styles.metaText, { color: theme.textSecondary }]}>{'💰'.repeat(item.priceLevel)}</Text> : null}
                    </View>
                    <View style={styles.cardFooter}>
                      <Text style={[styles.footerText, { color: theme.textTertiary }]}>
                        👍 {item.voteCount ?? 0} · 💬 {item._count?.comments ?? 0}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* FAB */}
      <Pressable
        onPress={() => setShowModal(true)}
        style={({ hovered }: any) => [
          styles.fab,
          hovered && { transform: [{ scale: 1.05 }] },
          { cursor: 'pointer' } as any,
        ]}
      >
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.fabGradient}>
          <Text style={styles.fabText}>+ 장소 추가</Text>
        </LinearGradient>
      </Pressable>

      {/* 모달 */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>새 장소 추가</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: theme.text, borderColor: theme.border }]}
              placeholder="장소명" placeholderTextColor={theme.textTertiary}
              value={formName} onChangeText={setFormName}
            />
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>카테고리</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.filter((c) => c.key !== 'ALL').map((cat) => (
                <Pressable
                  key={cat.key}
                  onPress={() => setFormCategory(cat.key)}
                  style={[
                    styles.catOption,
                    { borderColor: formCategory === cat.key ? cat.color : theme.border },
                    formCategory === cat.key && { backgroundColor: cat.color + '20' },
                    { cursor: 'pointer' } as any,
                  ]}
                >
                  <Text style={{ fontSize: 12, color: formCategory === cat.key ? cat.color : theme.textSecondary }}>{cat.label}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: theme.text, borderColor: theme.border }]}
              placeholder="주소 (선택)" placeholderTextColor={theme.textTertiary}
              value={formAddress} onChangeText={setFormAddress}
            />
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
  filterBar: { marginBottom: 24 },
  filterContent: { gap: 8, paddingBottom: 4 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { width: '31.5%', borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  cardHovered: { transform: [{ scale: 1.02 }], shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24 },
  cardAccent: { height: 4 },
  cardBody: { padding: 20 },
  cardName: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardAddress: { fontSize: 13, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  metaText: { fontSize: 13 },
  cardFooter: { flexDirection: 'row' },
  footerText: { fontSize: 12 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 18, fontWeight: '600' },
  emptySubtext: { fontSize: 14, marginTop: 8 },
  fab: { position: 'fixed' as any, bottom: 32, right: 32, borderRadius: 16, overflow: 'hidden' },
  fabGradient: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
  fabText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '100%', maxWidth: 520, borderRadius: 20, padding: 32, borderWidth: 1 },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 24 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 16 },
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
