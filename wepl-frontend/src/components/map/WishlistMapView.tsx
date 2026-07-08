import React from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { useLocation } from '@/hooks/useLocation';

// 위시리스트 아이템 타입 (hook의 타입과 맞춤)
export interface WishlistItemForMap {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string;
}

interface WishlistMapViewProps {
  items: WishlistItemForMap[];
  recommendedPlaces?: WishlistItemForMap[];
  onCalloutPress?: (item: WishlistItemForMap) => void;
}

// 카테고리별 마커 색상
const CATEGORY_COLORS: Record<string, string> = {
  RESTAURANT: '#f5576c',
  CAFE: '#fa709a',
  ATTRACTION: '#4facfe',
  ACCOMMODATION: '#a18cd1',
  ACTIVITY: '#fee140',
  CULTURE: '#764ba2',
  NATURE: '#00f2fe',
  SHOPPING: '#fcb69f',
  OTHER: '#a0a0a0',
};

export default function WishlistMapView({ items, recommendedPlaces = [], onCalloutPress }: WishlistMapViewProps) {
  const { latitude: userLat, longitude: userLng } = useLocation();

  // 좌표가 있는 아이템만 필터링
  const validItems = items.filter((item) => item.latitude && item.longitude);
  const validRecommendations = recommendedPlaces.filter((item) => item.latitude && item.longitude);

  // 초기 지도 영역 계산 (첫 번째 아이템 기준이거나 내 위치)
  const initialRegion = {
    latitude: validItems.length > 0 ? validItems[0].latitude! : (userLat || 37.5665),
    longitude: validItems.length > 0 ? validItems[0].longitude! : (userLng || 126.9780),
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
      >
        {/* 일반 위시리스트 마커 */}
        {validItems.map((item) => (
          <Marker
            key={item.id}
            coordinate={{ latitude: item.latitude!, longitude: item.longitude! }}
            pinColor={CATEGORY_COLORS[item.category] || CATEGORY_COLORS.OTHER}
          >
            <Callout onPress={() => onCalloutPress?.(item)}>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>{item.name}</Text>
                <Text style={styles.calloutCategory}>{item.category}</Text>
                {item.address && <Text style={styles.calloutAddress} numberOfLines={2}>{item.address}</Text>}
              </View>
            </Callout>
          </Marker>
        ))}

        {/* 추천 장소 마커 (투명도 조절하여 구분) */}
        {validRecommendations.map((item) => (
          <Marker
            key={`rec-${item.id}`}
            coordinate={{ latitude: item.latitude!, longitude: item.longitude! }}
            opacity={0.6}
            pinColor="#ccc"
          >
            <Callout onPress={() => onCalloutPress?.(item)}>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>[추천] {item.name}</Text>
                <Text style={styles.calloutCategory}>{item.category}</Text>
                {item.address && <Text style={styles.calloutAddress} numberOfLines={2}>{item.address}</Text>}
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    margin: 16,
    backgroundColor: '#eee',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  calloutContainer: {
    width: 200,
    padding: 8,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  calloutCategory: {
    fontSize: 11,
    color: '#667eea',
    marginBottom: 4,
  },
  calloutAddress: {
    fontSize: 12,
    color: '#666',
  },
});
