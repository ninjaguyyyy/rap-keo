"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fieldTypeLabels,
  matchTypeLabels,
  skillTierLabels,
  timeSlotLabels,
} from "../labels";

const ALL = "all";

function FilterSelect({
  paramKey,
  allLabel,
  options,
  value,
  onChange,
}: {
  paramKey: string;
  allLabel: string;
  options: Record<string, string>;
  value: string;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <Select
      value={value || ALL}
      onValueChange={(v) => onChange(paramKey, v === ALL ? "" : String(v))}
    >
      <SelectTrigger className="h-10 w-auto">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {Object.entries(options).map(([val, label]) => (
          <SelectItem key={val} value={val}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function MatchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/matches?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <FilterSelect
        paramKey="matchType"
        allLabel="Mọi loại kèo"
        options={matchTypeLabels}
        value={searchParams.get("matchType") ?? ""}
        onChange={setParam}
      />
      <FilterSelect
        paramKey="fieldType"
        allLabel="Mọi loại sân"
        options={fieldTypeLabels}
        value={searchParams.get("fieldType") ?? ""}
        onChange={setParam}
      />
      <FilterSelect
        paramKey="skillTier"
        allLabel="Mọi trình độ"
        options={skillTierLabels}
        value={searchParams.get("skillTier") ?? ""}
        onChange={setParam}
      />
      <FilterSelect
        paramKey="timeSlot"
        allLabel="Mọi khung giờ"
        options={timeSlotLabels}
        value={searchParams.get("timeSlot") ?? ""}
        onChange={setParam}
      />
    </div>
  );
}
