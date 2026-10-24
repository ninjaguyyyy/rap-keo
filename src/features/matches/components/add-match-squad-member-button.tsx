"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addMatchSquadMember } from "../actions";

type AddableMember = {
  userId: string;
  name: string;
};

export function AddMatchSquadMemberButton({
  matchId,
  options,
}: {
  matchId: string;
  options: AddableMember[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const hasOptions = options.length > 0;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setUserId("");
      setError(undefined);
    }
  }

  function handleAdd() {
    if (!userId) {
      setError("Chọn cầu thủ để thêm vào danh sách tham gia.");
      return;
    }

    setError(undefined);
    startTransition(async () => {
      const result = await addMatchSquadMember(matchId, userId);
      if (!result.ok) {
        setError(result.error ?? "Không thêm được cầu thủ. Thử lại nhé.");
        return;
      }
      setOpen(false);
      setUserId("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2.5 text-xs"
            disabled={!hasOptions}
          />
        }
      >
        Thêm cầu thủ
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Thêm cầu thủ tham gia trận</DialogTitle>
          <DialogDescription>
            Chọn một thành viên đội để thêm lại vào danh sách tham gia.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Select value={userId} onValueChange={(value) => setUserId(String(value))}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Chọn cầu thủ" />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.userId} value={option.userId}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="button" disabled={pending || !userId} onClick={handleAdd}>
            {pending ? "Đang thêm..." : "Thêm vào trận"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
