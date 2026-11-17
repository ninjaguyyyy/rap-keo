"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateTeamSocialLinks } from "../actions";
import type { TeamSocialLinksState } from "../schemas";

const initialState: TeamSocialLinksState = {};

export function EditTeamSocialLinksDialog({
  teamId,
  facebookUrl,
  tiktokUrl,
}: Readonly<{
  teamId: string;
  facebookUrl?: string | null;
  tiktokUrl?: string | null;
}>) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateTeamSocialLinks,
    initialState,
  );

  useEffect(() => {
    if (!state.ok) return;
    const timer = setTimeout(() => setOpen(false), 0);
    return () => clearTimeout(timer);
  }, [state.ok]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="icon-sm" />}>
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
        <span className="sr-only">Sửa link mạng xã hội</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sửa link mạng xã hội</DialogTitle>
          <DialogDescription>
            Dán link Facebook và TikTok của đội để hiển thị ở trang chi tiết.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={teamId} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="team-facebook-link">Facebook</Label>
            <Input
              id="team-facebook-link"
              name="facebookUrl"
              defaultValue={facebookUrl ?? ""}
              placeholder="https://facebook.com/..."
              aria-invalid={Boolean(state.fieldErrors?.facebookUrl)}
            />
            {state.fieldErrors?.facebookUrl ? (
              <p className="text-sm text-destructive">{state.fieldErrors.facebookUrl}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="team-tiktok-link">TikTok</Label>
            <Input
              id="team-tiktok-link"
              name="tiktokUrl"
              defaultValue={tiktokUrl ?? ""}
              placeholder="https://www.tiktok.com/@..."
              aria-invalid={Boolean(state.fieldErrors?.tiktokUrl)}
            />
            {state.fieldErrors?.tiktokUrl ? (
              <p className="text-sm text-destructive">{state.fieldErrors.tiktokUrl}</p>
            ) : null}
          </div>

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <Button type="submit" disabled={pending} className="h-10 w-full">
            {pending ? "Đang lưu..." : "Lưu"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
