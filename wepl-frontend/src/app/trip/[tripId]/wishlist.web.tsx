/**
 * 웹 전용 위시리스트 — 카테고리 필터 + 3열 카드 그리드 + 상세 모달 (코멘트 스레드)
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView,
  TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { colors, getThemeColors } from '@/theme';
import { useWishlist, useCreateWishlistItem, useDeleteWishlistItem, useRecommendPlaces } from '@/hooks/useWishlist';
import { useComments, useCreateComment, useDeleteComment } from '@/hooks/useComments';
import { useAuthStore } from '@/stores/auth.store';
import { useJsApiLoader, GoogleMap, Marker, Autocomplete } from '@react-google-maps/api';

const LIBRARIES: any = ['places'];

/* ─── 상수 ───────────────────────────────────────────────────────────────────── */

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

const DETAIL_TABS = [
  { key: 'info', label: '📝 정보' },
  { key: 'comments', label: '💬 코멘트' },
] as const;

type DetailTab = typeof DETAIL_TABS[number]['key'];

/* ─── 유틸 ───────────────────────────────────────────────────────────────────── */

function getInitials(nickname: string): string {
  if (!nickname) return '?';
  return nickname.slice(0, 2).toUpperCase();
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/* ─── 코멘트 아이템 컴포넌트 ─────────────────────────────────────────────────── */

function CommentItem({
  comment,
  currentUserId,
  isDark,
  theme,
  depth,
  onReply,
  onDelete,
}: {
  comment: any;
  currentUserId: string | undefined;
  isDark: boolean;
  theme: any;
  depth: number;
  onReply: (parentId: string, nickname: string) => void;
  onDelete: (commentId: string) => void;
}) {
  const isOwn = currentUserId === comment.authorId;
  const avatarBg = CATEGORY_COLORS[
    Object.keys(CATEGORY_COLORS)[comment.author?.nickname?.charCodeAt(0) % Object.keys(CATEGORY_COLORS).length]
  ] ?? '#667eea';

  return (
    <View style={{ marginLeft: depth * 24 }}>
      <View
        style={[
          cStyles.commentBubble,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          },
          depth > 0 && {
            borderLeftWidth: 3,
            borderLeftColor: colors.primary[500] + '40',
          },
        ]}
      >
        {/* 작성자 헤더 */}
        <View style={cStyles.commentHeader}>
          <View style={[cStyles.avatar, { backgroundColor: avatarBg + '30' }]}>
            <Text style={[cStyles.avatarText, { color: avatarBg }]}>
              {getInitials(comment.author?.nickname ?? '')}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[cStyles.commentAuthor, { color: theme.text }]}>
              {comment.author?.nickname ?? '알 수 없음'}
            </Text>
            <Text style={[cStyles.commentTime, { color: theme.textTertiary }]}>
              {formatTimestamp(comment.createdAt)}
            </Text>
          </View>
          {isOwn && (
            <Pressable
              onPress={() => onDelete(comment.id)}
              style={[cStyles.deleteCommentBtn, { cursor: 'pointer' } as any]}
            >
              <Text style={{ fontSize: 13, color: colors.error }}>삭제</Text>
            </Pressable>
          )}
        </View>

        {/* 본문 */}
        <Text style={[cStyles.commentContent, { color: theme.text }]}>
          {comment.content}
        </Text>

        {/* 답글 버튼 */}
        <Pressable
          onPress={() => onReply(comment.id, comment.author?.nickname ?? '')}
          style={[cStyles.replyBtn, { cursor: 'pointer' } as any]}
        >
          <Text style={[cStyles.replyBtnText, { color: theme.textTertiary }]}>↩ 답글</Text>
        </Pressable>
      </View>

      {/* 대댓글(children) 재귀 렌더 */}
      {comment.children?.map((child: any) => (
        <CommentItem
          key={child.id}
          comment={child}
          currentUserId={currentUserId}
          isDark={isDark}
          theme={theme}
          depth={depth + 1}
          onReply={onReply}
          onDelete={onDelete}
        />
      ))}
    </View>
  );
}

/* ─── 상세 모달 컴포넌트 ─────────────────────────────────────────────────────── */

