// @ts-nocheck
/**
 * 웹 전용 타임라인 — 시간 자유 설정 (크로놀로지) + 상단 가로 날짜 패널
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { colors, getThemeColors } from '@/theme';
import { useSchedules, useScheduleDates, useUpdateSchedule, useSwapSchedule, useCreateSchedule, useDeleteSchedule } from '@/hooks/useSchedules';
import { useTrip } from '@/hooks/useTrips';
import { useWishlist } from '@/hooks/useWishlist';
import type { WishlistItem } from '@/hooks/useWishlist';
import {
  useChecklist,
  useCreateChecklistItem,
  useToggleChecklistItem,
  useDeleteChecklistItem,
} from '@/hooks/useChecklist';
import type { ChecklistItem } from '@/hooks/useChecklist';
import { useJsApiLoader, GoogleMap, Marker, Polyline, Autocomplete } from '@react-google-maps/api';

const LIBRARIES: any = ['places'];

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  PLANNED: { label: '예정', color: '#3B82F6', bg: '#3B82F620', icon: '📋' },
  ONGOING: { label: '진행중', color: '#F59E0B', bg: '#F59E0B20', icon: '▶️' },
  COMPLETED: { label: '완료', color: '#10B981', bg: '#10B98120', icon: '✅' },
  SKIPPED: { label: '건너뜀', color: '#6B7280', bg: '#6B728020', icon: '⏭️' },
};

const CATEGORY_ICONS: Record<string, string> = {
  FOOD: '🍽️',
  CAFE: '☕',
  ATTRACTION: '🏛️',
  ACTIVITY: '🎯',
  SHOPPING: '🛍️',
  ACCOMMODATION: '🏨',
  TRANSPORT: '🚗',
  OTHER: '📌',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateKR(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
  } catch {
    return dateStr;
  }
}

function formatDateFull(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  } catch {
    return dateStr;
  }
}

function getDatesInRange(start: string, end: string): string[] {
  try {
    const dates: string[] = [];
    let current = new Date(start);
    const endDate = new Date(end);
    let count = 0;
    while (current <= endDate && count < 60) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
      count++;
    }
    return dates;
  } catch {
    return [];
  }
}

function getDayNumber(dateStr: string, startDateStr: string): number {
  try {
    const d = new Date(dateStr);
    const s = new Date(startDateStr);
    return Math.floor((d.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  } catch {
    return 0;
  }
}

// ─── Checklist Panel ──────────────────────────────────────────────────────────

function ChecklistPanel({
  tripId,
  scheduleId,
  isDark,
  theme,
}: {
  tripId: string;
  scheduleId: string;
  isDark: boolean;
  theme: ReturnType<typeof getThemeColors>;
}) {
  const { data: items, isLoading } = useChecklist(tripId, scheduleId);
  const createItem = useCreateChecklistItem(tripId, scheduleId);
  const toggleItem = useToggleChecklistItem(tripId, scheduleId);
  const deleteItem = useDeleteChecklistItem(tripId, scheduleId);
  const [newTitle, setNewTitle] = useState('');

  const handleAdd = useCallback(() => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    createItem.mutate({ title: trimmed });
    setNewTitle('');
  }, [newTitle, createItem]);

  if (isLoading) {
    return <ActivityIndicator color={colors.primary[500]} style={{ marginTop: 16 }} />;
  }

  const list: ChecklistItem[] = items ?? [];

  return (
    <View style={{ padding: 12 }}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <TextInput
          style={{
            flex: 1, fontSize: 13, paddingVertical: 8, paddingHorizontal: 12,
            borderRadius: 8, borderWidth: 1,
            color: theme.text,
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          }}
          placeholder="새 항목 추가..."
          placeholderTextColor={theme.textTertiary}
          value={newTitle}
          onChangeText={setNewTitle}
          onSubmitEditing={handleAdd}
        />
        <Pressable
          onPress={handleAdd}
          style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.primary[500], alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } as any}
        >
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>+</Text>
        </Pressable>
      </View>
      {list.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => toggleItem.mutate(item.id)}
          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8, cursor: 'pointer' } as any}
        >
          <View style={{
            width: 18, height: 18, borderRadius: 4, borderWidth: 2,
            borderColor: item.isChecked ? colors.primary[500] : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'),
            backgroundColor: item.isChecked ? colors.primary[500] : 'transparent',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {item.isChecked && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✓</Text>}
          </View>
          <Text style={{
            flex: 1, fontSize: 13, color: item.isChecked ? theme.textTertiary : theme.text,
            textDecorationLine: item.isChecked ? 'line-through' : 'none',
          }} numberOfLines={1}>{item.title}</Text>
          <Pressable onPress={(e) => { e.stopPropagation(); deleteItem.mutate(item.id); }}
            style={{ cursor: 'pointer' } as any}>
            <Text style={{ color: colors.error, fontSize: 12 }}>✕</Text>
          </Pressable>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Custom Time Picker ───────────────────────────────────────────────────────

function WheelColumn({ items, value, onChange, theme, isDark, colors }: any) {
  const itemHeight = 36;
  const scrollViewRef = useRef<any>(null);
  const scrollTimeoutRef = useRef<any>(null);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    const idx = items.indexOf(value);
    if (idx >= 0 && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: idx * itemHeight, animated: false });
      }, 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value);
      const idx = items.indexOf(value);
      if (idx >= 0 && scrollViewRef.current && !scrollTimeoutRef.current) {
         scrollViewRef.current?.scrollTo({ y: idx * itemHeight, animated: true });
      }
    }
  }, [value, items, localValue]);

  const handleScroll = (e: any) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / itemHeight);
    if (idx >= 0 && idx < items.length) {
      const selectedItem = items[idx];
      if (localValue !== selectedItem) {
        setLocalValue(selectedItem);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        scrollTimeoutRef.current = null;
        if (value !== selectedItem) {
          onChange(selectedItem);
        }
      }, 150);
    }
  };

  return (
    <View style={{ flex: 1, height: itemHeight * 5, position: 'relative' }}>
      <View style={{ position: 'absolute', top: itemHeight * 2, left: 8, right: 8, height: itemHeight, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderRadius: 10 }} pointerEvents="none" />
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: itemHeight * 2, paddingHorizontal: 8 }}
      >
        {items.map((item: string) => {
          const isSelected = item === localValue;
          return (
            <Pressable key={item} onPress={() => {
               setLocalValue(item);
               onChange(item);
               scrollViewRef.current?.scrollTo({ y: items.indexOf(item) * itemHeight, animated: true });
            }} style={{ height: itemHeight, justifyContent: 'center', alignItems: 'center', cursor: 'pointer' as any }}>
              <Text style={{ fontSize: isSelected ? 20 : 15, fontWeight: isSelected ? '800' : '500', color: isSelected ? colors.primary[500] : theme.textSecondary, opacity: isSelected ? 1 : 0.4 }}>{item}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function CustomTimePicker({ value, onChange, isDark, theme }: { value: string, onChange: (v: string) => void, isDark: boolean, theme: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempHour, setTempHour] = useState(value ? value.split(':')[0] : '12');
  const [tempMin, setTempMin] = useState(value ? value.split(':')[1] : '00');

  useEffect(() => {
    if (value) {
      setTempHour(value.split(':')[0]);
      setTempMin(value.split(':')[1]);
    }
  }, [value, isOpen]);

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const mins = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  return (
    <>
      <Pressable
        onPress={() => setIsOpen(true)}
        style={{
          width: 100, paddingVertical: 10, borderRadius: 20,
          backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)',
          borderWidth: 1, borderColor: colors.primary[500] + '30',
          alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer' as any
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary[500] }}>
          {value || 'HH:MM'}
        </Text>
      </Pressable>

      {isOpen && (
        <Modal transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setIsOpen(false)}>
            <Pressable style={{
              width: 240, backgroundColor: isDark ? '#1E1E2D' : '#FFFFFF',
              borderRadius: 20, padding: 16,
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)', cursor: 'default'
            } as any} onPress={e => e.stopPropagation()}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: theme.text, textAlign: 'center', marginBottom: 16 }}>시간 선택</Text>
              
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 180, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)', borderRadius: 16, overflow: 'hidden' }}>
                <WheelColumn items={hours} value={tempHour} onChange={setTempHour} theme={theme} isDark={isDark} colors={colors} />
                <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text, marginHorizontal: 4 }}>:</Text>
                <WheelColumn items={mins} value={tempMin} onChange={setTempMin} theme={theme} isDark={isDark} colors={colors} />
              </View>

              <Pressable
                onPress={() => {
                  onChange(`${tempHour}:${tempMin}`);
                  setIsOpen(false);
                }}
                style={({ pressed }: any) => [
                  { marginTop: 16, backgroundColor: colors.primary[500], borderRadius: 12, paddingVertical: 10, alignItems: 'center', cursor: 'pointer' },
                  pressed && { opacity: 0.85 }
                ] as any}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>선택 완료</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

// ─── Wishlist Quick-Add Dropdown ─────────────────────────────────────────────

function WishlistDropdown({
  tripId,
  date,
  schedulesLength,
  isDark,
  theme,
  onClose,
}: {
  tripId: string;
  date: string;
  schedulesLength: number;
  isDark: boolean;
  theme: ReturnType<typeof getThemeColors>;
  onClose: () => void;
}) {
  const { data: rawWishlist } = useWishlist(tripId);
  const wishlist = useMemo(() => {
    return (rawWishlist || []).filter((w: any) => w.category !== 'LODGING');
  }, [rawWishlist]);
  const createSchedule = useCreateSchedule(tripId);
  const [customTitle, setCustomTitle] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [customLat, setCustomLat] = useState<number | undefined>();
  const [customLng, setCustomLng] = useState<number | undefined>();
  const [selectedWishlistItem, setSelectedWishlistItem] = useState<WishlistItem | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const initialDateStr = date ? new Date(date).toISOString().split('T')[0] : '';
  const [startDate, setStartDate] = useState(initialDateStr);
  const [endDate, setEndDate] = useState(initialDateStr);

  const handleStartTimeChange = (newStart: string) => {
    if (!startTime || !endTime) {
      setStartTime(newStart);
      if (newStart && !endTime) {
        const [h, m] = newStart.split(':').map(Number);
        setEndTime(`${String(Math.min(23, h + 1)).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        setEndDate(startDate);
      }
      return;
    }
    const [oldSH, oldSM] = startTime.split(':').map(Number);
    const [oldEH, oldEM] = endTime.split(':').map(Number);
    let duration = (oldEH * 60 + oldEM) - (oldSH * 60 + oldSM);
    if (duration < 0 || endDate > startDate) {
      if (duration < 0) duration += 24 * 60;
      else if (endDate > startDate) duration += 24 * 60;
    }
    
    setStartTime(newStart);
    if (duration > 0) {
      const [newSH, newSM] = newStart.split(':').map(Number);
      const newEndMins = newSH * 60 + newSM + duration;
      const finalEndMins = newEndMins % (24 * 60);
      setEndTime(`${String(Math.floor(finalEndMins / 60)).padStart(2, '0')}:${String(finalEndMins % 60).padStart(2, '0')}`);
      
      if (newEndMins >= 24 * 60) {
        const nextDay = new Date(startDate);
        nextDay.setDate(nextDay.getDate() + Math.floor(newEndMins / (24 * 60)));
        setEndDate(nextDay.toISOString().split('T')[0]);
      } else {
        setEndDate(startDate);
      }
    }
  };

  const handleEndTimeChange = (newEnd: string) => {
    setEndTime(newEnd);
    if (startTime && newEnd) {
      const [sH, sM] = startTime.split(':').map(Number);
      const [eH, eM] = newEnd.split(':').map(Number);
      if (eH * 60 + eM < sH * 60 + sM) {
        const nextDay = new Date(startDate);
        nextDay.setDate(nextDay.getDate() + 1);
        setEndDate(nextDay.toISOString().split('T')[0]);
      } else {
        setEndDate(startDate);
      }
    }
  };

  const handleAdd = () => {
    if (!customTitle.trim()) return;
    
    if (selectedWishlistItem) {
      createSchedule.mutate({
        date: startDate,
        endDate: endDate !== startDate ? endDate : undefined,
        wishlistPlaceId: selectedWishlistItem.id,
        customTitle: selectedWishlistItem.name,
        orderIndex: schedulesLength,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
      }, {
        onSuccess: () => onClose(),
      });
    } else {
      createSchedule.mutate({
        date: startDate,
        endDate: endDate !== startDate ? endDate : undefined,
        customTitle: customTitle.trim(),
        customAddress: customAddress.trim() || undefined,
        customLatitude: customLat,
        customLongitude: customLng,
        orderIndex: schedulesLength,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
      }, {
        onSuccess: () => onClose(),
      });
    }
  };

  const handleSelectFromWishlist = (item: WishlistItem) => {
    if (selectedWishlistItem?.id === item.id) {
      setSelectedWishlistItem(null);
      setCustomTitle('');
      setCustomAddress('');
      setCustomLat(undefined);
      setCustomLng(undefined);
    } else {
      setSelectedWishlistItem(item);
      setCustomTitle(item.name);
      setCustomAddress(item.address || '');
      setCustomLat(item.latitude);
      setCustomLng(item.longitude);
    }
  };

  const handleCustomTitleChange = (val: string) => {
    setCustomTitle(val);
    if (selectedWishlistItem) setSelectedWishlistItem(null);
  };

  return (
    <Modal visible={true} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={dropStyles.overlay} onPress={onClose}>
        <Pressable style={[dropStyles.container, {
          backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        }]} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={dropStyles.header}>
            <Text style={[dropStyles.headerTitle, { color: theme.text }]}>
              📅 {formatDateKR(date)} 일정 추가
            </Text>
            <Pressable onPress={onClose} style={{ cursor: 'pointer' } as any}>
              <Text style={{ fontSize: 20, color: theme.textSecondary }}>✕</Text>
            </Pressable>
          </View>

          {/* Date & Time input */}
          <View style={{ padding: 16, borderBottomWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 8 }}>
              📅 날짜 및 시간 (선택)
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <input type="date" value={startDate} onChange={(e) => {
                setStartDate(e.target.value);
                if (e.target.value > endDate) setEndDate(e.target.value);
              }} style={{ flex: 1, padding: 8, borderRadius: 10, border: `1px solid ${colors.primary[500]}30`, backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)', color: colors.primary[500], fontWeight: '700', outline: 'none' }} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.textTertiary }}>~</Text>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 10, border: `1px solid ${colors.primary[500]}30`, backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)', color: colors.primary[500], fontWeight: '700', outline: 'none' }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CustomTimePicker value={startTime} onChange={handleStartTimeChange} isDark={isDark} theme={theme} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.textTertiary }}>~</Text>
              <CustomTimePicker value={endTime} onChange={handleEndTimeChange} isDark={isDark} theme={theme} />
            </View>
          </View>

          {/* Custom input */}
          <View style={{ padding: 16, borderBottomWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 8 }}>
              ✏️ 직접 입력
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {typeof window !== 'undefined' && window.google ? (
                <View style={{ flex: 1 }}>
                  <Autocomplete
                    onLoad={(auto) => { autocompleteRef.current = auto; }}
                    onPlaceChanged={() => {
                      if (autocompleteRef.current) {
                        const place = autocompleteRef.current.getPlace();
                        if (place) {
                          setCustomTitle(place.name || '');
                          setCustomAddress(place.formatted_address || '');
                          if (place.geometry?.location) {
                            setCustomLat(place.geometry.location.lat());
                            setCustomLng(place.geometry.location.lng());
                          }
                        }
                      }
                    }}
                  >
                    <input
                      type="text"
                      placeholder="구글맵에서 장소 검색..."
                      value={customTitle}
                      onChange={(e) => handleCustomTitleChange(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                      style={{
                        width: '100%', fontSize: '14px', padding: '10px 14px',
                        borderRadius: '10px', border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                        color: theme.text, outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                  </Autocomplete>
                </View>
              ) : (
                <TextInput
                  style={{
                    flex: 1, fontSize: 14, paddingVertical: 10, paddingHorizontal: 14,
                    borderRadius: 10, borderWidth: 1,
                    color: theme.text,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                  }}
                  placeholder="예: 공항 이동, 식사..."
                  placeholderTextColor={theme.textTertiary}
                  value={customTitle}
                  onChangeText={handleCustomTitleChange}
                  onSubmitEditing={handleAdd}
                />
              )}
              <Pressable
                onPress={handleAdd}
                style={({ hovered }: any) => [{
                  paddingHorizontal: 16, paddingVertical: 10,
                  backgroundColor: colors.primary[500], borderRadius: 10,
                  cursor: 'pointer',
                  justifyContent: 'center',
                }, hovered && { opacity: 0.85 }] as any}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>추가</Text>
              </Pressable>
            </View>
          </View>

          {/* Wishlist items */}
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 10 }}>
              📌 위시리스트에서 추가
            </Text>
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {(!wishlist || wishlist.length === 0) ? (
                <Text style={{ color: theme.textTertiary, fontSize: 13, paddingVertical: 20, textAlign: 'center' }}>
                  위시리스트가 비어있습니다
                </Text>
              ) : (
                wishlist.map((item: WishlistItem) => {
                  const isSelected = selectedWishlistItem?.id === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => handleSelectFromWishlist(item)}
                      style={({ hovered }: any) => [{
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        paddingVertical: 12, paddingHorizontal: 14,
                        borderRadius: 10, marginBottom: 4,
                        borderWidth: 1, borderColor: isSelected ? colors.primary[500] : 'transparent',
                        backgroundColor: isSelected ? colors.primary[500] + '15' : 'transparent',
                        cursor: 'pointer',
                      },
                      hovered && !isSelected && {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                      }] as any}
                    >
                      <Text style={{ fontSize: 20 }}>
                        {CATEGORY_ICONS[item.category] ?? '📌'}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: isSelected ? colors.primary[500] : theme.text }} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.address && (
                          <Text style={{ fontSize: 12, color: isSelected ? colors.primary[500] + '90' : theme.textTertiary, marginTop: 2 }} numberOfLines={1}>
                            📍 {item.address}
                          </Text>
                        )}
                      </View>
                      <View style={{
                        paddingHorizontal: 8, paddingVertical: 4,
                        backgroundColor: isSelected ? colors.primary[500] : (colors.primary[500] + '15'),
                        borderRadius: 6,
                      }}>
                        <Text style={{ fontSize: 11, color: isSelected ? '#fff' : colors.primary[500], fontWeight: '600' }}>
                          {isSelected ? '선택됨' : '선택'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Accommodation Modal ─────────────────────────────────────────────────────

function AccommodationModal({
  tripId,
  date,
  schedulesLength,
  isDark,
  theme,
  onClose,
}: {
  tripId: string;
  date: string;
  schedulesLength: number;
  isDark: boolean;
  theme: ReturnType<typeof getThemeColors>;
  onClose: () => void;
}) {
  const createSchedule = useCreateSchedule(tripId);
  const { data: rawWishlist } = useWishlist(tripId);
  const wishlist = useMemo(() => {
    return (rawWishlist || []).filter((w: any) => w.category === 'LODGING');
  }, [rawWishlist]);

  const [customTitle, setCustomTitle] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [customLat, setCustomLat] = useState<number | undefined>();
  const [customLng, setCustomLng] = useState<number | undefined>();
  const [selectedWishlistItem, setSelectedWishlistItem] = useState<any>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const initialDateStr = date ? new Date(date).toISOString().split('T')[0] : '';
  const [startDate, setStartDate] = useState(initialDateStr);
  const [endDate, setEndDate] = useState(initialDateStr);

  const handleAdd = () => {
    if (!customTitle.trim()) return;
    
    if (selectedWishlistItem) {
      createSchedule.mutate({
        date: startDate,
        endDate: endDate !== startDate ? endDate : undefined,
        wishlistPlaceId: selectedWishlistItem.id,
        customTitle: selectedWishlistItem.name,
        orderIndex: schedulesLength,
        isAccommodation: true,
      }, {
        onSuccess: () => onClose(),
      });
    } else {
      createSchedule.mutate({
        date: startDate,
        endDate: endDate !== startDate ? endDate : undefined,
        customTitle: customTitle.trim(),
        customAddress: customAddress.trim() || undefined,
        customLatitude: customLat,
        customLongitude: customLng,
        orderIndex: schedulesLength,
        isAccommodation: true,
      }, {
        onSuccess: () => onClose(),
      });
    }
  };

  const handleSelectFromWishlist = (item: any) => {
    if (selectedWishlistItem?.id === item.id) {
      setSelectedWishlistItem(null);
      setCustomTitle('');
    } else {
      setSelectedWishlistItem(item);
      setCustomTitle(item.name);
      setCustomAddress(item.address || '');
      setCustomLat(item.latitude);
      setCustomLng(item.longitude);
    }
  };

  const handleCustomTitleChange = (val: string) => {
    setCustomTitle(val);
    if (selectedWishlistItem) setSelectedWishlistItem(null);
  };

  return (
    <Modal visible={true} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={dropStyles.overlay} onPress={onClose}>
        <Pressable style={[dropStyles.container, {
          backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        }]} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={dropStyles.header}>
            <Text style={[dropStyles.headerTitle, { color: theme.text }]}>
              🏨 숙소 등록
            </Text>
            <Pressable onPress={onClose} style={{ cursor: 'pointer' } as any}>
              <Text style={{ fontSize: 20, color: theme.textSecondary }}>✕</Text>
            </Pressable>
          </View>

          {/* Date input */}
          <View style={{ padding: 16, borderBottomWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 8 }}>
              📅 체크인 / 체크아웃
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>체크인</Text>
                <input type="date" value={startDate} onChange={(e) => {
                  setStartDate(e.target.value);
                  if (e.target.value > endDate) setEndDate(e.target.value);
                }} style={{ width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 10, border: `1px solid ${colors.primary[500]}30`, backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)', color: colors.primary[500], fontWeight: '700', outline: 'none' }} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.textTertiary, marginTop: 18 }}>~</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>체크아웃</Text>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 10, border: `1px solid ${colors.primary[500]}30`, backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)', color: colors.primary[500], fontWeight: '700', outline: 'none' }} />
              </View>
            </View>
          </View>

          {/* Custom input */}
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 8 }}>
              🏨 숙소 검색
            </Text>
            {typeof window !== 'undefined' && window.google ? (
              <Autocomplete
                onLoad={(auto) => { autocompleteRef.current = auto; }}
                onPlaceChanged={() => {
                  if (autocompleteRef.current) {
                    const place = autocompleteRef.current.getPlace();
                    if (place) {
                      setCustomTitle(place.name || '');
                      setCustomAddress(place.formatted_address || '');
                      if (place.geometry?.location) {
                        setCustomLat(place.geometry.location.lat());
                        setCustomLng(place.geometry.location.lng());
                      }
                    }
                  }
                }}
              >
                <input
                  type="text"
                  placeholder="숙소명을 검색하세요 (구글맵)"
                  value={customTitle}
                  onChange={(e) => handleCustomTitleChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                  style={{
                    width: '100%', fontSize: '14px', padding: '12px 14px',
                    borderRadius: '10px', border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                    color: theme.text, outline: 'none', boxSizing: 'border-box', marginBottom: 16
                  }}
                />
              </Autocomplete>
            ) : (
              <TextInput
                style={{
                  width: '100%', fontSize: 14, paddingVertical: 12, paddingHorizontal: 14,
                  borderRadius: 10, borderWidth: 1, marginBottom: 16,
                  color: theme.text,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                  borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                }}
                placeholder="숙소명 직접 입력"
                placeholderTextColor={theme.textTertiary}
                value={customTitle}
                onChangeText={handleCustomTitleChange}
                onSubmitEditing={handleAdd}
              />
            )}
            
            <Pressable
              onPress={handleAdd}
              style={({ hovered }: any) => [{
                paddingVertical: 12,
                backgroundColor: colors.primary[500], borderRadius: 10,
                cursor: 'pointer',
                alignItems: 'center',
              }, hovered && { opacity: 0.85 }] as any}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>숙소 등록하기</Text>
            </Pressable>
          </View>

          {/* Wishlist items */}
          <View style={{ padding: 16, paddingTop: 0 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 10 }}>
              📌 위시리스트에서 추가 (숙소만 표시)
            </Text>
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {wishlist.length === 0 ? (
                <Text style={{ color: theme.textTertiary, fontSize: 13, paddingVertical: 20, textAlign: 'center' }}>
                  위시리스트에 등록된 숙소가 없습니다.
                </Text>
              ) : (
                wishlist.map((item: any) => {
                  const isSelected = selectedWishlistItem?.id === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => handleSelectFromWishlist(item)}
                      style={({ hovered }: any) => [{
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        paddingVertical: 12, paddingHorizontal: 14,
                        borderRadius: 10, marginBottom: 4,
                        borderWidth: 1, borderColor: isSelected ? colors.primary[500] : 'transparent',
                        backgroundColor: isSelected ? colors.primary[500] + '15' : 'transparent',
                        cursor: 'pointer',
                      },
                      hovered && !isSelected && {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                      }] as any}
                    >
                      <Text style={{ fontSize: 20 }}>🏨</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: isSelected ? colors.primary[500] : theme.text }} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.address && (
                          <Text style={{ fontSize: 12, color: isSelected ? colors.primary[500] + '90' : theme.textTertiary, marginTop: 2 }} numberOfLines={1}>
                            📍 {item.address}
                          </Text>
                        )}
                      </View>
                      <View style={{
                        paddingHorizontal: 8, paddingVertical: 4,
                        backgroundColor: isSelected ? colors.primary[500] : (colors.primary[500] + '15'),
                        borderRadius: 6,
                      }}>
                        <Text style={{ fontSize: 11, color: isSelected ? '#fff' : colors.primary[500], fontWeight: '600' }}>
                          {isSelected ? '선택됨' : '선택'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const dropStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  container: {
    width: 480, maxWidth: '90%', borderRadius: 16,
    borderWidth: 1, overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 24px 48px rgba(0,0,0,0.2)' },
      default: { elevation: 16 },
    }) as any,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
});

// ─── Schedule Detail Modal ──────────────────────────────────────────────────

function ScheduleDetailModal({
  item,
  tripId,
  isDark,
  theme,
  onClose,
}: {
  item: any;
  tripId: string;
  isDark: boolean;
  theme: ReturnType<typeof getThemeColors>;
  onClose: () => void;
}) {
  const updateSchedule = useUpdateSchedule(tripId);
  const deleteSchedule = useDeleteSchedule(tripId);
  const [startDate, setStartDate] = useState(item.date ? new Date(item.date).toISOString().split('T')[0] : '');
  const [endDate, setEndDate] = useState(item.endDate ? new Date(item.endDate).toISOString().split('T')[0] : startDate);
  const [startTime, setStartTime] = useState(item.startTime ?? '');
  const [endTime, setEndTime] = useState(item.endTime ?? '');
  const [memo, setMemo] = useState(item.memo ?? '');
  const [status, setStatus] = useState(item.status ?? 'PLANNED');

  const [customTitle, setCustomTitle] = useState(item.customTitle ?? item.wishlistPlace?.name ?? '제목 없음');
  const [customAddress, setCustomAddress] = useState(item.customAddress ?? item.wishlistPlace?.address ?? '');
  const [customLat, setCustomLat] = useState<number | null>(item.customLatitude ?? item.wishlistPlace?.latitude ?? null);
  const [customLng, setCustomLng] = useState<number | null>(item.customLongitude ?? item.wishlistPlace?.longitude ?? null);
  const [wishlistPlaceId, setWishlistPlaceId] = useState<string | null>(item.wishlistPlaceId ?? null);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const autocompleteRef = useRef<any>(null);

  const handleStartTimeChange = (newStart: string) => {
    if (!startTime || !endTime) {
      setStartTime(newStart);
      if (newStart && !endTime) {
        const [h, m] = newStart.split(':').map(Number);
        setEndTime(`${String(Math.min(23, h + 1)).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        setEndDate(startDate);
      }
      return;
    }
    const [oldSH, oldSM] = startTime.split(':').map(Number);
    const [oldEH, oldEM] = endTime.split(':').map(Number);
    let duration = (oldEH * 60 + oldEM) - (oldSH * 60 + oldSM);
    if (duration < 0 || endDate > startDate) {
      if (duration < 0) duration += 24 * 60;
      else if (endDate > startDate) duration += 24 * 60;
    }
    
    setStartTime(newStart);
    if (duration > 0) {
      const [newSH, newSM] = newStart.split(':').map(Number);
      const newEndMins = newSH * 60 + newSM + duration;
      const finalEndMins = newEndMins % (24 * 60);
      setEndTime(`${String(Math.floor(finalEndMins / 60)).padStart(2, '0')}:${String(finalEndMins % 60).padStart(2, '0')}`);
      
      if (newEndMins >= 24 * 60) {
        const nextDay = new Date(startDate);
        nextDay.setDate(nextDay.getDate() + Math.floor(newEndMins / (24 * 60)));
        setEndDate(nextDay.toISOString().split('T')[0]);
      } else {
        setEndDate(startDate);
      }
    }
  };

  const handleEndTimeChange = (newEnd: string) => {
    setEndTime(newEnd);
    if (startTime && newEnd) {
      const [sH, sM] = startTime.split(':').map(Number);
      const [eH, eM] = newEnd.split(':').map(Number);
      if (eH * 60 + eM < sH * 60 + sM) {
        const nextDay = new Date(startDate);
        nextDay.setDate(nextDay.getDate() + 1);
        setEndDate(nextDay.toISOString().split('T')[0]);
      } else {
        setEndDate(startDate);
      }
    }
  };

  const category = item.wishlistPlace?.category ?? 'OTHER';

  const handleSave = () => {
    updateSchedule.mutate({
      scheduleId: item.id,
      data: {
        date: startDate,
        endDate: endDate !== startDate ? endDate : null,
        startTime: startTime || null,
        endTime: endTime || null,
        memo: memo || null,
        status,
        customTitle,
        customAddress,
        customLatitude: customLat ?? null,
        customLongitude: customLng ?? null,
        wishlistPlaceId,
      },
    }, {
      onSuccess: () => onClose(),
    });
  };

  const handleDelete = () => {
    if (window.confirm('정말 이 일정을 삭제하시겠습니까?')) {
      deleteSchedule.mutate(item.id, {
        onSuccess: () => onClose(),
      });
    }
  };

  return (
    <Modal visible={true} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={dropStyles.overlay} onPress={onClose}>
        <Pressable style={[dropStyles.container, {
          backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          width: 520,
        }]} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={{ padding: 20, borderBottomWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Text style={{ fontSize: 22 }}>{CATEGORY_ICONS[category] ?? '📌'}</Text>
                  {isEditingLocation ? (
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TextInput
                        style={{
                          flex: 1, fontSize: 16, paddingVertical: 4, paddingHorizontal: 8,
                          borderRadius: 8, borderWidth: 1, color: theme.text,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                          borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'
                        }}
                        value={customTitle}
                        onChangeText={setCustomTitle}
                      />
                      <Pressable onPress={() => setIsEditingLocation(false)} style={{ cursor: 'pointer' } as any}>
                        <Text style={{ fontSize: 14, color: theme.textSecondary }}>완료</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <>
                      <Text style={{ fontSize: 20, fontWeight: '700', color: theme.text }}>{customTitle}</Text>
                      <Pressable onPress={() => setIsEditingLocation(true)} style={{ marginLeft: 4, cursor: 'pointer' } as any}>
                        <Text style={{ fontSize: 16 }}>✏️</Text>
                      </Pressable>
                    </>
                  )}
                </View>
                {!!customAddress && (
                  <Text style={{ fontSize: 13, color: theme.textSecondary, marginLeft: 30 }}>📍 {customAddress}</Text>
                )}
              </View>
              <Pressable onPress={onClose} style={{ cursor: 'pointer', padding: 4 } as any}>
                <Text style={{ fontSize: 20, color: theme.textSecondary }}>✕</Text>
              </Pressable>
            </View>
          </View>

          {/* Body */}
          <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ padding: 20 }}>
            {/* Location Map & Search */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginBottom: 8 }}>📍 장소 변경</Text>
            <View style={{ marginBottom: 20 }}>
              {typeof window !== 'undefined' && window.google && (
                <View style={{ marginBottom: 10 }}>
                  <Autocomplete
                    onLoad={(auto) => { autocompleteRef.current = auto; }}
                    onPlaceChanged={() => {
                      if (autocompleteRef.current) {
                        const place = autocompleteRef.current.getPlace();
                        if (place) {
                          if (!customTitle || customTitle === '제목 없음') {
                            setCustomTitle(place.name || '');
                          }
                          setCustomAddress(place.formatted_address || '');
                          if (place.geometry?.location) {
                            setCustomLat(place.geometry.location.lat());
                            setCustomLng(place.geometry.location.lng());
                          }
                          setWishlistPlaceId(null);
                        }
                      }
                    }}
                  >
                    <input
                      type="text"
                      placeholder="구글맵에서 장소 검색하여 변경..."
                      style={{
                        width: '100%', fontSize: '14px', padding: '10px 14px',
                        borderRadius: '10px', border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                        color: theme.text, outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                  </Autocomplete>
                </View>
              )}
              {customLat && customLng ? (
                <View style={{ height: 160, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={{ lat: customLat, lng: customLng }}
                    zoom={15}
                    options={{ disableDefaultUI: true, zoomControl: true }}
                  >
                    <Marker position={{ lat: customLat, lng: customLng }} />
                  </GoogleMap>
                </View>
              ) : (
                <View style={{ height: 100, borderRadius: 12, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                  <Text style={{ color: theme.textTertiary, fontSize: 13 }}>장소 정보가 없습니다.</Text>
                </View>
              )}
            </View>

            {/* Date & Time */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginBottom: 8 }}>📅 날짜 및 시간</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <input type="date" value={startDate} onChange={(e) => {
                setStartDate(e.target.value);
                if (e.target.value > endDate) setEndDate(e.target.value);
              }} style={{ flex: 1, padding: 8, borderRadius: 10, border: `1px solid ${colors.primary[500]}30`, backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)', color: colors.primary[500], fontWeight: '700', outline: 'none' }} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.textTertiary }}>~</Text>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 10, border: `1px solid ${colors.primary[500]}30`, backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)', color: colors.primary[500], fontWeight: '700', outline: 'none' }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <CustomTimePicker value={startTime} onChange={handleStartTimeChange} isDark={isDark} theme={theme} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.textTertiary }}>~</Text>
              <CustomTimePicker value={endTime} onChange={handleEndTimeChange} isDark={isDark} theme={theme} />
            </View>

            {/* Status */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginBottom: 8 }}>📊 상태</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <Pressable
                  key={key}
                  onPress={() => setStatus(key)}
                  style={[{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                    borderWidth: 2, cursor: 'pointer',
                    borderColor: status === key ? cfg.color : 'transparent',
                    backgroundColor: status === key ? cfg.bg : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                  }] as any}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: status === key ? cfg.color : theme.textSecondary }}>
                    {cfg.icon} {cfg.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Memo */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginBottom: 8 }}>📝 메모</Text>
            <TextInput
              style={{
                fontSize: 14, paddingVertical: 12, paddingHorizontal: 14,
                borderRadius: 10, borderWidth: 1, minHeight: 80,
                color: theme.text,
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              }}
              value={memo}
              onChangeText={setMemo}
              placeholder="메모를 입력하세요..."
              placeholderTextColor={theme.textTertiary}
              multiline
            />

            {/* Checklist */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginTop: 20, marginBottom: 4 }}>📋 체크리스트</Text>
            <ChecklistPanel tripId={tripId} scheduleId={item.id} isDark={isDark} theme={theme} />
          </ScrollView>

          {/* Footer */}
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            padding: 16, borderTopWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          }}>
            <Pressable
              onPress={handleDelete}
              style={({ hovered }: any) => [{
                paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
                backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)',
                cursor: 'pointer',
              }, hovered && { opacity: 0.8 }] as any}
            >
              <Text style={{ color: '#EF4444', fontWeight: '600', fontSize: 13 }}>삭제</Text>
            </Pressable>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={onClose}
                style={({ hovered }: any) => [{
                  paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                }, hovered && { opacity: 0.8 }] as any}
              >
                <Text style={{ color: theme.textSecondary, fontWeight: '600', fontSize: 14 }}>취소</Text>
              </Pressable>
            <Pressable
              onPress={handleSave}
              style={({ hovered }: any) => [{
                paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
                backgroundColor: colors.primary[500], cursor: 'pointer',
              }, hovered && { opacity: 0.85 }] as any}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>저장</Text>
            </Pressable>
            </View>
          </View> 
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Schedule Item Component (Vertical Timeline) ─────────────────────────────

function ScheduleItemCard({
  item,
  index,
  isLast,
  tripId,
  isDark,
  theme,
  schedules,
  onOpenDetail,
}: {
  item: any;
  index: number;
  isLast: boolean;
  tripId: string;
  isDark: boolean;
  theme: ReturnType<typeof getThemeColors>;
  schedules: any[];
  onOpenDetail: (item: any) => void;
}) {
  const swapSchedule = useSwapSchedule(tripId);
  const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PLANNED;
  const title = item.wishlistPlace?.name ?? item.customTitle ?? '제목 없음';
  const category = item.wishlistPlace?.category ?? 'OTHER';

  return (
    <View style={{ flexDirection: 'row', marginBottom: 0 }}>
      {/* Timeline line & dot */}
      <View style={{ width: 40, alignItems: 'center' }}>
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: status.color, marginTop: 24, zIndex: 1 }} />
        {!isLast && (
          <View style={{ width: 2, flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', marginTop: 4 }} />
        )}
      </View>

      {/* Card Body */}
      <View style={{ flex: 1, paddingBottom: 16 }}>
        <Pressable
          onPress={() => onOpenDetail(item)}
          style={({ hovered }: any) => [{
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 16,
            padding: 16,
            cursor: 'pointer',
          }, hovered && {
            borderColor: colors.primary[500] + '50',
            transform: [{ scale: 1.005 }],
            ...Platform.select({
              web: { boxShadow: '0 8px 24px rgba(0,0,0,0.06)' },
            }) as any,
          }] as any}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {item.startTime ? (
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary[500] }}>
                  {item.startTime} {item.endTime ? `~ ${item.endTime}` : ''}
                </Text>
              ) : (
                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textTertiary }}>
                  시간 미지정 (클릭하여 설정)
                </Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    if (index > 0) {
                      swapSchedule.mutate({ scheduleId: item.id, targetScheduleId: schedules[index - 1].id });
                    }
                  }}
                  disabled={index === 0}
                  style={({ hovered }: any) => [{
                    padding: 4, borderRadius: 6, cursor: index === 0 ? 'not-allowed' : 'pointer',
                  }, hovered && index > 0 && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }] as any}
                >
                  <Text style={{ fontSize: 12, color: index === 0 ? theme.textTertiary : theme.textSecondary }}>▲ 위로</Text>
                </Pressable>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    if (!isLast) {
                      swapSchedule.mutate({ scheduleId: item.id, targetScheduleId: schedules[index + 1].id });
                    }
                  }}
                  disabled={isLast}
                  style={({ hovered }: any) => [{
                    padding: 4, borderRadius: 6, cursor: isLast ? 'not-allowed' : 'pointer',
                  }, hovered && !isLast && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }] as any}
                >
                  <Text style={{ fontSize: 12, color: isLast ? theme.textTertiary : theme.textSecondary }}>▼ 아래로</Text>
                </Pressable>
              </View>
              <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: status.bg }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: status.color }}>{status.label}</Text>
              </View>
            </View>
          </View>

          {/* Title and Address */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <Text style={{ fontSize: 20 }}>{CATEGORY_ICONS[category] ?? '📌'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 2 }} numberOfLines={1}>{title}</Text>
              {item.wishlistPlace?.address && (
                <Text style={{ fontSize: 13, color: theme.textSecondary }} numberOfLines={1}>📍 {item.wishlistPlace.address}</Text>
              )}
            </View>
          </View>

          {/* Memo & Meta */}
          {(item.memo || item._count?.checklistItems > 0) && (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={{ flex: 1, fontSize: 13, color: theme.textSecondary, fontStyle: 'italic' }} numberOfLines={2}>
                {item.memo ? `📝 ${item.memo}` : ''}
              </Text>
              {item._count?.checklistItems > 0 && (
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textTertiary, marginLeft: 16 }}>
                  📋 체크리스트 {item._count.checklistItems}개
                </Text>
              )}
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TimelineWebScreen() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const scheme = useColorScheme() ?? 'dark';
  const isDark = scheme === 'dark';
  const theme = getThemeColors(scheme);

  const { data: trip } = useTrip(tripId ?? '');
  const { data: scheduleDates, isLoading: datesLoading } = useScheduleDates(tripId ?? '');

  const displayDates = useMemo(() => {
    if (trip?.startDate && trip?.endDate) {
      return getDatesInRange(trip.startDate, trip.endDate);
    }
    return scheduleDates ?? [];
  }, [trip, scheduleDates]);

  // 첫 번째 날짜를 자동 선택
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!selectedDate && displayDates.length > 0) {
      setSelectedDate(displayDates[0]);
    }
  }, [displayDates, selectedDate]);

  const [viewMode, setViewMode] = useState<'timeline' | 'map'>('timeline');
  const { data: schedules, isLoading } = useSchedules(tripId ?? '', selectedDate);
  const { data: wishlists, isLoading: isWishlistLoading } = useWishlist(tripId ?? '');
  const updateSchedule = useUpdateSchedule(tripId ?? '');

  // Modal states
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
  const [isAccommodationModalOpen, setIsAccommodationModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);

  // Split schedules
  const regularSchedules = useMemo(() => {
    return (schedules ?? []).filter((s: any) => !s.isAccommodation);
  }, [schedules]);

  const accommodationSchedules = useMemo(() => {
    return (schedules ?? []).filter((s: any) => s.isAccommodation);
  }, [schedules]);

  // Summary stats
  const totalCount = regularSchedules.length;
  const completedCount = regularSchedules.filter((s: any) => s.status === 'COMPLETED').length;

  // Map data
  const mapPath = useMemo(() => {
    return [...(schedules ?? [])]
      .filter((s: any) => (s.wishlistPlace?.latitude && s.wishlistPlace?.longitude) || (s.customLatitude && s.customLongitude))
      .sort((a: any, b: any) => {
        // 우선 숙소를 시작/끝으로 배치하기보다는, 모두 시간 순서로 정렬하되 
        // 시작 시간이 없으면 뒤로 보냅니다.
        if (!a.startTime && !b.startTime) return a.orderIndex - b.orderIndex;
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        const [aH, aM] = a.startTime.split(':').map(Number);
        const [bH, bM] = b.startTime.split(':').map(Number);
        return (aH * 60 + aM) - (bH * 60 + bM);
      })
      .map((s: any) => ({
        lat: s.wishlistPlace?.latitude ?? s.customLatitude,
        lng: s.wishlistPlace?.longitude ?? s.customLongitude
      }));
  }, [schedules]);

  const mapCenter = useMemo(() => {
    if (mapPath.length > 0) return mapPath[0];
    return { lat: 37.5665, lng: 126.9780 };
  }, [mapPath]);

  // ─── 시간표(Timetable) 관련 ──────────────────────────────────────────────────
  const TIME_SLOTS = useMemo(() => {
    const slots: string[] = [];
    for (let h = 0; h <= 23; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
    }
    return slots;
  }, []);

  const SLOT_WIDTH = 140;
  const LABEL_WIDTH = 70;

  // 일정을 시간별로 매핑 (일반 일정만)
  const scheduleGrid = useMemo(() => {
    const grid = new Map<string, any[]>();
    TIME_SLOTS.forEach(slot => grid.set(slot, []));
    // 시간 미지정 일정용
    grid.set('unset', []);

    regularSchedules.forEach((s: any) => {
      if (s.startTime) {
        const hour = s.startTime.split(':')[0].padStart(2, '0');
        const key = `${hour}:00`;
        if (grid.has(key)) {
          grid.get(key)!.push(s);
        } else {
          grid.get('unset')!.push(s);
        }
      } else {
        grid.get('unset')!.push(s);
      }
    });
    return grid;
  }, [regularSchedules, TIME_SLOTS]);

  const dayNum = selectedDate && trip?.startDate
    ? getDayNumber(selectedDate, trip.startDate)
    : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <style>{`
        input[type="date"], input[type="time"] {
          font-family: inherit;
        }
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
          opacity: 0.5;
          transition: 0.2s;
          filter: ${isDark ? 'invert(1)' : 'none'};
        }
        input[type="date"]::-webkit-calendar-picker-indicator:hover,
        input[type="time"]::-webkit-calendar-picker-indicator:hover {
          opacity: 1;
        }
        ::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'};
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'};
        }
        .pac-container {
          z-index: 9999 !important;
        }
      `}</style>
      {/* ── Header ── */}
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderColor: theme.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: theme.text }}>📅 타임라인</Text>
            <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>
              하루 일정을 시간표로 한눈에 확인하고 계획하세요
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {totalCount > 0 && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary }}>📋 {totalCount}개</Text>
                </View>
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, backgroundColor: '#10B98115' }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#10B981' }}>✅ {completedCount}/{totalCount}</Text>
                </View>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Pressable
                onPress={() => setViewMode('timeline')}
                style={[{
                  paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
                  borderWidth: 1, borderColor: 'transparent', cursor: 'pointer',
                }, viewMode === 'timeline' && {
                  backgroundColor: colors.primary[500], borderColor: colors.primary[500],
                }] as any}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: viewMode === 'timeline' ? '#fff' : theme.textSecondary }}>시간표</Text>
              </Pressable>
              <Pressable
                onPress={() => setViewMode('map')}
                style={[{
                  paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
                  borderWidth: 1, borderColor: 'transparent', cursor: 'pointer',
                }, viewMode === 'map' && {
                  backgroundColor: colors.primary[500], borderColor: colors.primary[500],
                }] as any}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: viewMode === 'map' ? '#fff' : theme.textSecondary }}>지도</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── 날짜 선택 탭 ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          {datesLoading && <ActivityIndicator color={colors.primary[500]} style={{ marginRight: 12 }} />}
          {displayDates.map((date: string, idx: number) => {
            const isActive = selectedDate === date;
            const dn = trip?.startDate ? getDayNumber(date, trip.startDate) : idx + 1;
            return (
              <Pressable
                key={date}
                onPress={() => setSelectedDate(date)}
                style={({ hovered }: any) => [{
                  paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: isActive ? colors.primary[500] : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
                  backgroundColor: isActive ? colors.primary[500] + '18' : 'transparent',
                  cursor: 'pointer', alignItems: 'center',
                }, hovered && !isActive && { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }] as any}
              >
                <Text style={{ fontSize: 10, fontWeight: '800', color: isActive ? colors.primary[500] : theme.textTertiary, marginBottom: 2, letterSpacing: 0.5 }}>
                  DAY {dn}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: isActive ? '700' : '500', color: isActive ? colors.primary[500] : theme.text }}>
                  {formatDateKR(date)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── 메인 콘텐츠 ── */}
      {viewMode === 'map' ? (
        <View style={{ flex: 1, margin: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.border }}>
          {isLoaded ? (
            <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={mapCenter} zoom={12}>
              {mapPath.length > 0 && (
                <Polyline path={mapPath} options={{ strokeColor: colors.primary[500], strokeWeight: 4 }} />
              )}
              {/* 위시리스트 마커 (파란색) - 일정에 포함되지 않은 것들만 */}
              {(wishlists ?? []).filter((w: any) => !w.isPlaced).map((item: any) => {
                const lat = item.latitude;
                const lng = item.longitude;
                if (!lat || !lng) return null;
                return (
                  <Marker
                    key={`wl-${item.id}`}
                    position={{ lat, lng }}
                    icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' }}
                    title={`[위시리스트] ${item.name}`}
                  />
                );
              })}
              {/* 숙소 마커 (초록색) */}
              {accommodationSchedules.map((item: any) => {
                const lat = item.wishlistPlace?.latitude ?? item.customLatitude;
                const lng = item.wishlistPlace?.longitude ?? item.customLongitude;
                if (!lat || !lng) return null;
                return (
                  <Marker
                    key={`map-acc-${item.id}`}
                    position={{ lat, lng }}
                    icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' }}
                    title={`[숙소] ${item.wishlistPlace?.name ?? item.customTitle ?? '제목 없음'}`}
                  />
                );
              })}
              {/* 일정 마커 (빨간색 번호) */}
              {[...regularSchedules]
                .filter((item: any) => (item.wishlistPlace?.latitude ?? item.customLatitude) && (item.wishlistPlace?.longitude ?? item.customLongitude))
                .sort((a: any, b: any) => {
                  if (!a.startTime && !b.startTime) return a.orderIndex - b.orderIndex;
                  if (!a.startTime) return 1;
                  if (!b.startTime) return -1;
                  const [aH, aM] = a.startTime.split(':').map(Number);
                  const [bH, bM] = b.startTime.split(':').map(Number);
                  return (aH * 60 + aM) - (bH * 60 + bM);
                })
                .map((item: any, index: number) => {
                  const lat = item.wishlistPlace?.latitude ?? item.customLatitude;
                  const lng = item.wishlistPlace?.longitude ?? item.customLongitude;
                  return (
                    <Marker
                      key={item.id}
                      position={{ lat, lng }}
                      label={{ text: String(index + 1), color: '#fff', fontWeight: 'bold' }}
                      title={item.wishlistPlace?.name ?? item.customTitle ?? '제목 없음'}
                    />
                  );
              })}
            </GoogleMap>
          ) : (
            <ActivityIndicator size="large" color={colors.primary[500]} style={{ marginTop: 60 }} />
          )}
        </View>
      ) : !selectedDate ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>📅</Text>
          <Text style={{ fontSize: 18, fontWeight: '600', color: theme.textSecondary }}>날짜를 선택하세요</Text>
        </View>
      ) : isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* 선택된 날짜 헤더 및 버튼들 */}
          <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text }}>
              {dayNum ? `DAY ${dayNum}` : ''} {formatDateFull(selectedDate)}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => setIsAccommodationModalOpen(true)}
                style={({ hovered }: any) => [{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10,
                  borderWidth: 1, borderColor: colors.primary[500],
                  backgroundColor: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.05)', cursor: 'pointer',
                }, hovered && { opacity: 0.85 }] as any}
              >
                <Text style={{ color: colors.primary[500], fontWeight: '700', fontSize: 14 }}>🏨 숙소 등록</Text>
              </Pressable>
              <Pressable
                onPress={() => setIsAddDropdownOpen(true)}
                style={({ hovered }: any) => [{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10,
                  backgroundColor: colors.primary[500], cursor: 'pointer',
                }, hovered && { opacity: 0.85 }] as any}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>+ 일정 추가</Text>
              </Pressable>
            </View>
          </View>

          {/* ── 숙소 전용 패널 ── */}
          {accommodationSchedules.length > 0 && (
            <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
              {accommodationSchedules.map((acc: any) => (
                <Pressable
                  key={acc.id}
                  onPress={() => setDetailItem(acc)}
                  style={({ hovered }: any) => [{
                    flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12,
                    backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
                    borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    marginBottom: 8, cursor: 'pointer',
                  }, hovered && { opacity: 0.85 }] as any}
                >
                  <Text style={{ fontSize: 24, marginRight: 12 }}>🏨</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary[500], marginBottom: 2 }}>오늘의 숙소</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>
                      {acc.wishlistPlace?.name ?? acc.customTitle ?? '숙소 이름 없음'}
                    </Text>
                  </View>
                  {(acc.wishlistPlace?.address || acc.customAddress) && (
                    <Text style={{ fontSize: 12, color: theme.textSecondary, marginLeft: 16 }}>
                      📍 {acc.wishlistPlace?.address ?? acc.customAddress}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {/* 엑셀 시간표 그리드 (비례형 Gantt 차트) */}
          <ScrollView horizontal style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16, gap: 0 }}>
            {/* 미지정 일정 열 */}
            <View style={{ width: 120, borderRightWidth: 1, borderLeftWidth: 1, borderColor: theme.border, backgroundColor: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)', zIndex: 10 }}>
              <View style={{ height: 32, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderColor: theme.border, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textTertiary }}>시간 미지정</Text>
              </View>
              <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={{ padding: 6, gap: 6, flexGrow: 1 }}
                onDragOver={(e: any) => e.preventDefault()}
                onDrop={(e: any) => {
                  e.preventDefault();
                  const scheduleId = e.dataTransfer.getData('scheduleId');
                  if (scheduleId) {
                    updateSchedule.mutate({ scheduleId, data: { startTime: null, endTime: null } });
                  }
                }}
              >
                {(() => {
                  const unsetItems = regularSchedules.filter((s: any) => !s.startTime);
                  return (
                    <>
                      {unsetItems.map((item: any) => {
                        const title = item.wishlistPlace?.name ?? item.customTitle ?? '제목 없음';
                        const cat = item.wishlistPlace?.category ?? 'OTHER';
                        const st = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PLANNED;
                        return (
                          <Pressable
                            key={item.id}
                            draggable={true}
                            onDragStart={(e: any) => {
                              e.dataTransfer.setData('scheduleId', item.id);
                              e.dataTransfer.setData('oldStartTime', String(item.startTime));
                              e.dataTransfer.setData('oldEndTime', String(item.endTime));
                            }}
                            onPress={() => setDetailItem(item)}
                            style={({ hovered }: any) => [{
                              padding: 8, borderRadius: 6,
                              borderWidth: 1, borderColor: st.color + '40',
                              backgroundColor: isDark ? st.color + '15' : st.color + '08',
                              cursor: 'grab',
                            }, hovered && { borderColor: st.color + '80', transform: [{ scale: 1.02 }] }] as any}
                          >
                            <Text style={{ fontSize: 11, marginBottom: 2 }}>{CATEGORY_ICONS[cat] ?? '📌'}</Text>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.text }} numberOfLines={2}>{title}</Text>
                            <Text style={{ fontSize: 9, color: st.color, fontWeight: '600', marginTop: 4 }}>{st.icon} {st.label}</Text>
                          </Pressable>
                        );
                      })}
                      {unsetItems.length === 0 && (
                        <Text style={{ fontSize: 10, color: theme.textTertiary, textAlign: 'center', marginTop: 16 }}>없음</Text>
                      )}
                    </>
                  );
                })()}
              </ScrollView>
            </View>

            {/* 타임라인 메인 영역 */}
            <View style={{ flexDirection: 'column' }}>
              {/* 시간 헤더 열 */}
              <View style={{ flexDirection: 'row' }}>
                {TIME_SLOTS.map((slot) => {
                  const hour = parseInt(slot.split(':')[0]);
                  const isMealTime = hour === 7 || hour === 12 || hour === 18;
                  return (
                    <View key={slot} style={{ width: 100, height: 32, borderRightWidth: 1, borderColor: theme.border, justifyContent: 'center', alignItems: 'center', backgroundColor: isMealTime ? (isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)') : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'), borderBottomWidth: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: theme.text }}>{slot}</Text>
                        {isMealTime && (
                          <Text style={{ fontSize: 9, color: '#F59E0B', fontWeight: '700' }}>
                            {hour === 7 ? '🌅 조식' : hour === 12 ? '☀️ 중식' : '🌆 석식'}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* 드롭존 및 절대 위치 카드 렌더링 컨테이너 */}
              {(() => {
                const PIXELS_PER_MIN = 100 / 60;
                const ROW_HEIGHT = 60;
                const TIMELINE_START_HOUR = 0;
                const currentViewDate = selectedDate || scheduleDates?.[0] || new Date().toISOString().split('T')[0];

                const processedItems = [...(schedules ?? [])].filter((s: any) => s.startTime).map((item: any) => {
                  let sH, sM, eH, eM;
                  const itemStartDate = item.date ? new Date(item.date).toISOString().split('T')[0] : currentViewDate;
                  const itemEndDate = item.endDate ? new Date(item.endDate).toISOString().split('T')[0] : itemStartDate;

                  if (itemStartDate < currentViewDate && itemEndDate >= currentViewDate) {
                    sH = 0; sM = 0;
                  } else {
                    [sH, sM] = item.startTime.split(':').map(Number);
                  }

                  if (itemEndDate > currentViewDate && itemStartDate <= currentViewDate) {
                    eH = 24; eM = 0;
                  } else {
                    if (item.endTime) {
                      [eH, eM] = item.endTime.split(':').map(Number);
                      const origSH = parseInt(item.startTime.split(':')[0]);
                      const origSM = parseInt(item.startTime.split(':')[1]);
                      if (eH * 60 + eM < origSH * 60 + origSM && itemStartDate === currentViewDate) {
                         eH = 24; eM = 0;
                      }
                    } else {
                      eH = sH + 1; eM = sM; 
                    }
                  }

                  const startMins = sH * 60 + sM - TIMELINE_START_HOUR * 60;
                  const endMins = eH * 60 + eM - TIMELINE_START_HOUR * 60;
                  let duration = endMins - startMins;
                  if (duration <= 0) duration = 60; // fallback

                  return { ...item, _startMins: startMins, _duration: duration };
                });

                const sorted = processedItems.sort((a, b) => a._startMins - b._startMins);

                const rows: number[] = [];
                const blocks = sorted.map((item: any) => {
                  const startMins = item._startMins;
                  const duration = item._duration;
                  
                  // 너무 짧은 일정(예: 30분 미만)은 글씨가 안보이므로, 최소 45분의 시각적 너비를 보장
                  const visualDuration = Math.max(duration, 45);
                  const actualEndMins = startMins + visualDuration;
                  
                  let rowIdx = rows.findIndex(rowEnd => rowEnd <= startMins);
                  if (rowIdx === -1) {
                    rowIdx = rows.length;
                    rows.push(actualEndMins);
                  } else {
                    rows[rowIdx] = actualEndMins;
                  }
                  
                  return {
                    item,
                    left: startMins * PIXELS_PER_MIN,
                    width: visualDuration * PIXELS_PER_MIN,
                    top: rowIdx * ROW_HEIGHT + 12,
                  };
                });

                const maxRows = Math.max(1, rows.length);
                const gridHeight = Math.max(maxRows * ROW_HEIGHT + 32, 160);

                return (
                  <View style={{ height: gridHeight, flexDirection: 'row', position: 'relative' }}>
                    {/* 1시간 단위 드롭존 배경 */}
                    {TIME_SLOTS.map((slot) => {
                      const hour = parseInt(slot.split(':')[0]);
                      const isMealTime = hour === 7 || hour === 12 || hour === 18;
                      return (
                        <View
                          key={slot}
                          onDragOver={(e: any) => e.preventDefault()}
                          onDrop={(e: any) => {
                            e.preventDefault();
                            const scheduleId = e.dataTransfer.getData('scheduleId');
                            const oldStartTimeStr = e.dataTransfer.getData('oldStartTime');
                            const oldEndTimeStr = e.dataTransfer.getData('oldEndTime');
                            
                            if (scheduleId) {
                              let newEndTime = undefined;
                              if (oldStartTimeStr && oldEndTimeStr && oldStartTimeStr !== 'null' && oldEndTimeStr !== 'null') {
                                const [osH, osM] = oldStartTimeStr.split(':').map(Number);
                                const [oeH, oeM] = oldEndTimeStr.split(':').map(Number);
                                const durationMins = (oeH * 60 + oeM) - (osH * 60 + osM);
                                
                                if (durationMins > 0) {
                                  const [nsH, nsM] = slot.split(':').map(Number);
                                  const newEndMins = nsH * 60 + nsM + durationMins;
                                  const neH = Math.floor(newEndMins / 60);
                                  const neM = newEndMins % 60;
                                  newEndTime = `${String(neH).padStart(2, '0')}:${String(neM).padStart(2, '0')}`;
                                }
                              }
                              updateSchedule.mutate({
                                scheduleId,
                                data: { startTime: slot, ...(newEndTime ? { endTime: newEndTime } : {}) }
                              });
                            }
                          }}
                          style={{
                            width: 100, borderRightWidth: 1, borderColor: theme.border,
                            backgroundColor: isMealTime ? (isDark ? 'rgba(245,158,11,0.03)' : 'rgba(245,158,11,0.02)') : 'transparent',
                          }}
                        />
                      );
                    })}

                    {/* 실제 일정 블록 렌더링 (Absolute) */}
                    <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, pointerEvents: 'box-none' }}>
                      {blocks.map((block) => {
                        const { item, left, width, top } = block;
                        const title = item.wishlistPlace?.name ?? item.customTitle ?? '제목 없음';
                        const cat = item.wishlistPlace?.category ?? 'OTHER';
                        const st = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PLANNED;
                        const timeStr = item.startTime + (item.endTime ? ` ~ ${item.endTime}` : '');

                        return (
                          <Pressable
                            key={item.id}
                            draggable={true}
                            onDragStart={(e: any) => {
                              e.dataTransfer.setData('scheduleId', item.id);
                              e.dataTransfer.setData('oldStartTime', String(item.startTime));
                              e.dataTransfer.setData('oldEndTime', String(item.endTime));
                            }}
                            onPress={(e) => { e.stopPropagation(); setDetailItem(item); }}
                            style={({ hovered }: any) => [{
                              position: 'absolute', left, top, width: width - 4, // 4px 갭
                              paddingVertical: 6, paddingHorizontal: 8,
                              borderRadius: 6, borderLeftWidth: 3, borderLeftColor: st.color,
                              backgroundColor: isDark ? st.color + '20' : st.color + '15',
                              cursor: 'grab', overflow: 'hidden',
                              minHeight: 48,
                              ...Platform.select({ web: { boxShadow: `0 2px 6px ${st.color}20` } }) as any,
                            }, hovered && {
                              transform: [{ scale: 1.02 }], zIndex: 10,
                              ...Platform.select({ web: { boxShadow: `0 4px 12px ${st.color}40` } }) as any,
                            }] as any}
                          >
                            <View style={{ marginBottom: 2 }}>
                              <Text style={{ fontSize: 11, fontWeight: '800', color: theme.text }} numberOfLines={1}>{title}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Text style={{ fontSize: 10 }}>{CATEGORY_ICONS[cat] ?? '📌'}</Text>
                              <Text style={{ fontSize: 9, color: colors.primary[500], fontWeight: '700' }} numberOfLines={1}>{timeStr}</Text>
                            </View>
                            {width > 80 && item.memo && (
                              <Text style={{ fontSize: 8, color: theme.textTertiary, fontStyle: 'italic' }} numberOfLines={1}>📝 {item.memo}</Text>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })()}
            </View>
          </ScrollView>
        </View>
      )}

      {/* ── 하단 위시리스트 패널 ── */}
      <View style={{
        borderTopWidth: 1, borderColor: theme.border,
        backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
        paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>📌 위시리스트</Text>
          <Text style={{ fontSize: 11, color: theme.textSecondary, marginLeft: 10 }}>일정에 추가할 장소를 참고하세요</Text>
        </View>
        {isWishlistLoading ? (
          <ActivityIndicator color={colors.primary[500]} />
        ) : (wishlists ?? []).filter((w: any) => !w.isPlaced).length === 0 ? (
          <Text style={{ fontSize: 13, color: theme.textTertiary }}>등록된 위시리스트가 없습니다.</Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {(wishlists ?? []).filter((w: any) => !w.isPlaced).map((item: any) => (
              <View key={item.id} style={{
                width: 180, padding: 10, borderRadius: 10,
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                borderWidth: 1, borderColor: theme.border,
              }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, marginBottom: 3 }} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.address && (
                  <Text style={{ fontSize: 10, color: theme.textSecondary }} numberOfLines={1}>📍 {item.address}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ── Modals ── */}
      {isAddDropdownOpen && selectedDate && (
        <WishlistDropdown
          tripId={tripId ?? ''}
          date={selectedDate}
          schedulesLength={totalCount}
          isDark={isDark}
          theme={theme}
          onClose={() => setIsAddDropdownOpen(false)}
        />
      )}
      {isAccommodationModalOpen && selectedDate && (
        <AccommodationModal
          tripId={tripId ?? ''}
          date={selectedDate}
          schedulesLength={totalCount}
          isDark={isDark}
          theme={theme}
          onClose={() => setIsAccommodationModalOpen(false)}
        />
      )}
      {detailItem && (
        <ScheduleDetailModal
          item={detailItem}
          tripId={tripId ?? ''}
          isDark={isDark}
          theme={theme}
          onClose={() => setDetailItem(null)}
        />
      )}
    </View>
  );
}
