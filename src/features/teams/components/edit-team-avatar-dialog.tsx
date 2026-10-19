"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateTeamLogo, type TeamLogoActionState } from "../actions";

const initialState: TeamLogoActionState = {};

export function EditTeamAvatarDialog({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [state, formAction, pending] = useActionState(
    updateTeamLogo,
    initialState,
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      setFileInputKey((prev) => prev + 1);
      router.refresh();
    }
  }, [router, state.ok]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="absolute -bottom-1 -right-1 rounded-full border border-white/70 bg-white/95 text-ink shadow-sm hover:bg-white"
            aria-label="Đổi avatar đội"
          />
        }
      >
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
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cập nhật avatar đội</DialogTitle>
          <DialogDescription>
            Chọn ảnh JPG, PNG hoặc WebP (tối đa 5MB).
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={teamId} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`team-logo-${teamId}`}>Ảnh avatar đội</Label>
            <Input
              key={fileInputKey}
              id={`team-logo-${teamId}`}
              name="logo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              aria-label="Chọn ảnh avatar đội"
            />
          </div>

          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}

          <Button type="submit" disabled={pending} className="h-10">
            {pending ? "Đang tải ảnh..." : "Lưu avatar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
