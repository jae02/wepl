/**
 * 반응형 레이아웃 훅 — PC/태블릿/모바일 대응
 * useWindowDimensions를 기반으로 breakpoint 판별 및 컨테이너 스타일 제공
 */

import { useWindowDimensions, Platform, StyleSheet } from 'react-native';

// ─── Breakpoints ────────────────────────────────────────────────────────────────

export const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
} as const;

export type DeviceSize = 'mobile' | 'tablet' | 'desktop' | 'wide';

// ─── 훅 ─────────────────────────────────────────────────────────────────────────

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const deviceSize: DeviceSize =
    width >= BREAKPOINTS.wide
      ? 'wide'
      : width >= BREAKPOINTS.desktop
        ? 'desktop'
        : width >= BREAKPOINTS.tablet
          ? 'tablet'
          : 'mobile';

  const isMobile = deviceSize === 'mobile';
  const isTablet = deviceSize === 'tablet';
  const isDesktop = deviceSize === 'desktop' || deviceSize === 'wide';
  const isWide = deviceSize === 'wide';
  const isWeb = Platform.OS === 'web';

  // 컨텐츠 영역 최대 폭 (PC에서 너무 넓지 않게)
  const contentMaxWidth = isWide ? 1200 : isDesktop ? 960 : isTablet ? 720 : width;

  // 그리드 열 수
  const gridColumns = isWide ? 4 : isDesktop ? 3 : isTablet ? 2 : 1;

  // 사이드바 표시 여부 (데스크톱에서만)
  const showSidebar = isDesktop;

  // 카드 폭 (그리드용)
  const cardWidth = isDesktop
    ? (contentMaxWidth - 48 - (gridColumns - 1) * 16) / gridColumns
    : undefined;

  return {
    width,
    height,
    deviceSize,
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    isWeb,
    contentMaxWidth,
    gridColumns,
    showSidebar,
    cardWidth,
  };
}

// ─── 공통 웹 컨테이너 스타일 ────────────────────────────────────────────────────

export const webStyles = StyleSheet.create({
  /** 페이지 중앙 정렬 컨테이너 */
  pageContainer: {
    flex: 1,
    alignItems: 'center',
  },
  /** 최대 폭 제한 콘텐츠 래퍼 */
  contentWrapper: {
    width: '100%',
    maxWidth: 960,
    paddingHorizontal: 24,
  },
  /** 데스크톱 카드 그리드 */
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  /** 데스크톱 폼 컨테이너 (로그인/회원가입 등) */
  formContainer: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  /** 웹에서 커서 포인터 */
  cursorPointer: Platform.OS === 'web' ? { cursor: 'pointer' as any } : {},
  /** 웹에서 스크롤바 커스텀 (CSS-in-JS로는 불가, 글로벌 CSS 필요) */
});
