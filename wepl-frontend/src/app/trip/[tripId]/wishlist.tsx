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
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useWishlist, useAddWishlistItem, useDeleteWishlistItem, useToggleLike, useRecommendPlaces } from '@/hooks/useWishlist';
import { useLocation } from '@/hooks/useLocation';
import { useResponsive } from '@/hooks/useResponsive';
import MapPlacePickerModal from '@/components/map/MapPlacePickerModal';
import WishlistMapView from '@/components/map/WishlistMapView';

const CATEGORIES = [
  { key: 'ALL', label: '전체', icon: '📋' },
  { key: 'RESTAURANT', label: '맛집', icon: '🍽️' },
  { key: 'CAFE', label: '카페', icon: '☕' },
  { key: 'ATTRACTION', label: '관광지', icon: '🏛️' },
  { key: 'ACCOMMODATION', label: '숙소', icon: '🏨' },
  { key: 'ACTIVITY', label: '액티비티', icon: '🎯' },
  { key: 'CULTURE', label: '문화', icon: '🎭' },
  { key: 'NATURE', label: '자연', icon: '🌳' },
  { key: 'SHOPPING', label: '쇼핑', icon: '🛍️' },
  { key: 'OTHER', label: '기타', icon: '✨' },
];

const PRICE_LABELS = ['₩', '₩₩', '₩₩₩', '₩₩₩₩'];

function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '☆' : '') + '☆'.repeat(empty);
}

