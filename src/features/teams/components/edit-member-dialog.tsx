"use client";

import { useActionState, useEffect, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateTeamMember } from "../actions";
import type { UpdateTeamMemberState } from "../schemas";

const initialState: UpdateTeamMemberState = {};

export function EditMemberDialog({
  teamId,
  userId,
  currentName,
  currentHometown,
  displayName,
  jerseyNumber,
}: {
  teamId: string;
  userId: string;
  currentName: string | null;
  currentHometown: string | null;
  displayName: string;
  jerseyNumber: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [nameValue, setNameValue] = useState<string>(currentName ?? "");
  const [hometownValue, setHometownValue] = useState<string>(currentHometown ?? "");
  const [jerseyValue, setJerseyValue] = useState<string>(
    jerseyNumber != null ? String(jerseyNumber) : "",
  );
  const [state, formAction, pending] = useActionState(updateTeamMember, initialState);

  // Side-effects có chủ đích: sync dữ liệu hiện tại khi mở dialog + đóng khi lưu xong.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setNameValue(currentName ?? "");
      setHometownValue(currentHometown ?? "");
      setJerseyValue(jerseyNumber != null ? String(jerseyNumber) : "");
    }
  }, [open, currentName, currentHometown, jerseyNumber]);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
    }
  }, [state.ok]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-ink-subtle hover:text-ink"
            aria-label={`Edit cầu thủ ${displayName}`}
          />
        }
      >
        Edit cầu thủ
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit cầu thủ</DialogTitle>
          <DialogDescription>
            Chỉnh tên, quê quán và số áo cho &ldquo;{displayName}&rdquo;.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="userId" value={userId} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`member-name-${userId}`}>Tên cầu thủ</Label>
            <Input
              id={`member-name-${userId}`}
              name="name"
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              placeholder={displayName}
              aria-invalid={!!state.fieldErrors?.name}
            />
            {state.fieldErrors?.name ? (
              <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`member-hometown-${userId}`}>Quê quán (tùy chọn)</Label>
            <Input
              id={`member-hometown-${userId}`}
              name="hometown"
              type="text"
              value={hometownValue}
              onChange={(e) => setHometownValue(e.target.value)}
              placeholder="VD: Đà Nẵng"
              aria-invalid={!!state.fieldErrors?.hometown}
            />
            {state.fieldErrors?.hometown ? (
              <p className="text-sm text-destructive">{state.fieldErrors.hometown}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`member-jersey-${userId}`}>Số áo (tùy chọn)</Label>
            <Input
              id={`member-jersey-${userId}`}
              name="jerseyNumber"
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              placeholder="VD: 10"
              value={jerseyValue}
              onChange={(e) => setJerseyValue(e.target.value)}
              aria-invalid={!!state.fieldErrors?.jerseyNumber}
            />
            {state.fieldErrors?.jerseyNumber ? (
              <p className="text-sm text-destructive">{state.fieldErrors.jerseyNumber}</p>
            ) : null}
          </div>

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose render={<Button variant="outline" />}>Hủy</DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
