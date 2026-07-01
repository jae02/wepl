-- PostGIS 공간 컬럼 및 트리거 설정

-- 1. wishlist_places에 geography 컬럼 추가
ALTER TABLE "wishlist_places"
ADD COLUMN IF NOT EXISTS "location" GEOGRAPHY(Point, 4326);

-- 2. lat/lng → geography 자동 동기화 트리거 함수
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

-- 3. 트리거 생성
DROP TRIGGER IF EXISTS trg_sync_wishlist_location ON "wishlist_places";
CREATE TRIGGER trg_sync_wishlist_location
  BEFORE INSERT OR UPDATE OF latitude, longitude
  ON "wishlist_places"
  FOR EACH ROW
  EXECUTE FUNCTION sync_wishlist_location();

-- 4. 공간 인덱스 (GIST)
CREATE INDEX IF NOT EXISTS idx_wishlist_places_location
  ON "wishlist_places"
  USING GIST ("location");