/** 위시리스트 화면 */
export default function WishlistScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { isDesktop, isWeb, contentMaxWidth, gridColumns } = useResponsive();

  const { data: wishlistItems, isLoading, refetch, isRefetching } = useWishlist(tripId);
  const addMutation = useAddWishlistItem(tripId);

  const deleteMutation = useDeleteWishlistItem(tripId);
  const likeMutation = useToggleLike(tripId);
  const { latitude: userLat, longitude: userLng } = useLocation();
  const { data: recommendedPlaces } = useRecommendPlaces(tripId, userLat ?? undefined, userLng ?? undefined, 1500);

  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isMapView, setIsMapView] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // 추가 폼 상태
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('RESTAURANT');
  const [newAddress, setNewAddress] = useState('');
  const [newLatitude, setNewLatitude] = useState<number | null>(null);
  const [newLongitude, setNewLongitude] = useState<number | null>(null);
  const [newRating, setNewRating] = useState(4);
  const [newPriceLevel, setNewPriceLevel] = useState(2);
  const [newComment, setNewComment] = useState('');
  const [addError, setAddError] = useState('');

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // 카테고리 필터링
  const filteredItems = (wishlistItems ?? []).filter(
    (item: any) => selectedCategory === 'ALL' || item.category === selectedCategory,
  );

  const handleAdd = async () => {
    setAddError('');
    if (!newName.trim()) {
      setAddError('장소 이름을 입력해주세요.');
      return;
    }
    try {
      await addMutation.mutateAsync({
        name: newName.trim(),
        category: newCategory,
        address: newAddress.trim() || undefined,
        latitude: newLatitude ?? undefined,
        longitude: newLongitude ?? undefined,
        rating: newRating,
        priceLevel: newPriceLevel,
        comment: newComment.trim() || undefined,
      });
      setShowAddModal(false);
      resetForm();
      refetch();
    } catch (e: any) {
      setAddError(e?.message || '추가에 실패했습니다.');
    }
  };

  const resetForm = () => {
    setNewName('');
    setNewCategory('RESTAURANT');
    setNewAddress('');
    setNewLatitude(null);
    setNewLongitude(null);
    setNewRating(4);
    setNewPriceLevel(2);
    setNewComment('');
    setAddError('');
  };

  const handleDelete = (itemId: string, name: string) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`"${name}" 장소를 삭제하시겠습니까?`)) {
        deleteMutation.mutateAsync(itemId);
      }
    } else {
      Alert.alert('삭제 확인', `"${name}" 장소를 삭제하시겠습니까?`, [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: () => deleteMutation.mutateAsync(itemId) }
      ]);
    }
  };

  const ds = {
    bg: isDark ? '#0a0a0f' : '#f5f5fa',
    cardBg: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
    cardBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    textPrimary: isDark ? '#ffffff' : '#1a1a2e',
    textSecondary: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
    chipBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    chipBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    modalBg: isDark ? '#1a1a2e' : '#ffffff',
    inputBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    inputBorder: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
    inputText: isDark ? '#ffffff' : '#1a1a2e',
    placeholder: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)',
  };

  const categoryColors: Record<string, string> = {
    RESTAURANT: '#f5576c',
    CAFE: '#d4a574',
    ATTRACTION: '#667eea',
    ACCOMMODATION: '#4facfe',
    ACTIVITY: '#fa709a',
    CULTURE: '#764ba2',
    NATURE: '#00f2fe',
    SHOPPING: '#fcb69f',
    OTHER: '#a0a0a0',
  };

  const renderItem = ({ item }: { item: any }) => {
    const catInfo = CATEGORIES.find((c) => c.key === item.category);
    const catColor = categoryColors[item.category] ?? '#667eea';

    return (
      <Pressable
        onLongPress={() => handleDelete(item.id, item.name)}
        style={[
          styles.wishlistCard,
          { backgroundColor: ds.cardBg, borderColor: ds.cardBorder },
          isDesktop && styles.desktopWishlistCard,
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text
              style={[styles.cardName, { color: ds.textPrimary }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {item.commentCount > 0 && (
              <View style={styles.commentBadge}>
                <Text style={styles.commentBadgeText}>💬 {item.commentCount}</Text>
              </View>
            )}
          </View>
          <View
            style={[styles.categoryBadge, { backgroundColor: catColor + '18' }]}
          >
            <Text style={[styles.categoryBadgeText, { color: catColor }]}>
              {catInfo?.icon} {catInfo?.label ?? item.category}
            </Text>
          </View>
        </View>

        {item.address ? (
          <Text
            style={[styles.cardAddress, { color: ds.textSecondary }]}
            numberOfLines={1}
          >
            📍 {item.address}
          </Text>
        ) : null}

        <View style={styles.cardFooter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.cardStars, { color: '#fbbf24' }]}>
              {renderStars(item.rating ?? 0)}
            </Text>
            <Text style={[styles.cardPrice, { color: ds.textSecondary }]}>
              {PRICE_LABELS[(item.priceLevel ?? 1) - 1] ?? '₩'}
            </Text>
          </View>
          <Pressable onPress={() => likeMutation.mutateAsync(item.id)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: ds.chipBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ fontSize: 16 }}>
              {item.likes && item.likes.length > 0 ? '❤️' : '🤍'}
            </Text>
            {item.likes && item.likes.length > 0 && (
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#f5576c', marginLeft: 4 }}>
                {item.likes.length}
              </Text>
            )}
          </Pressable>
        </View>

        {item.createdBy?.nickname && (
          <View style={styles.creatorRow}>
            <View style={styles.creatorAvatar}>
              <Text style={styles.creatorAvatarText}>
                {item.createdBy.nickname.charAt(0)}
              </Text>
            </View>
            <Text style={[styles.creatorName, { color: ds.textSecondary }]}>
              {item.createdBy.nickname}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>📌</Text>
        <Text style={[styles.emptyTitle, { color: ds.textPrimary }]}>
          위시리스트가 비어있어요
        </Text>
        <Text style={[styles.emptySubtitle, { color: ds.textSecondary }]}>
          가고 싶은 장소를 추가해보세요!
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: ds.bg }, isDesktop && styles.desktopPageContainer]}>
      {/* 뷰 토글 및 카테고리 필터 */}
      <View style={styles.topBar}>
        <View style={styles.viewToggle}>
          <Pressable onPress={() => setIsMapView(false)} style={[styles.toggleBtn, !isMapView && styles.toggleBtnActive]}>
            <Text style={[styles.toggleBtnText, !isMapView && styles.toggleBtnTextActive]}>📋 목록</Text>
          </Pressable>
          <Pressable onPress={() => setIsMapView(true)} style={[styles.toggleBtn, isMapView && styles.toggleBtnActive]}>
            <Text style={[styles.toggleBtnText, isMapView && styles.toggleBtnTextActive]}>🗺️ 지도</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filterContainer, isDesktop && { maxWidth: contentMaxWidth, width: '100%' as any, alignSelf: 'center' as const, paddingHorizontal: 32 }]}
          style={styles.filterScroll}
        >
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.key;
            return (
              <Pressable
                key={cat.key}
                onPress={() => setSelectedCategory(cat.key)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? '#667eea' : ds.chipBg,
                    borderColor: isActive ? '#667eea' : ds.chipBorder,
                  },
                  isWeb && ({ cursor: 'pointer' } as any),
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isActive ? '#ffffff' : ds.textSecondary },
                  ]}
                >
                  {cat.icon} {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 위시리스트 목록 or 지도 */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      ) : isMapView ? (
        <WishlistMapView 
          items={filteredItems.map((w: any) => ({
            id: w.id,
            name: w.name,
            latitude: w.latitude ?? null,
            longitude: w.longitude ?? null,
            address: w.address ?? null,
            category: w.category,
          }))} 
          recommendedPlaces={(recommendedPlaces ?? []).map((w: any) => ({
            id: w.id,
            name: w.name,
            latitude: w.latitude ?? null,
            longitude: w.longitude ?? null,
            address: w.address ?? null,
            category: w.category,
          }))} 
          onCalloutPress={(item) => {/* 향후 상세 모달 지원 예정 */}} 
        />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          key={isDesktop ? `grid-${gridColumns}` : 'list'}
          numColumns={isDesktop ? gridColumns : 1}
          columnWrapperStyle={isDesktop && gridColumns > 1 ? styles.desktopGridRow : undefined}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 100 + insets.bottom },
            isDesktop && { maxWidth: contentMaxWidth, width: '100%' as any, alignSelf: 'center' as const, paddingHorizontal: 32 },
          ]}
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

      {/* 추가 모달 */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
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
                📌 장소 추가
              </Text>

              {addError ? (
                <View style={styles.modalError}>
                  <Text style={styles.modalErrorText}>⚠️ {addError}</Text>
                </View>
              ) : null}

              {/* 이름 */}
              <Text style={[styles.modalLabel, { color: ds.textSecondary }]}>
                장소 이름 *
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
                placeholder="예: 이치란 라멘 신주쿠점"
                placeholderTextColor={ds.placeholder}
                value={newName}
                onChangeText={setNewName}
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
                {CATEGORIES.filter((c) => c.key !== 'ALL').map((cat) => (
                  <Pressable
                    key={cat.key}
                    onPress={() => setNewCategory(cat.key)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor:
                          newCategory === cat.key
                            ? (categoryColors[cat.key] ?? '#667eea') + '20'
                            : ds.inputBg,
                        borderColor:
                          newCategory === cat.key
                            ? categoryColors[cat.key] ?? '#667eea'
                            : ds.inputBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        {
                          color:
                            newCategory === cat.key
                              ? categoryColors[cat.key] ?? '#667eea'
                              : ds.textSecondary,
                        },
                      ]}
                    >
                      {cat.icon} {cat.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* 주소 및 지도 */}
              <View style={styles.addressHeaderRow}>
                <Text style={[styles.modalLabel, { color: ds.textSecondary, marginBottom: 0 }]}>주소 및 위치</Text>
                <Pressable onPress={() => setShowMapPicker(true)} style={styles.mapPickBtn}>
                  <Text style={styles.mapPickBtnText}>🗺️ 지도에서 선택</Text>
                </Pressable>
              </View>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: ds.inputBg,
                    borderColor: ds.inputBorder,
                    color: ds.inputText,
                  },
                ]}
                placeholder="주소를 입력하세요 (선택)"
                placeholderTextColor={ds.placeholder}
                value={newAddress}
                onChangeText={setNewAddress}
              />

              {/* 코멘트 */}
              <Text style={[styles.modalLabel, { color: ds.textSecondary }]}>코멘트 (선택)</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: ds.inputBg,
                    borderColor: ds.inputBorder,
                    color: ds.inputText,
                    minHeight: 80,
                    textAlignVertical: 'top'
                  },
                ]}
                placeholder="장소에 대한 메모나 코멘트를 입력하세요"
                placeholderTextColor={ds.placeholder}
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />

              {/* 평점 */}
              <Text style={[styles.modalLabel, { color: ds.textSecondary }]}>평점</Text>
              <View style={styles.ratingPicker}>
                {[1, 2, 3, 4, 5].map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setNewRating(r)}
                    style={styles.ratingStar}
                  >
                    <Text
                      style={[
                        styles.ratingStarText,
                        { opacity: r <= newRating ? 1 : 0.25 },
                      ]}
                    >
                      ★
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* 가격대 */}
              <Text style={[styles.modalLabel, { color: ds.textSecondary }]}>
                가격대
              </Text>
              <View style={styles.pricePicker}>
                {PRICE_LABELS.map((label, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => setNewPriceLevel(idx + 1)}
                    style={[
                      styles.priceChip,
                      {
                        backgroundColor:
                          newPriceLevel === idx + 1 ? '#667eea20' : ds.inputBg,
                        borderColor:
                          newPriceLevel === idx + 1 ? '#667eea' : ds.inputBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.priceChipText,
                        {
                          color:
                            newPriceLevel === idx + 1 ? '#667eea' : ds.textSecondary,
                        },
                      ]}
                    >
                      {label}
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
        </KeyboardAvoidingView>
      </Modal>

      <MapPlacePickerModal 
        visible={showMapPicker} 
        onClose={() => setShowMapPicker(false)} 
        onSelect={(res) => {
          if (res.address) setNewAddress(res.address);
          setNewLatitude(res.latitude);
          setNewLongitude(res.longitude);
        }} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
  },
  wishlistCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 10,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  commentBadge: {
    backgroundColor: 'rgba(102, 126, 234, 0.12)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  commentBadgeText: {
    fontSize: 11,
    color: '#667eea',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardAddress: {
    fontSize: 13,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardStars: {
    fontSize: 14,
    letterSpacing: 2,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.1)',
  },
  creatorAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  creatorAvatarText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  creatorName: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
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
  ratingPicker: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  ratingStar: {
    padding: 4,
  },
  ratingStarText: {
    fontSize: 28,
    color: '#fbbf24',
  },
  pricePicker: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  priceChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  priceChipText: {
    fontSize: 14,
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
    gap: 12,
  },
  desktopWishlistCard: {
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
  topBar: {
    paddingTop: 10,
    backgroundColor: 'transparent',
  },
  viewToggle: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: 'rgba(128,128,128,0.1)',
    borderRadius: 12,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  toggleBtnTextActive: {
    color: '#1a1a2e',
  },
  addressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mapPickBtn: {
    backgroundColor: '#667eea20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mapPickBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea',
  },
});
