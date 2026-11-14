"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CheckIcon, SlidersHorizontalIcon } from "lucide-react";
import { teamSkillTierLabels } from "../labels";

export function TeamsFiltersSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMyTeamsActive, setIsMyTeamsActive] = useState(true);
  const selectedSkillTier = searchParams.get("skillTier") ?? "";

  function setSkillTier(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("skillTier", value);
    } else {
      params.delete("skillTier");
    }
    router.push(params.toString() ? `/teams?${params.toString()}` : "/teams");
  }

  return (
    <section className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8.5! w-8.5 shrink-0 rounded-[8px]! border-[0.1rem] border-[#a68da8] bg-transparent text-brand"
          aria-label="Bộ lọc"
        >
          <SlidersHorizontalIcon className="size-4" aria-hidden="true" />
        </Button>

        <Select
          value={selectedSkillTier || "all"}
          onValueChange={(value) => setSkillTier(value === "all" ? "" : String(value))}
        >
          <SelectTrigger className="h-8.5! min-w-28 shrink-0 rounded-[8px]! border-[0.1rem] border-[#a68da8] bg-transparent px-3 py-2 text-sm font-medium text-brand [&>svg]:size-5">
            <SelectValue placeholder="Trình độ">
              {selectedSkillTier
                ? teamSkillTierLabels[selectedSkillTier as keyof typeof teamSkillTierLabels]
                : "Trình độ"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi trình độ</SelectItem>
            {Object.entries(teamSkillTierLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          onClick={() => setIsMyTeamsActive((prev) => !prev)}
          aria-pressed={isMyTeamsActive}
          className={cn(
            "h-8.5! min-w-28 shrink-0 justify-center rounded-[8px]! border-[0.1rem] border-[#a68da8] px-3 py-2 text-sm font-medium",
            isMyTeamsActive
              ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-transparent text-brand",
          )}
        >
          <span
            className={cn(
              "inline-flex size-4 items-center justify-center rounded-full border border-current",
              isMyTeamsActive ? "bg-primary-foreground/15" : "bg-transparent",
            )}
            aria-hidden="true"
          >
            <CheckIcon
              className={cn(
                "size-3 transition-opacity",
                isMyTeamsActive ? "opacity-100" : "opacity-0",
              )}
            />
          </span>
          <span>Đội của tôi</span>
        </Button>
      </div>

      <h2 className="mt-6 font-sans text-[20px] leading-none font-extrabold tracking-[-0.03em] text-brand">
        Khu vực Đà Nẵng
      </h2>
    </section>
  );
}