function DetailModal({
  visible,
  item,
  tripId,
  onClose,
  isDark,
  theme,
}: {
  visible: boolean;
  item: any;
  tripId: string;
  onClose: () => void;
  isDark: boolean;
  theme: any;
}) {
  const currentUser = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<DetailTab>('info');
  const [commentText, setCommentText] = useState('');
  const [replyTarget, setReplyTarget] = useState<{ parentId: string; nickname: string } | null>(null);

  const wishlistId = item?.id ?? '';
  const { data: commentsData, isLoading: commentsLoading } = useComments(tripId, wishlistId);
  const { data: recommendData, isLoading: recommendLoading } = useRecommendPlaces(tripId, item?.latitude, item?.longitude);
  const createCommentMutation = useCreateComment(tripId, wishlistId);
  const deleteCommentMutation = useDeleteComment(tripId, wishlistId);

  const comments = useMemo(() => commentsData ?? [], [commentsData]);
  const totalComments = useMemo(() => {
    let count = 0;
    const walk = (arr: any[]) => {
      for (const c of arr) {
        count++;
        if (c.children) walk(c.children);
      }
    };
    walk(comments);
    return count;
  }, [comments]);

  const handleSubmitComment = useCallback(async () => {
    const content = commentText.trim();
    if (!content) return;
    try {
      await createCommentMutation.mutateAsync({
        content,
        parentId: replyTarget?.parentId,
      });
      setCommentText('');
      setReplyTarget(null);
    } catch {}
  }, [commentText, replyTarget, createCommentMutation]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    try {
      await deleteCommentMutation.mutateAsync(commentId);
    } catch {}
  }, [deleteCommentMutation]);

  const handleReply = useCallback((parentId: string, nickname: string) => {
    setReplyTarget({ parentId, nickname });
    setActiveTab('comments');
  }, []);

  if (!item) return null;

  const catColor = CATEGORY_COLORS[item.category] ?? '#6b7280';
  const catLabel = CATEGORIES.find((c) => c.key === item.category)?.label ?? item.category;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={dStyles.overlay}>
        <View style={[dStyles.modal, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* ── 헤더 ── */}
          <View style={dStyles.header}>
            <LinearGradient
              colors={[catColor + 'DD', catColor + '99']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={dStyles.headerGradient}
            >
              <View style={dStyles.headerContent}>
                <View style={{ flex: 1 }}>
                  <View style={[dStyles.headerBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Text style={dStyles.headerBadgeText}>{catLabel}</Text>
                  </View>
                  <Text style={dStyles.headerTitle} numberOfLines={2}>{item.name}</Text>
                </View>
                <Pressable
                  onPress={onClose}
                  style={[dStyles.closeBtn, { cursor: 'pointer' } as any]}
                >
                  <Text style={dStyles.closeBtnText}>✕</Text>
                </Pressable>
              </View>
            </LinearGradient>
          </View>

          {/* ── 탭 바 ── */}
          <View style={[dStyles.tabBar, { borderBottomColor: theme.border }]}>
            {DETAIL_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const label = tab.key === 'comments' ? `${tab.label} (${totalComments})` : tab.label;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={[
                    dStyles.tabItem,
                    isActive && { borderBottomColor: colors.primary[500], borderBottomWidth: 2 },
                    { cursor: 'pointer' } as any,
                  ]}
                >
                  <Text
                    style={[
                      dStyles.tabText,
                      { color: isActive ? colors.primary[500] : theme.textSecondary },
                      isActive && { fontWeight: '700' },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* ── 탭 컨텐츠 ── */}
          <ScrollView style={dStyles.tabContent} contentContainerStyle={{ paddingBottom: 16 }}>
            {activeTab === 'info' ? (
              <View style={dStyles.infoSection}>
                {/* 주소 */}
                {item.address ? (
                  <View style={dStyles.infoRow}>
                    <Text style={dStyles.infoIcon}>📍</Text>
                    <Text style={[dStyles.infoText, { color: theme.text }]}>{item.address}</Text>
                  </View>
                ) : null}

                {/* 별점 */}
                {item.rating ? (
                  <View style={dStyles.infoRow}>
                    <Text style={dStyles.infoIcon}>⭐</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[dStyles.infoText, { color: theme.text }]}>
                        {'★'.repeat(Math.min(Math.round(item.rating), 5))}
                        {'☆'.repeat(Math.max(5 - Math.round(item.rating), 0))}
                      </Text>
                      <Text style={[dStyles.infoSubtext, { color: theme.textSecondary }]}>
                        {item.rating.toFixed(1)}점
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* 가격대 */}
                {item.priceLevel ? (
                  <View style={dStyles.infoRow}>
                    <Text style={dStyles.infoIcon}>💰</Text>
                    <Text style={[dStyles.infoText, { color: theme.text }]}>
                      {'💲'.repeat(item.priceLevel)} ({['', '저렴', '보통', '비싼', '매우 비싼'][item.priceLevel] ?? ''})
                    </Text>
                  </View>
                ) : null}

                {/* 투표 & 코멘트 */}
                <View style={dStyles.infoRow}>
                  <Text style={dStyles.infoIcon}>👍</Text>
                  <Text style={[dStyles.infoText, { color: theme.text }]}>
                    투표 {item.voteCount ?? 0}개 · 코멘트 {item._count?.comments ?? 0}개
                  </Text>
                </View>

                {/* 설명 */}
                {item.description ? (
                  <View style={[dStyles.descriptionBox, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                  }]}>
                    <Text style={[dStyles.descriptionText, { color: theme.text }]}>
                      {item.description}
                    </Text>
                  </View>
                ) : (
                  <View style={[dStyles.descriptionBox, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                  }]}>
                    <Text style={[dStyles.descriptionPlaceholder, { color: theme.textTertiary }]}>
                      아직 설명이 없습니다
                    </Text>
                  </View>
                )}

                {/* 주변 추천 장소 */}
                <View style={{ marginTop: 24 }}>
                  <Text style={[dStyles.infoText, { marginBottom: 12, fontSize: 16, fontWeight: '700', color: theme.text }]}>📍 주변 추천 장소</Text>
                  {recommendLoading ? (
                    <ActivityIndicator size="small" color={colors.primary[500]} />
                  ) : recommendData?.length ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                      {recommendData.map((place: any) => (
                        <View key={place.id} style={{
                          width: 140, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.border,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)'
                        }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, marginBottom: 4 }} numberOfLines={1}>{place.name}</Text>
                          <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }} numberOfLines={1}>{place.address}</Text>
                          <Text style={{ fontSize: 11, color: theme.textTertiary }}>
                            거리: {Math.round(place.distance || 0)}m
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  ) : (
                    <Text style={{ fontSize: 13, color: theme.textTertiary }}>주변 추천 장소가 없습니다.</Text>
                  )}
                </View>
              </View>
            ) : (
              /* ── 코멘트 탭 ── */
              <View style={dStyles.commentsSection}>
                {commentsLoading ? (
                  <ActivityIndicator size="small" color={colors.primary[500]} style={{ marginTop: 32 }} />
                ) : comments.length === 0 ? (
                  <View style={dStyles.emptyComments}>
                    <Text style={{ fontSize: 36, marginBottom: 12 }}>💬</Text>
                    <Text style={[dStyles.emptyCommentsText, { color: theme.textSecondary }]}>
                      아직 코멘트가 없습니다
                    </Text>
                    <Text style={[dStyles.emptyCommentsSubtext, { color: theme.textTertiary }]}>
                      첫 코멘트를 남겨보세요!
                    </Text>
                  </View>
                ) : (
                  comments.map((comment: any) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      currentUserId={currentUser?.id}
                      isDark={isDark}
                      theme={theme}
                      depth={0}
                      onReply={handleReply}
                      onDelete={handleDeleteComment}
                    />
                  ))
                )}
              </View>
            )}
          </ScrollView>

          {/* ── 코멘트 입력 (코멘트 탭일 때만) ── */}
          {activeTab === 'comments' && (
            <View style={[dStyles.commentInputArea, { borderTopColor: theme.border }]}>
              {replyTarget && (
                <View style={[dStyles.replyIndicator, { backgroundColor: colors.primary[500] + '15' }]}>
                  <Text style={[dStyles.replyIndicatorText, { color: colors.primary[500] }]}>
                    ↩ {replyTarget.nickname}님에게 답글
                  </Text>
                  <Pressable
                    onPress={() => setReplyTarget(null)}
                    style={{ cursor: 'pointer' } as any}
                  >
                    <Text style={{ color: theme.textTertiary, fontSize: 14 }}>✕</Text>
                  </Pressable>
                </View>
              )}
              <View style={dStyles.commentInputRow}>
                <TextInput
                  style={[
                    dStyles.commentInput,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  placeholder={replyTarget ? '답글을 입력하세요...' : '코멘트를 입력하세요...'}
                  placeholderTextColor={theme.textTertiary}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                />
                <Pressable
                  onPress={handleSubmitComment}
                  style={[dStyles.sendBtn, { cursor: 'pointer' } as any]}
                >
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={dStyles.sendBtnGradient}
                  >
                    <Text style={dStyles.sendBtnText}>
                      {createCommentMutation.isPending ? '...' : '전송'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

/* ─── 메인 화면 ──────────────────────────────────────────────────────────────── */

export default function WishlistWebScreen() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const scheme = useColorScheme() ?? 'dark';
  const isDark = scheme === 'dark';
  const theme = getThemeColors(scheme);

  const { data: wishlist, isLoading, refetch } = useWishlist(tripId ?? '');
  const createMutation = useCreateWishlistItem(tripId ?? '');
  const deleteMutation = useDeleteWishlistItem(tripId ?? '');

  const [filter, setFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('RESTAURANT');
  const [formAddress, setFormAddress] = useState('');
  const [formLat, setFormLat] = useState<number | undefined>();
  const [formLng, setFormLng] = useState<number | undefined>();
  const [formError, setFormError] = useState('');
  
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const handlePlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (place) {
        setFormName(place.name || '');
        setFormAddress(place.formatted_address || '');
        if (place.geometry?.location) {
          setFormLat(place.geometry.location.lat());
          setFormLng(place.geometry.location.lng());
        }
      }
    }
  };

  // 상세 모달 상태
  const [detailItem, setDetailItem] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);

  const filtered = filter === 'ALL'
    ? wishlist ?? []
    : (wishlist ?? []).filter((w: any) => w.category === filter);

  const handleCreate = async () => {
    setFormError('');
    if (!formName.trim()) { setFormError('장소명을 입력해주세요.'); return; }
    try {
      await createMutation.mutateAsync({ 
        name: formName.trim(), 
        category: formCategory, 
        address: formAddress.trim() || undefined,
        latitude: formLat,
        longitude: formLng,
      } as any);
      setShowModal(false); setFormName(''); setFormAddress(''); setFormLat(undefined); setFormLng(undefined); refetch();
    } catch (e: any) { setFormError(e?.message || '추가 실패'); }
  };

  const handleDeleteItem = useCallback(async (e: any, itemId: string) => {
    // 이벤트 전파 차단 — 카드 클릭(상세 모달)과 겹치지 않도록
    e?.stopPropagation?.();
    try {
      await deleteMutation.mutateAsync(itemId);
      refetch();
    } catch {}
  }, [deleteMutation, refetch]);

  const openDetail = useCallback((item: any) => {
    setDetailItem(item);
    setShowDetail(true);
  }, []);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.contentContainer}>
      <View style={styles.inner}>
        {/* 헤더 */}
        <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>📌 위시리스트</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              가고 싶은 장소를 모아보세요 · {filtered.length}개
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => setViewMode('list')} style={[styles.viewToggleBtn, viewMode === 'list' && { backgroundColor: colors.primary[500], borderColor: colors.primary[500] }]}>
              <Text style={[styles.viewToggleText, { color: viewMode === 'list' ? '#fff' : theme.textSecondary }]}>리스트 보기</Text>
            </Pressable>
            <Pressable onPress={() => setViewMode('map')} style={[styles.viewToggleBtn, viewMode === 'map' && { backgroundColor: colors.primary[500], borderColor: colors.primary[500] }]}>
              <Text style={[styles.viewToggleText, { color: viewMode === 'map' ? '#fff' : theme.textSecondary }]}>지도 보기</Text>
            </Pressable>
          </View>
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

        {/* 카드 그리드 or 지도 */}
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary[500]} style={{ marginTop: 60 }} />
        ) : viewMode === 'map' ? (
          <View style={{ height: 600, width: '100%', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.border }}>
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={
                  filtered.length > 0 && filtered[0].latitude && filtered[0].longitude
                    ? { lat: filtered[0].latitude, lng: filtered[0].longitude }
                    : { lat: 37.5665, lng: 126.9780 }
                }
                zoom={12}
              >
                {filtered.map((item: any) => (
                  item.latitude && item.longitude && (
                    <Marker
                      key={item.id}
                      position={{ lat: item.latitude, lng: item.longitude }}
                      onClick={() => openDetail(item)}
                      title={item.name}
                    />
                  )
                ))}
              </GoogleMap>
            ) : <ActivityIndicator size="large" color={colors.primary[500]} style={{ marginTop: 60 }} />}
          </View>
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
                  onPress={() => openDetail(item)}
                  style={({ hovered }: any) => [
                    styles.card,
                    { backgroundColor: theme.card, borderColor: theme.border },
                    hovered && styles.cardHovered,
                    { cursor: 'pointer' } as any,
                  ]}
                >
                  {/* 삭제 버튼 */}
                  <Pressable
                    onPress={(e) => handleDeleteItem(e, item.id)}
                    style={({ hovered }: any) => [
                      styles.deleteBtn,
                      { cursor: 'pointer' } as any,
                      hovered && { backgroundColor: 'rgba(239,68,68,0.15)' },
                    ]}
                  >
                    <Text style={styles.deleteBtnText}>🗑️</Text>
                  </Pressable>

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

      {/* 추가 모달 */}
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
            {isLoaded ? (
              <Autocomplete
                onLoad={(autocomplete) => (autocompleteRef.current = autocomplete)}
                onPlaceChanged={handlePlaceChanged}
              >
                <input
                  type="text"
                  placeholder="주소 검색 (구글 맵)"
                  style={{
                    width: '100%', padding: '14px', borderRadius: '12px', boxSizing: 'border-box',
                    border: `1px solid ${theme.border}`, fontSize: '15px', outline: 'none',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    color: theme.text, marginBottom: '16px'
                  }}
                />
              </Autocomplete>
            ) : (
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: theme.text, borderColor: theme.border }]}
                placeholder="주소 (선택)" placeholderTextColor={theme.textTertiary}
                value={formAddress} onChangeText={setFormAddress}
              />
            )}
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

      {/* 상세 모달 */}
      <DetailModal
        visible={showDetail}
        item={detailItem}
        tripId={tripId ?? ''}
        onClose={() => { setShowDetail(false); setDetailItem(null); }}
        isDark={isDark}
        theme={theme}
      />
    </ScrollView>
  );
}

