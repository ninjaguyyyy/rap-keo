"use client";

// Form tạo/sửa đội — dùng chung cho CreateTeamDialog + EditTeamDialog.
// - Không truyền `team` -> tạo mới (action mặc định createTeam).
// - Truyền `team` + action=updateTeam -> sửa (id đi qua hidden input).
// useActionState: server action trả { ok } / { error } / { fieldErrors }.
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { teamSkillTierLabels } from "../labels";
import { areaLabels } from "@/features/matches/labels";
import { createTeam } from "../actions";
import type { TeamFormState } from "../schemas";
import type { SkillTier } from "@/generated/prisma/enums";

const initialState: TeamFormState = {};

// Trình độ để chọn (giữ key enum làm value, label tiếng Việt). 7 mức, no ANY.
const SKILL_OPTIONS = Object.entries(teamSkillTierLabels) as [SkillTier, string][];

// Khu vực hoạt động: chọn từ list sân cố định (label làm value luôn, khớp với
// cách feature matches lưu `area`). Không cho nhập tự do.
const AREA_OPTIONS = Object.values(areaLabels);

type TeamFormProps = {
  team?: {
    id: string;
    name: string;
    skillTier: SkillTier;
    homeArea?: string | null;
    coverUrl?: string | null;
  };
  action?: (prev: TeamFormState, formData: FormData) => Promise<TeamFormState>;
  onSuccess?: () => void;
};

export function TeamForm({ team, action, onSuccess }: TeamFormProps) {
  const [state, formAction, pending] = useActionState(
    action ?? createTeam,
    initialState,
  );
  // Controlled: name, skillTier, homeArea. Default từ team khi sửa.
  const [name, setName] = useState<string>(team?.name ?? "");
  const [skillTier, setSkillTier] = useState<SkillTier>(
    team?.skillTier ?? "AVERAGE",
  );
  const [homeArea, setHomeArea] = useState<string>(team?.homeArea ?? "");

  // Tạo/sửa xong -> đóng dialog. Ở lại /teams; revalidatePath làm mới list.
  useEffect(() => {
    if (state.ok) onSuccess?.();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* id ẩn khi sửa — updateTeam đọc từ đây. */}
      {team ? <input type="hidden" name="id" value={team.id} /> : null}

      {/* Tên đội */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="team-name">Tên đội</Label>
        <Input
          id="team-name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          placeholder="VD: FC Sấm Sét"
          required
          aria-invalid={!!state.fieldErrors?.name}
        />
        {state.fieldErrors?.name ? (
          <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
        ) : null}
      </div>

      {/* Trình độ */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="team-skill">Trình độ</Label>
        {/* Giá trị thật submit qua hidden input (Base UI Select không tự gắn name). */}
        <input type="hidden" name="skillTier" value={skillTier} />
        <Select
          value={skillTier}
          onValueChange={(v) => setSkillTier(v as SkillTier)}
        >
          <SelectTrigger id="team-skill" className="w-full">
            <SelectValue>{teamSkillTierLabels[skillTier]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SKILL_OPTIONS.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.fieldErrors?.skillTier ? (
          <p className="text-sm text-destructive">
            {state.fieldErrors.skillTier}
          </p>
        ) : null}
      </div>

      {/* Khu vực (tùy chọn) — chọn từ list sân, không nhập tự do. */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="team-area">
          Khu vực hoạt động{" "}
          <span className="font-normal text-ink-subtle">(tùy chọn)</span>
        </Label>
        {/* Giá trị thật submit qua hidden input (Base UI Select không tự gắn name). */}
        <input type="hidden" name="homeArea" value={homeArea} />
        <Select value={homeArea} onValueChange={(v) => setHomeArea(String(v))}>
          <SelectTrigger id="team-area" className="w-full">
            <SelectValue placeholder="Chọn khu vực / sân">
              {homeArea || undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {AREA_OPTIONS.map((label) => (
              <SelectItem key={label} value={label}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.fieldErrors?.homeArea ? (
          <p className="text-sm text-destructive">
            {state.fieldErrors.homeArea}
          </p>
        ) : null}
      </div>

      {/* Ảnh bìa (tùy chọn, chỉ sửa). Native <input type="file"> trong <form action>
          -> Next.js server action nhận File tự động qua formData.get("cover"). */}
      {team ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="team-cover">
            Ảnh bìa{" "}
            <span className="font-normal text-ink-subtle">(tùy chọn, tối đa 5MB)</span>
          </Label>
          {team.coverUrl ? (
            <p className="text-xs text-ink-subtle">
              Đã có ảnh bìa. Chọn ảnh mới để thay.
            </p>
          ) : null}
          <Input
            id="team-cover"
            name="cover"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Chọn ảnh bìa"
          />
        </div>
      ) : null}

      {/* Lỗi chung */}
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={pending} className="h-11 w-full text-base">
        {pending ? "Đang lưu..." : team ? "Lưu đội" : "Tạo đội"}
      </Button>
    </form>
  );
}
