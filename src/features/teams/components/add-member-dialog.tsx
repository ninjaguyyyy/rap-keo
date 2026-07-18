"use client";

// Dialog thêm thành viên — owner nhập SĐT tìm user đã đăng ký. Mirror
// CreateTeamDialog (Dialog render prop) + form useActionState (như team-form).
import { useActionState, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addTeamMember } from "../actions";
import type { AddMemberState } from "../schemas";

const initialState: AddMemberState = {};

export function AddMemberDialog({ teamId }: { teamId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    addTeamMember,
    initialState,
  );
  const [phone, setPhone] = useState("");

  // Thêm xong -> đóng dialog + reset input. revalidatePath làm mới list.
  // Side-effect có chủ đích: sync kết quả server action (state.ok) về UI state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      setPhone("");
    }
  }, [state]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="h-9 px-3 text-sm" />}>
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Thêm thành viên
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Thêm thành viên</DialogTitle>
          <DialogDescription>
            Nhập số điện thoại của người đã có tài khoản để thêm vào đội.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="teamId" value={teamId} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="member-phone">Số điện thoại</Label>
            <Input
              id="member-phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="VD: 0912345678"
              required
              aria-invalid={!!state.fieldErrors?.phone}
            />
            {state.fieldErrors?.phone ? (
              <p className="text-sm text-destructive">
                {state.fieldErrors.phone}
              </p>
            ) : null}
          </div>

          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}

          <Button
            type="submit"
            disabled={pending}
            className="h-11 w-full text-base"
          >
            {pending ? "Đang thêm..." : "Thêm vào đội"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
