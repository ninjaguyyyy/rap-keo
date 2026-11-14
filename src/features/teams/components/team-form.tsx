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
import { createTeam } from "../actions";
import { AreaCombobox } from "@/features/matches/components/area-combobox";
import type { TeamFormState } from "../schemas";
import type { SkillTier } from "@/generated/prisma/enums";
import {
  DEFAULT_TEAM_PRIMARY_COLOR,
  teamPrimaryColorOptions,
  type TeamPrimaryColor,
} from "../colors";

const initialState: TeamFormState = {};

// Trình độ để chọn (giữ key enum làm value, label tiếng Việt). 7 mức, no ANY.
const SKILL_OPTIONS = Object.entries(teamSkillTierLabels) as [SkillTier, string][];

type TeamFormProps = {
  team?: {
    id: string;
    name: string;
    skillTier: SkillTier;
    primaryColor?: string | null;
    homeArea?: string | null;
    coverUrl?: string | null;
  };
  action?: (prev: TeamFormState, formData: FormData) => Promise<TeamFormState>;
  onSuccess?: () => void;
};

export function TeamForm({ team, action, onSuccess }: Readonly<TeamFormProps>) {
  const [state, formAction, pending] = useActionState(
    action ?? createTeam,
    initialState,
  );
  // Controlled: name, skillTier, homeArea. Default từ team khi sửa.
  const [name, setName] = useState<string>(team?.name ?? "");
  const [skillTier, setSkillTier] = useState<SkillTier>(
    team?.skillTier ?? "AVERAGE",
  );
  const [primaryColor, setPrimaryColor] = useState<TeamPrimaryColor>(
    (team?.primaryColor as TeamPrimaryColor | undefined) ??
      DEFAULT_TEAM_PRIMARY_COLOR,
  );
  const [homeArea, setHomeArea] = useState<string>(team?.homeArea ?? "");

  // Tạo/sửa xong -> đóng dialog. Ở lại /teams; revalidatePath làm mới list.
  useEffect(() => {
    if (state.ok) onSuccess?.();
  }, [state, onSuccess]);

  let submitLabel = "Tạo đội";
  if (team) {
    submitLabel = "Lưu đội";
  }
  if (pending) {
    submitLabel = "Đang lưu...";
  }

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

      {/* Màu chủ đạo card đội */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="team-primary-color">Màu chủ đạo</Label>
        <input type="hidden" name="primaryColor" value={primaryColor} />
        <Select
          value={primaryColor}
          onValueChange={(v) => setPrimaryColor(v as TeamPrimaryColor)}
        >
          <SelectTrigger id="team-primary-color" className="w-full">
            <SelectValue>
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full border border-line"
                  style={{
                    backgroundColor:
                      teamPrimaryColorOptions.find((option) => option.value === primaryColor)
                        ?.hex ?? "#37003C",
                  }}
                />
                {teamPrimaryColorOptions.find((option) => option.value === primaryColor)
                  ?.label ?? "Tím đậm"}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {teamPrimaryColorOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full border border-line"
                    style={{ backgroundColor: option.hex }}
                  />
                  {option.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.fieldErrors?.primaryColor ? (
          <p className="text-sm text-destructive">{state.fieldErrors.primaryColor}</p>
        ) : null}
      </div>

      {/* Khu vực (tùy chọn) — autocomplete gợi ý 4 sân + cho nhập free text.
          Dùng chung AreaCombobox với match (filter theo label, submit text qua
          hidden input name="homeArea"). */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="team-area">
          Khu vực hoạt động{" "}
          <span className="font-normal text-ink-subtle">(tùy chọn)</span>
        </Label>
        <AreaCombobox name="homeArea" value={homeArea} onChange={setHomeArea} />
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
        {submitLabel}
      </Button>
    </form>
  );
}
