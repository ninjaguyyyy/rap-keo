// Seed dữ liệu mẫu để xem trang danh sách kèo.
// Chạy: npm run db:seed  (idempotent — xoá dữ liệu demo cũ rồi tạo lại)
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";

const DEMO_EMAIL = "demo@rapkeo.vn";

// Toạ độ vài điểm ở Hà Nội (lng, lat)
const HANOI = {
  cauGiay: { lng: 105.7905, lat: 21.0313 },
  myDinh: { lng: 105.7635, lat: 21.0205 },
  thanhXuan: { lng: 105.8049, lat: 20.9955 },
};

// Tạo mốc thời gian theo GIỜ VIỆT NAM (UTC+7), không phụ thuộc timezone máy chạy.
// `hhmm` dạng "18:30". `days` = số ngày kể từ hôm nay (theo lịch VN).
function vnDateTime(days: number, hhmm: string): Date {
  const base = new Date(Date.now() + days * 86_400_000);
  // Lấy ngày theo lịch VN dạng YYYY-MM-DD.
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base);
  return new Date(`${ymd}T${hhmm}:00+07:00`);
}

async function insertField(args: {
  name: string;
  address: string;
  lng: number;
  lat: number;
  fieldTypes: string[];
  ownerId: string;
}): Promise<string> {
  const id = randomUUID();
  const typesLiteral = `ARRAY[${args.fieldTypes
    .map((t) => `'${t}'`)
    .join(", ")}]::"FieldType"[]`;
  // Dữ liệu seed có kiểm soát; dùng executeRawUnsafe cho phần geography + mảng enum.
  await db.$executeRawUnsafe(
    `INSERT INTO fields (id, name, address, location, field_types, owner_id, created_at, updated_at)
     VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, ${typesLiteral}, $6, now(), now())`,
    id,
    args.name,
    args.address,
    args.lng,
    args.lat,
    args.ownerId,
  );
  return id;
}

async function main() {
  // --- Dọn dữ liệu demo cũ ---
  const existing = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    await db.match.deleteMany({ where: { creatorId: existing.id } });
    await db.field.deleteMany({ where: { ownerId: existing.id } });
    await db.team.deleteMany({ where: { ownerId: existing.id } });
    await db.user.delete({ where: { id: existing.id } });
  }

  // --- User + Team ---
  const user = await db.user.create({
    data: { email: DEMO_EMAIL, name: "Đội trưởng Demo" },
  });

  const team = await db.team.create({
    data: {
      name: "FC Demo",
      ownerId: user.id,
      skillTier: "AVERAGE",
      homeArea: "Cầu Giấy, Hà Nội",
      members: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  // --- Fields (location qua raw SQL) ---
  const fieldCauGiay = await insertField({
    name: "Sân bóng Cầu Giấy",
    address: "Số 1 Trần Thái Tông, Cầu Giấy, Hà Nội",
    ...HANOI.cauGiay,
    fieldTypes: ["F5", "F7"],
    ownerId: user.id,
  });
  const fieldMyDinh = await insertField({
    name: "Sân Mỹ Đình",
    address: "Lê Đức Thọ, Mỹ Đình, Hà Nội",
    ...HANOI.myDinh,
    fieldTypes: ["F7", "F11"],
    ownerId: user.id,
  });

  // --- Matches ---
  await db.match.createMany({
    data: [
      {
        creatorId: user.id,
        teamId: team.id,
        matchType: "FIND_OPPONENT",
        fieldType: "F7",
        skillTier: "ABOVE_AVERAGE",
        fieldId: fieldCauGiay,
        area: "Cầu Giấy",
        playTime: vnDateTime(1, "18:30"),
        costPerSide: 300000,
        note: "Tìm đối giao hữu sân 7, fair-play.",
      },
      {
        creatorId: user.id,
        teamId: team.id,
        matchType: "NEED_PLAYERS",
        fieldType: "F5",
        skillTier: "WEAK",
        fieldId: fieldCauGiay,
        area: "Cầu Giấy",
        playTime: vnDateTime(1, "20:30"),
        costPerSide: 50000,
        note: "Thiếu 2 người, anh em vào cho vui.",
      },
      {
        creatorId: user.id,
        teamId: team.id,
        matchType: "FIELD_AVAILABLE",
        fieldType: "F11",
        skillTier: "ANY",
        fieldId: fieldMyDinh,
        area: "Mỹ Đình",
        playTime: vnDateTime(2, "16:30"),
        costPerSide: 200000,
        note: "Đã đặt sân 11, cần rủ kèo chia tiền.",
      },
      {
        creatorId: user.id,
        teamId: team.id,
        matchType: "FIND_OPPONENT",
        fieldType: "F7",
        skillTier: "STRONG",
        area: "Thanh Xuân",
        playTime: vnDateTime(3, "08:30"),
        note: "Tìm đối trình mạnh, đá sáng cuối tuần.",
      },
    ],
  });

  const count = await db.match.count();
  console.log(`✅ Seed xong. Tổng số kèo trong DB: ${count}`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await db.$disconnect();
    process.exit(1);
  });
