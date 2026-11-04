"use client";

import { useState, useTransition } from "react";
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
import { updateMatchNeededPlayers } from "../actions";
import type { UpdateMatchNeededPlayersState } from "../schemas";

export function EditNeededPlayersDialog({
  matchId,
  currentValue,
}: Readonly<{
  matchId: string;
  currentValue: number | null;
}>) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState<string>(
    currentValue != null ? String(currentValue) : "",
  );
  const [state, setState] = useState<UpdateMatchNeededPlayersState>({});

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setValue(currentValue != null ? String(currentValue) : "");
      setState({});
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" className="h-9 px-3 text-sm" />}>
        Sửa thiếu người
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cập nhật số cầu còn thiếu</DialogTitle>
          <DialogDescription>
            Chỉ áp dụng cho kèo thiếu người. Giá trị hợp lệ từ 1 đến 30.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const fd = new FormData(event.currentTarget);
            startTransition(async () => {
              const result = await updateMatchNeededPlayers(state, fd);
              setState(result);
              if (result.ok) {
                setOpen(false);
              }
            });
          }}
        >
          <input type="hidden" name="matchId" value={matchId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="neededPlayers">Thiếu bao nhiêu cầu?</Label>
            <Input
              id="neededPlayers"
              name="neededPlayers"
              type="number"
              min={1}
              max={30}
              step={1}
              inputMode="numeric"
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="VD: 2"
              className="h-11"
            />
            {state.fieldErrors?.neededPlayers ? (
              <p className="text-sm text-destructive">{state.fieldErrors.neededPlayers}</p>
            ) : null}
          </div>

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <Button type="submit" disabled={pending} className="h-10">
            {pending ? "Đang lưu..." : "Lưu"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
