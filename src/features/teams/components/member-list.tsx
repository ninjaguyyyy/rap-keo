"use client";

// Card "Đội hình" — list thành viên của đội. Owner có nút thêm thành viên
// (AddMemberDialog), sửa cầu thủ (EditMemberDialog), và xóa MEMBER.
// Owner luôn hiện đầu list (query sort role desc) và không có nút xóa.
import { Card } from "@/components/ui/card";
import type { TeamMemberItem } from "../queries";
import { TeamAvatar } from "./team-avatar";
import { AddMemberDialog } from "./add-member-dialog";
import { EditMemberDialog } from "./edit-member-dialog";
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
          const jerseyText = m.jerseyNumber != null ? String(m.jerseyNumber) : "—";
          const hometownText = m.user.hometown?.trim() ?? "";
          return (
            <li key={m.id} className="flex items-start gap-3 px-4 py-3">
              <TeamAvatar
                name={name}
                imageUrl={m.user.avatarUrl}
                size="lg"
                className="h-14 w-14 rounded-2xl text-xl"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xl font-bold text-ink">{name}</p>
                <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-medium text-ink-muted">
                  <span className="shrink-0">{jerseyText}</span>
                  {hometownText ? (
                    <>
                      <span aria-hidden="true" className="shrink-0">•</span>
                      <span aria-label="Cờ Việt Nam" className="shrink-0">🇻🇳</span>
                      <span className="min-w-0 truncate">{hometownText}</span>
                    </>
                  ) : null}
                </p>
              </div>
              {canManage ? (
                <div className="flex shrink-0 items-center gap-1 pt-0.5">
                  <EditMemberDialog
                    teamId={teamId}
                    userId={m.userId}
                    currentName={m.user.name}
                    currentHometown={m.user.hometown}
                    displayName={name}
                    jerseyNumber={m.jerseyNumber}
                  />
                  {!isOwner ? (
                    <RemoveMemberButton
                      teamId={teamId}
                      userId={m.userId}
                      memberName={name}
                    />
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
