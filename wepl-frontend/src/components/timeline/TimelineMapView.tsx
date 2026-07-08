import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView, { Marker, Polyline, Callout } from 'react-native-maps';

export interface MapScheduleItem {
  id: string;
  title: string;
  latitude: number | null;
  longitude: number | null;
  startTime: string;
  status: string;
}

export interface MapWishlistItem {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  category: string;
}

interface TimelineMapViewProps {
  schedules: MapScheduleItem[];
  unassignedWishlist: MapWishlistItem[];
  onScheduleCalloutPress?: (item: MapScheduleItem) => void;
  onWishlistCalloutPress?: (item: MapWishlistItem) => void;
}

const STATUS_COLORS: Record<string, string> = {
  PLANNED: '#667eea',
  ONGOING: '#fbbf24',
  COMPLETED: '#10b981',
  SKIPPED: '#9ca3af',
};

export default function TimelineMapView({
  schedules,
  unassignedWishlist,
  onScheduleCalloutPress,
  onWishlistCalloutPress,
}: TimelineMapViewProps) {
  // 위치 정보가 있는 스케줄만 필터링
  const validSchedules = schedules.filter((s) => s.latitude && s.longitude);
  const validWishlists = unassignedWishlist.filter((w) => w.latitude && w.longitude);

  // 경로 좌표 추출 (순서대로 연결)
  const pathCoordinates = validSchedules.map((s) => ({
    latitude: s.latitude!,
    longitude: s.longitude!,
  }));

  // 초기 지도 영역
  let initialRegion = { latitude: 37.5665, longitude: 126.9780, latitudeDelta: 0.1, longitudeDelta: 0.1 };
  if (validSchedules.length > 0) {
    initialRegion = {
      latitude: validSchedules[0].latitude!,
      longitude: validSchedules[0].longitude!,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  } else if (validWishlists.length > 0) {
    initialRegion = {
      latitude: validWishlists[0].latitude!,
      longitude: validWishlists[0].longitude!,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={initialRegion}>
        {/* 스케줄 경로 선 */}
        {pathCoordinates.length > 1 && (
          <Polyline
            coordinates={pathCoordinates}
            strokeColor="#667eea"
            strokeWidth={3}
            lineDashPattern={[1]}
          />
        )}

        {/* 스케줄 마커 (순서 번호 표시) */}
        {validSchedules.map((item, index) => (
          <Marker
            key={`sch-${item.id}`}
            coordinate={{ latitude: item.latitude!, longitude: item.longitude! }}
            pinColor={STATUS_COLORS[item.status] || STATUS_COLORS.PLANNED}
            zIndex={2}
          >
            <View style={[styles.markerBadge, { backgroundColor: STATUS_COLORS[item.status] || STATUS_COLORS.PLANNED }]}>
              <Text style={styles.markerBadgeText}>{index + 1}</Text>
            </View>
            <Callout onPress={() => onScheduleCalloutPress?.(item)}>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>{item.title}</Text>
                <Text style={styles.calloutTime}>{item.startTime.substring(0, 5)}</Text>
                <Text style={styles.calloutStatus}>{item.status}</Text>
              </View>
            </Callout>
          </Marker>
        ))}

        {/* 미배정 위시리스트 마커 */}
        {validWishlists.map((item) => (
          <Marker
            key={`wish-${item.id}`}
            coordinate={{ latitude: item.latitude!, longitude: item.longitude! }}
            pinColor="#9ca3af" // 회색 계열 (미배정)
            opacity={0.8}
            zIndex={1}
          >
            <Callout onPress={() => onWishlistCalloutPress?.(item)}>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>{item.name}</Text>
                <Text style={styles.calloutCategory}>{item.category} (미배정)</Text>
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
  markerBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  calloutContainer: {
    width: 150,
    padding: 8,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  calloutTime: {
    fontSize: 12,
    color: '#667eea',
    marginBottom: 2,
  },
  calloutStatus: {
    fontSize: 11,
    color: '#666',
  },
  calloutCategory: {
    fontSize: 12,
    color: '#666',
  },
});
