import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MapView, { Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocation } from '@/hooks/useLocation';

export interface PlacePickerResult {
  latitude: number;
  longitude: number;
  address: string | null;
}

interface MapPlacePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (result: PlacePickerResult) => void;
  initialLocation?: { latitude: number; longitude: number } | null;
}

export default function MapPlacePickerModal({
  visible,
  onClose,
  onSelect,
  initialLocation,
}: MapPlacePickerModalProps) {
  const insets = useSafeAreaInsets();
  const { latitude: userLat, longitude: userLng } = useLocation();
  const mapRef = useRef<MapView>(null);

  const [region, setRegion] = useState<Region>({
    latitude: initialLocation?.latitude || userLat || 37.5665,
    longitude: initialLocation?.longitude || userLng || 126.9780,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const [address, setAddress] = useState<string | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);

  useEffect(() => {
    if (visible && (initialLocation || (userLat && userLng))) {
      setRegion({
        latitude: initialLocation?.latitude || userLat || 37.5665,
        longitude: initialLocation?.longitude || userLng || 126.9780,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [visible, initialLocation, userLat, userLng]);

  const handleRegionChangeComplete = async (newRegion: Region) => {
    setRegion(newRegion);
    setLoadingAddress(true);
    try {
      const result = await Location.reverseGeocodeAsync({
        latitude: newRegion.latitude,
        longitude: newRegion.longitude,
      });
      if (result && result.length > 0) {
        const addr = result[0];
        const formattedAddress = `${addr.region || ''} ${addr.city || ''} ${addr.street || ''} ${addr.name || ''}`.trim();
        setAddress(formattedAddress || '주소 정보 없음');
      } else {
        setAddress('주소 정보 없음');
      }
    } catch (e) {
      setAddress('주소를 가져올 수 없습니다.');
    } finally {
      setLoadingAddress(false);
    }
  };

  const handleSelect = () => {
    onSelect({
      latitude: region.latitude,
      longitude: region.longitude,
      address,
    });
    onClose();
  };

  const moveToMyLocation = () => {
    if (userLat && userLng && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLat,
        longitude: userLng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>닫기</Text>
          </Pressable>
          <Text style={styles.headerTitle}>지도에서 선택</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* 지도 영역 */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={region}
            onRegionChangeComplete={handleRegionChangeComplete}
            showsUserLocation
            showsMyLocationButton={false}
          />
          
          {/* 중앙 핀 고정 */}
          <View style={styles.centerPinContainer} pointerEvents="none">
            <Text style={styles.centerPinEmoji}>📍</Text>
          </View>

          {/* 내 위치 이동 버튼 */}
          <Pressable style={styles.myLocationBtn} onPress={moveToMyLocation}>
            <Text style={styles.myLocationIcon}>🎯</Text>
          </Pressable>
        </View>

        {/* 하단 주소 표시 및 선택 버튼 */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.addressBox}>
            {loadingAddress ? (
              <ActivityIndicator size="small" color="#667eea" />
            ) : (
              <Text style={styles.addressText}>{address || '지도를 움직여 위치를 선택하세요'}</Text>
            )}
          </View>
          <Pressable style={styles.selectBtn} onPress={handleSelect}>
            <Text style={styles.selectBtnText}>이 위치 선택</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#eee',
    zIndex: 10,
  },
  closeBtn: {
    padding: 8,
  },
  closeBtnText: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  centerPinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -15 }, { translateY: -35 }],
  },
  centerPinEmoji: {
    fontSize: 30,
  },
  myLocationBtn: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#fff',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  myLocationIcon: {
    fontSize: 20,
  },
  footer: {
    backgroundColor: '#fff',
    paddingTop: 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    marginTop: -20,
  },
  addressBox: {
    backgroundColor: '#f5f5fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    minHeight: 56,
    justifyContent: 'center',
  },
  addressText: {
    fontSize: 15,
    color: '#1a1a2e',
    textAlign: 'center',
    fontWeight: '500',
  },
  selectBtn: {
    backgroundColor: '#667eea',
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
