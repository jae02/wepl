/**
 * 위치 정보 권한 및 현위치 조회 훅
 * expo-location 기반으로 작동하며 장소 추천, 지도 초기 위치 등에 사용됩니다.
 */
import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { Alert, Linking } from 'react-native';

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: string | null;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    loading: true,
    error: null,
  });

  const requestPermissionAndFetch = useCallback(async () => {
    setLocation((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setLocation({
          latitude: null,
          longitude: null,
          loading: false,
          error: '위치 정보 접근 권한이 거부되었습니다.',
        });
        
        Alert.alert(
          '위치 권한 필요',
          '주변 장소 추천을 위해 위치 권한이 필요합니다. 설정에서 권한을 허용해주세요.',
          [
            { text: '취소', style: 'cancel' },
            { text: '설정으로 이동', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      setLocation({
        latitude: null,
        longitude: null,
        loading: false,
        error: err.message || '위치 정보를 가져오는데 실패했습니다.',
      });
    }
  }, []);

  useEffect(() => {
    requestPermissionAndFetch();
  }, [requestPermissionAndFetch]);

  return {
    ...location,
    refresh: requestPermissionAndFetch,
  };
}
