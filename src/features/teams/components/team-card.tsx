"use client";

// Card đội trong trang "Đội của tôi" (/teams). Avatar + tên + trình độ + khu vực.
// Tên/avatar link sang /teams/[id]. Chủ đội thấy nút Sửa/Xóa ở footer.
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPinIcon } from "@/features/matches/components/card-shared";
import { teamSkillTierLabels } from "../labels";
import type { MyTeamItem } from "../queries";
import { TeamAvatar } from "./team-avatar";
import { EditTeamDialog } from "./edit-team-dialog";
import { DeleteTeamButton } from "./delete-team-button";

export function TeamCard({
  team,
  canManage,
}: {
  team: MyTeamItem;
  canManage: boolean;
}) {
  return (
    <Card className="gap-0 p-0">
      <div className="flex items-center gap-3 p-4">
        {/* Vùng avatar + tên/khu vực link sang chi tiết. */}
        <Link
          href={`/teams/${team.id}`}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <TeamAvatar name={team.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-ink">{team.name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">
                {teamSkillTierLabels[team.skillTier]}
              </Badge>
              {canManage ? (
                <Badge variant="outline">Đội trưởng</Badge>
              ) : null}
            </div>
            {team.homeArea ? (
              <p className="mt-1 inline-flex items-center gap-1 text-sm text-ink-muted">
                <MapPinIcon />
                {team.homeArea}
              </p>
            ) : null}
          </div>
        </Link>
      </div>

      {/* Footer action — chỉ chủ đội. */}
      {canManage ? (
        <div className="flex justify-end gap-1.5 border-t border-line px-4 py-2.5">
          <EditTeamDialog team={team} />
          <DeleteTeamButton team={team} />
        </div>
      ) : null}
    </Card>
  );
}
