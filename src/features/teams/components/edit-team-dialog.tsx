"use client";

// Dialog sửa thông tin đội — mở từ TeamCard (list) hoặc tab Tổng quan (detail).
// Prefill từ prop `team`, submit qua action updateTeam (id đi kèm hidden input).
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TeamForm } from "./team-form";
import { updateTeam } from "../actions";
import type { SkillTier } from "@/generated/prisma/enums";

export function EditTeamDialog({
  team,
}: {
  team: {
    id: string;
    name: string;
    skillTier: SkillTier;
    homeArea?: string | null;
    coverUrl?: string | null;
  };
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        Sửa
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sửa thông tin đội</DialogTitle>
          <DialogDescription>
            Cập nhật tên, trình độ hoặc khu vực hoạt động của đội.
          </DialogDescription>
        </DialogHeader>

        <TeamForm
          team={team}
          action={updateTeam}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
