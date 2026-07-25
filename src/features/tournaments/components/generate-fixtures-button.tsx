"use client";

// Nút "Tạo lịch đấu" / "Sinh lại lịch" ở tab Trận đấu. Hai chế độ:
// - hasFixtures=false: nút brand "Tạo lịch đấu" -> gọi generateTournamentFixtures.
// - hasFixtures=true: nút outline "Sinh lại lịch" -> dialog confirm -> gọi
//   regenerateTournamentFixtures. Disable khi hasCompletedMatch (mất kết quả đã ghi).
// Mirror StartTournamentButton (useTransition + inline err) + RemoveParticipantButton
// (Dialog confirm pattern).
import { useState, useTransition } from "react";
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
import {
  generateTournamentFixtures,
  regenerateTournamentFixtures,
} from "../actions";

export function GenerateFixturesButton({
  tournamentId,
  hasFixtures,
  hasCompletedMatch,
}: {
  tournamentId: string;
  hasFixtures: boolean;
  hasCompletedMatch: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | undefined>();

  if (!hasFixtures) {
    return (
      <>
        {err ? (
          <p className="w-full text-sm text-destructive">{err}</p>
        ) : null}
        <Button
          size="sm"
          disabled={pending}
          onClick={() => {
            setErr(undefined);
            startTransition(async () => {
              const res = await generateTournamentFixtures(tournamentId);
              if (!res.ok) setErr(res.error ?? "Không sinh được lịch.");
            });
          }}
        >
          {pending ? "Đang sinh lịch..." : "Tạo lịch đấu"}
        </Button>
      </>
    );
  }

  // Đã có fixture -> "Sinh lại lịch" (confirm dialog). Disable khi có match COMPLETED.
  const disabled = pending || hasCompletedMatch;
  return (
    <>
      {err ? (
        <p className="w-full text-sm text-destructive">{err}</p>
      ) : null}
      <Dialog>
        <DialogTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              title={
                hasCompletedMatch
                  ? "Không sinh lại được khi đã có trận đá xong."
                  : undefined
              }
            />
          }
        >
          {pending ? "Đang sinh lại..." : "Sinh lại lịch"}
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Sinh lại lịch đấu?</DialogTitle>
            <DialogDescription>
              Toàn bộ trận hiện tại (chưa đá) sẽ bị xóa và sinh lại theo danh sách
              đội hiện tại. Lịch đã chỉnh ngày giờ/sân sẽ mất.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose render={<Button variant="outline" />}>Hủy</DialogClose>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                setErr(undefined);
                startTransition(async () => {
                  const res = await regenerateTournamentFixtures(tournamentId);
                  if (!res.ok) setErr(res.error ?? "Không sinh lại được lịch.");
                });
              }}
            >
              {pending ? "Đang sinh lại..." : "Sinh lại"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
