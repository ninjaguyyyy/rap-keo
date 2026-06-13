// PostGIS helpers — cột `location` là Unsupported("geography(Point, 4326)") nên
// phải đọc/ghi qua raw SQL. File này gom các tiện ích dùng chung.
// LƯU Ý: implement chi tiết ở các task feature (matches/fields). Đây là khung + ví dụ.

/**
 * Tạo biểu thức geography point từ kinh độ/vĩ độ (WGS84 / SRID 4326).
 * Dùng trong câu INSERT/UPDATE raw, ví dụ:
 *   UPDATE matches SET location = ST_SetSRID(ST_MakePoint($lng, $lat), 4326) WHERE id = $id
 */
export function makePointSql(lng: number, lat: number): string {
  return `ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;
}

export type LngLat = {
  lng: number;
  lat: number;
};