/* ─── 메인 스타일 ────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingBottom: 100 },
  inner: { maxWidth: 1100, width: '100%', alignSelf: 'center', paddingHorizontal: 32, paddingTop: 32 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4 },
  viewToggleBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'transparent', cursor: 'pointer' },
  viewToggleText: { fontSize: 14, fontWeight: '600' },
  filterBar: { marginBottom: 24 },
  filterContent: { gap: 8, paddingBottom: 4 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { width: '31.5%', borderRadius: 16, borderWidth: 1, overflow: 'hidden', position: 'relative' as any },
  cardHovered: { transform: [{ scale: 1.02 }], shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24 },
  cardAccent: { height: 4 },
  cardBody: { padding: 20 },
  cardName: { fontSize: 17, fontWeight: '700', marginBottom: 8, paddingRight: 28 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardAddress: { fontSize: 13, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  metaText: { fontSize: 13 },
  cardFooter: { flexDirection: 'row' },
  footerText: { fontSize: 12 },
  deleteBtn: {
    position: 'absolute' as any,
    top: 12,
    right: 12,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  deleteBtnText: { fontSize: 14 },
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

/* ─── 상세 모달 스타일 ───────────────────────────────────────────────────────── */

const dStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '85%' as any,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  header: {},
  headerGradient: {
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 10,
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 32,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 28,
  },
  tabItem: {
    paddingVertical: 14,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 20,
  },
  infoSection: {},
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  infoIcon: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  infoSubtext: {
    fontSize: 13,
  },
  descriptionBox: {
    marginTop: 8,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
  },
  descriptionPlaceholder: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  commentsSection: {
    gap: 12,
  },
  emptyComments: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyCommentsText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyCommentsSubtext: {
    fontSize: 13,
    marginTop: 4,
  },
  commentInputArea: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 10,
  },
  replyIndicatorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  commentInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  sendBtnGradient: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

/* ─── 코멘트 아이템 스타일 ───────────────────────────────────────────────────── */

const cStyles = StyleSheet.create({
  commentBubble: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '700',
  },
  commentTime: {
    fontSize: 11,
    marginTop: 1,
  },
  deleteCommentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  commentContent: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  replyBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  replyBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
