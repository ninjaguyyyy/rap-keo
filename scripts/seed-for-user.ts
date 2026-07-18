// Seed dữ liệu mẫu cho 1 user cụ thể (giữ user, gắn đội/kèo mới).
// Chạy: npx tsx scripts/seed-for-user.ts [phone|email]
// Mặc định: 0123456789
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";

const identifier = process.argv[2] ?? "0123456789";

// Toạ độ vài điểm ở Hà Nội (lng, lat)
const HANOI = {
  cauGiay: { lng: 105.7905, lat: 21.0313 },
  myDinh: { lng: 105.7635, lat: 21.0205 },
};

// Tạo mốc thời gian theo GIỜ VIỆT NAM (UTC+7), không phụ thuộc timezone máy chạy.
function vnDateTime(days: number, hhmm: string): Date {
  const base = new Date(Date.now() + days * 86_400_000);
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
  const user = await db.user.findFirst({
    where: { OR: [{ phone: identifier }, { email: identifier }] },
  });
  if (!user) {
    console.error(`❌ Không tìm thấy user: ${identifier}`);
    process.exit(1);
  }
  console.log(`👤 User: ${user.name ?? "(no name)"} · ${user.phone ?? user.email} · ${user.id}`);

  // Xóa data mock cũ của user này (đội + kèo + requests). Giữ user + password.
  // Chỉ xóa đội có tên "FC Mock" (để không đụng đội thật như "68 Rising FC").
  const mockTeams = await db.team.findMany({
    where: { ownerId: user.id, name: "FC Mock" },
    select: { id: true },
  });
  const mockTeamIds = mockTeams.map((t) => t.id);
  if (mockTeamIds.length > 0) {
    // Xóa player_stats + match_requests + matches trước (FK), rồi team.
    await db.playerStat.deleteMany({ where: { teamId: { in: mockTeamIds } } });
    await db.matchRequest.deleteMany({
      where: {
        OR: [
          { match: { teamId: { in: mockTeamIds } } },
          { requesterTeamId: { in: mockTeamIds } },
        ],
      },
    });
    await db.match.deleteMany({ where: { teamId: { in: mockTeamIds } } });
    await db.teamMember.deleteMany({ where: { teamId: { in: mockTeamIds } } });
    await db.team.deleteMany({ where: { id: { in: mockTeamIds } } });
    console.log(`🧹 Xóa ${mockTeamIds.length} đội FC Mock cũ.`);
  }

  // Xóa các user MEMBER mock (phone cố định 099xxx) — idempotent.
  await db.user.deleteMany({ where: { phone: { startsWith: "0999" } } });


  // Tạo đội FC Mock.
  const team = await db.team.create({
    data: {
      name: "FC Mock",
      ownerId: user.id,
      skillTier: "AVERAGE",
      homeArea: "Cầu Giấy, Hà Nội",
      members: { create: { userId: user.id, role: "OWNER" } },
    },
  });
  console.log(`✅ Tạo đội: ${team.name} (${team.id})`);

  // Tạo đối thủ mẫu (user + team) — chỉ để hiển thị tên trong team detail.
  const opponentEmail = `mock-opponent-${team.id.slice(0, 8)}@rapkeo.vn`;
  // Xóa đối thủ cũ cùng email (nếu re-seed).
  const existingOpponent = await db.user.findUnique({ where: { email: opponentEmail } });
  if (existingOpponent) {
    await db.matchRequest.deleteMany({ where: { requesterId: existingOpponent.id } });
    await db.team.deleteMany({ where: { ownerId: existingOpponent.id } });
    await db.user.delete({ where: { id: existingOpponent.id } });
  }
  const opponent = await db.user.create({
    data: { email: opponentEmail, name: "Đội trưởng Đối thủ" },
  });
  const opponentTeam = await db.team.create({
    data: {
      name: "FC Đối Thủ",
      ownerId: opponent.id,
      skillTier: "GOOD",
      homeArea: "Thanh Xuân, Hà Nội",
      members: { create: { userId: opponent.id, role: "OWNER" } },
    },
  });
  console.log(`✅ Tạo đối thủ: ${opponentTeam.name}`);

  // Tạo sân mẫu.
  const fieldId = await insertField({
    name: "Sân Trung Tâm",
    address: "Cầu Giấy, Hà Nội",
    ...HANOI.cauGiay,
    fieldTypes: ["F7", "F5"],
    ownerId: user.id,
  });
  void fieldId;

  // Tạo thành viên MEMBER mẫu (4 người) — có SĐT để test add member + leaderboard.
  // SĐT dùng dải 0999xxxxxx (tránh trùng user thật). Có passwordHash để login test.
  const memberSeeds = [
    { name: "Minh", phone: "0999000001", password: "123456" },
    { name: "Tuấn", phone: "0999000002", password: "123456" },
    { name: "Hùng", phone: "0999000003", password: "123456" },
    { name: "Linh", phone: "0999000004", password: "123456" },
  ];
  const { hash } = await import("bcryptjs");
  const mockMembers: { id: string; name: string; phone: string }[] = [];
  for (const ms of memberSeeds) {
    const u = await db.user.create({
      data: { name: ms.name, phone: ms.phone, passwordHash: await hash(ms.password, 10) },
    });
    await db.teamMember.create({
      data: { teamId: team.id, userId: u.id, role: "MEMBER" },
    });
    mockMembers.push({ id: u.id, name: u.name!, phone: u.phone! });
  }
  console.log(`✅ Tạo ${mockMembers.length} thành viên MEMBER.`);

  // Tạo kèo / trận.
  const matches = await db.match.createManyAndReturn({
    data: [
      // Next match: sắp tới, chưa ghép đối.
      {
        creatorId: user.id,
        teamId: team.id,
        matchType: "FIND_OPPONENT",
        fieldType: "F7",
        skillTiers: ["AVERAGE", "ABOVE_AVERAGE"],
        area: "trung_tam",
        playTimes: [vnDateTime(1, "18:30")],
        status: "OPEN",
        note: "Tìm đối giao hữu sân 7, fair-play.",
      },
      // Previous games: 3 trận COMPLETED với tỷ số W/D/L.
      {
        creatorId: user.id,
        teamId: team.id,
        matchType: "FIND_OPPONENT",
        fieldType: "F7",
        skillTiers: ["AVERAGE"],
        area: "da_phuoc",
        playTimes: [vnDateTime(-3, "19:30")],
        status: "COMPLETED",
        homeScore: 3,
        awayScore: 1,
      },
      {
        creatorId: user.id,
        teamId: team.id,
        matchType: "FIND_OPPONENT",
        fieldType: "F5",
        skillTiers: ["WEAK", "BELOW_AVERAGE"],
        area: "hong_phuc",
        playTimes: [vnDateTime(-7, "20:30")],
        status: "COMPLETED",
        homeScore: 2,
        awayScore: 2,
      },
      {
        creatorId: user.id,
        teamId: team.id,
        matchType: "FIND_OPPONENT",
        fieldType: "F11",
        skillTiers: ["GOOD", "STRONG"],
        area: "trung_tam",
        playTimes: [vnDateTime(-14, "17:30")],
        status: "COMPLETED",
        homeScore: 1,
        awayScore: 4,
      },
    ],
  });

  // Tạo MatchRequest ACCEPTED cho 3 trận COMPLETED để resolve đối thủ.
  const completed = matches.filter((m) => m.status === "COMPLETED");
  await db.matchRequest.createMany({
    data: completed.map((m) => ({
      matchId: m.id,
      requesterId: opponent.id,
      requesterTeamId: opponentTeam.id,
      status: "ACCEPTED",
      message: "Đồng ý kèo",
    })),
  });

  // Tạo PlayerStat cho 3 trận COMPLETED: phân goals/assists cho các member.
  // [Minh, Tuấn, Hùng, Linh] — owner ghi 1 phần còn lại. Tổng goals khớp homeScore.
  const statPlan: Record<string, { goals: number; assists: number }[]> = {
    [mockMembers[0].id]: [ // Minh: trận 1 (3G), trận 2 (1G,1A), trận 3 (0G,1A)
      { goals: 3, assists: 0 },
      { goals: 1, assists: 1 },
      { goals: 0, assists: 1 },
    ],
    [mockMembers[1].id]: [ // Tuấn: (0G,1A), (1G,1A), (0G,0A)
      { goals: 0, assists: 1 },
      { goals: 1, assists: 1 },
      { goals: 0, assists: 0 },
    ],
    [mockMembers[2].id]: [ // Hùng: (0G,0A), (0G,0A), (1G,0A)
      { goals: 0, assists: 0 },
      { goals: 0, assists: 0 },
      { goals: 1, assists: 0 },
    ],
    [mockMembers[3].id]: [ // Linh: (0G,0A), (0G,0A), (0G,0A)
      { goals: 0, assists: 0 },
      { goals: 0, assists: 0 },
      { goals: 0, assists: 0 },
    ],
  };
  const playerStats: { matchId: string; teamId: string; userId: string; goals: number; assists: number }[] = [];
  for (const m of completed) {
    for (const mm of mockMembers) {
      const plan = statPlan[mm.id][completed.indexOf(m)];
      if (plan && (plan.goals > 0 || plan.assists > 0)) {
        playerStats.push({
          matchId: m.id,
          teamId: team.id,
          userId: mm.id,
          goals: plan.goals,
          assists: plan.assists,
        });
      }
    }
  }
  if (playerStats.length > 0) {
    await db.playerStat.createMany({ data: playerStats });
  }

  console.log(`✅ Tạo ${matches.length} kèo (1 next + ${completed.length} previous).`);
  console.log(`✅ Tạo ${playerStats.length} dòng PlayerStat cho leaderboard.`);
  console.log(`🔗 Mở /teams/${team.id} để xem Đội hình + Vua phá lưới.`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await db.$disconnect();
    process.exit(1);
  });
