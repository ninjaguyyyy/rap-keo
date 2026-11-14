"use client";

// Card đội trong trang "Đội của tôi" (/teams). Avatar + tên + trình độ + khu vực.
// Tên/avatar link sang /teams/[id]. Chủ đội thấy nút Sửa/Xóa ở footer.
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { teamSkillTierLabels } from "../labels";
import type { MyTeamItem } from "../queries";
import { TeamAvatar } from "./team-avatar";
import { resolveTeamPrimaryColorHex } from "../colors";

export function TeamCard({
  team,
}: Readonly<{
  team: MyTeamItem;
}>) {
  const primaryColorHex = resolveTeamPrimaryColorHex(team.primaryColor);

  return (
    <Card className="relative gap-0 overflow-hidden rounded-[1.8rem] border-0 p-0 shadow-[0_16px_28px_-22px_rgba(42,6,52,0.65)]">
      <div className="absolute inset-0" aria-hidden="true">
        <div
          className="h-full w-full bg-[url('/scoreboard-header-light.svg')] bg-cover bg-center opacity-100"
          style={{ backgroundColor: primaryColorHex }}
        />
      </div>
      <div className="absolute inset-0 bg-black/12" aria-hidden="true" />

      <div className="relative flex flex-col p-4 text-white">
        <div className="flex items-start gap-3">
          <Link href={`/teams/${team.id}`} className="inline-flex">
            <TeamAvatar
              name={team.name}
              imageUrl={team.logoUrl}
              size="lg"
              className="h-20 w-20 rounded-full! border border-white/35 bg-white/10 p-2 shadow-sm"
            />
          </Link>
        </div>

        <div className="mt-3 min-w-0">
          <Link href={`/teams/${team.id}`} className="block min-w-0">
            <p className="truncate text-[24px] leading-[1.05] font-black tracking-[-0.02em] text-white drop-shadow-[0_2px_10px_rgba(24,0,30,0.35)]">
              {team.name}
            </p>
          </Link>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] leading-6 text-white/92">
            <span className="inline-flex items-center gap-1.5">
              <Image
                src="/stadium.svg"
                alt=""
                width={22}
                height={22}
                className="opacity-95 invert"
              />
              {team.homeArea ?? "Chưa cập nhật khu vực"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Image
                src="/soccer-ball-variant.png"
                alt=""
                width={18}
                height={18}
                className="opacity-95 brightness-0 invert"
              />
              {teamSkillTierLabels[team.skillTier]}
            </span>
          </div>
        </div>
      </div>

    </Card>
  );
}
