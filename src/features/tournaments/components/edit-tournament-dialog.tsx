"use client";

// Dialog sửa giải — mở từ TournamentDetailTabs (tab Tổng quan). Prefill từ prop
// `tournament`. Lock field cấu trúc khi status APPROVED/COMPLETED (chỉ sửa
// description/area/banner).
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
import { TournamentForm } from "./tournament-form";
import { updateTournament } from "../actions";
import type {
  FieldType,
  SkillTier,
  TournamentFormat,
  TournamentStatus,
} from "@/generated/prisma/enums";

export function EditTournamentDialog({
  tournament,
}: {
  tournament: {
    id: string;
    name: string;
    fieldType: FieldType;
    format: TournamentFormat;
    skillTier?: SkillTier | null;
    area?: string | null;
    description?: string | null;
    bannerUrl?: string | null;
    status: TournamentStatus;
  };
}) {
  const [open, setOpen] = useState(false);
  const locked = tournament.status === "COMPLETED";

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
        Sửa giải
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sửa thông tin giải</DialogTitle>
          <DialogDescription>
            {locked
              ? "Giải đã duyệt — chỉ sửa được mô tả, khu vực và ảnh bìa."
              : "Cập nhật thông tin giải trước khi gửi duyệt."}
          </DialogDescription>
        </DialogHeader>
        <TournamentForm
          tournament={tournament}
          locked={locked}
          action={updateTournament}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
