"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { randomizeInternalMatchSquad } from "../actions";

export function RandomizeInternalSquadButton({
  matchId,
  disabled = false,
}: {
  matchId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function handleRandomize() {
    setError(undefined);
    startTransition(async () => {
      const result = await randomizeInternalMatchSquad(matchId);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error ?? "Không chia lại đội hình được.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8"
        disabled={pending || disabled}
        onClick={handleRandomize}
      >
        {pending ? "Đang chia..." : "Random cân bằng A/B"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
