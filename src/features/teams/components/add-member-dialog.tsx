"use client";

// Dialog thêm thành viên — 2 chế độ: "Theo tên" (khách, chỉ tên) hoặc "Theo SĐT"
// (user đã đăng ký). Mirror CreateTeamDialog (Dialog render prop) + form
// useActionState (như team-form). Segmented toggle ở đầu dialog chọn chế độ.
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
import { cn } from "@/lib/utils";
import { addTeamMember } from "../actions";
import type { AddMemberState } from "../schemas";

const initialState: AddMemberState = {};

type Mode = "name" | "phone";

export function AddMemberDialog({ teamId }: { teamId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    addTeamMember,
    initialState,
  );
  const [mode, setMode] = useState<Mode>("name");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Thêm xong -> đóng dialog + reset input. revalidatePath làm mới list.
  // Side-effect có chủ đích: sync kết quả server action (state.ok) về UI state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      setName("");
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
            Thêm bạn vào đội bằng tên (không cần tài khoản) hoặc số điện thoại
            (nếu đã đăng ký).
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="mode" value={mode} />

          {/* Segmented toggle 2 chế độ. */}
          <div
            role="group"
            aria-label="Cách thêm thành viên"
            className="grid grid-cols-2 gap-1 rounded-lg bg-surface-muted p-1"
          >
            <ToggleButton active={mode === "name"} onClick={() => setMode("name")}>
              Theo tên
            </ToggleButton>
            <ToggleButton active={mode === "phone"} onClick={() => setMode("phone")}>
              Theo SĐT
            </ToggleButton>
          </div>

          {mode === "name" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="member-name">Tên thành viên</Label>
              <Input
                id="member-name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                placeholder="VD: Tuấn Anh"
                required
                aria-invalid={!!state.fieldErrors?.name}
              />
              {state.fieldErrors?.name ? (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.name}
                </p>
              ) : null}
            </div>
          ) : (
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
          )}

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

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-9 rounded-md text-sm font-semibold transition-colors",
        active
          ? "bg-surface text-ink shadow-sm"
          : "text-ink-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
