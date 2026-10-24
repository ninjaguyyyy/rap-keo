"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setInternalMatchSquadSide } from "../actions";

const SIDE_OPTIONS: { value: "SIDE_A" | "SIDE_B"; label: string }[] = [
  { value: "SIDE_A", label: "Bên A" },
  { value: "SIDE_B", label: "Bên B" },
];

export function InternalSquadSideButtons({
  matchId,
  userId,
  side,
}: {
  matchId: string;
  userId: string;
  side: "SIDE_A" | "SIDE_B";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function handleSetSide(nextSide: "SIDE_A" | "SIDE_B") {
    setError(undefined);
    startTransition(async () => {
      const result = await setInternalMatchSquadSide(matchId, userId, nextSide);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error ?? "Không cập nhật được bên thi đấu.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        {SIDE_OPTIONS.map((option) => {
          const active = side === option.value;
          return (
            <Button
              key={option.value}
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              className={cn(
                "h-8 border-line px-2.5 text-xs",
                active ? "border-brand bg-brand-soft text-brand" : "text-ink-muted",
              )}
              onClick={() => handleSetSide(option.value)}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
