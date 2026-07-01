-- =============================================================================
-- PostGIS 확장 활성화 및 공간 컬럼 추가
-- Prisma가 PostGIS geography 타입을 네이티브로 지원하지 않으므로,
-- 마이그레이션 후 수동으로 이 SQL을 실행합니다.
-- =============================================================================

-- 1. PostGIS 확장 설치
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. wishlist_places 테이블에 PostGIS geography 컬럼 추가
ALTER TABLE "wishlist_places"
ADD COLUMN IF NOT EXISTS "location" GEOGRAPHY(Point, 4326);

-- 3. latitude/longitude 값을 기반으로 geography 컬럼을 동기화하는 트리거
CREATE OR REPLACE FUNCTION sync_wishlist_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::GEOGRAPHY;
  ELSE
    NEW.location := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sync_wishlist_location
  BEFORE INSERT OR UPDATE OF latitude, longitude
  ON "wishlist_places"
  FOR EACH ROW
  EXECUTE FUNCTION sync_wishlist_location();

-- 4. 공간 인덱스 생성 (GIST) - 거리 기반 쿼리 성능 최적화
CREATE INDEX IF NOT EXISTS idx_wishlist_places_location
  ON "wishlist_places"
  USING GIST ("location");

-- 5. timeline_schedules에도 위치 컬럼 추가 (커스텀 장소용)
ALTER TABLE "timeline_schedules"
ADD COLUMN IF NOT EXISTS "location" GEOGRAPHY(Point, 4326);

CREATE OR REPLACE FUNCTION sync_schedule_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.custom_latitude IS NOT NULL AND NEW.custom_longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.custom_longitude, NEW.custom_latitude), 4326)::GEOGRAPHY;
  ELSE
    NEW.location := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sync_schedule_location
  BEFORE INSERT OR UPDATE OF custom_latitude, custom_longitude
  ON "timeline_schedules"
  FOR EACH ROW
  EXECUTE FUNCTION sync_schedule_location();
