import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

// Liệt kê các đội user thuộc về: là chủ đội (ownerId) HOẶC là thành viên
// (TeamMember). Sort mới nhất trước. Dùng cho trang "Đội của tôi" (/teams).
export async function listMyTeams(userId: string) {
  return db.team.findMany({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    orderBy: { createdAt: "desc" },
  });
}

export type MyTeamItem = Awaited<ReturnType<typeof listMyTeams>>[number];

// Lấy 1 đội cho trang chi tiết /teams/[id]. Viewer phải là chủ đội hoặc thành
// viên — nếu không (hoặc đội không tồn tại) trả null -> route render notFound().
// Kèm owner.name để tab "Tổng quan" hiển thị chủ đội.
// Bọc React cache(): layout + page cùng gọi trong 1 request -> chỉ 1 query DB.
export const getTeamById = cache(async (id: string, userId: string) => {
  return db.team.findFirst({
    where: {
      id,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    include: { owner: { select: { id: true, name: true } } },
  });
});

export type TeamDetail = NonNullable<Awaited<ReturnType<typeof getTeamById>>>;
