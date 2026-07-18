"use client";

// Card "Đội hình" — list thành viên của đội. Owner có nút thêm thành viên
// (AddMemberDialog) ở header và nút xóa (RemoveMemberButton) cho mỗi MEMBER.
// Owner luôn hiện đầu list (query sort role desc) và không có nút xóa.
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { teamRoleLabels } from "../labels";
import type { TeamMemberItem } from "../queries";
import { TeamAvatar } from "./team-avatar";
import { AddMemberDialog } from "./add-member-dialog";
import { RemoveMemberButton } from "./remove-member-button";

export function MemberList({
  teamId,
  members,
  canManage,
}: {
  teamId: string;
  members: TeamMemberItem[];
  canManage: boolean;
}) {
  return (
    <Card className="gap-0 p-0">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">
          Đội hình
        </h2>
        {canManage ? <AddMemberDialog teamId={teamId} /> : null}
      </div>

      <ul className="flex flex-col divide-y divide-line">
        {members.map((m) => {
          const name = m.user.name ?? m.user.phone ?? "—";
          const isOwner = m.role === "OWNER";
          return (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3">
              <TeamAvatar name={name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {name}
                </p>
                {m.user.phone ? (
                  <p className="truncate text-xs text-ink-subtle">
                    {m.user.phone}
                  </p>
                ) : null}
              </div>
              <Badge variant={isOwner ? "secondary" : "outline"}>
                {teamRoleLabels[m.role]}
              </Badge>
              {canManage && !isOwner ? (
                <RemoveMemberButton
                  teamId={teamId}
                  userId={m.userId}
                  memberName={name}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
