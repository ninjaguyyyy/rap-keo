"use client";

// Form tạo/sửa giải — dùng chung cho CreateTournamentDialog + EditTournamentDialog.
// - Không truyền `tournament` -> tạo mới (action mặc định createTournament).
// - Truyền `tournament` + action=updateTournament -> sửa (id hidden input).
// useActionState: server action trả { ok } / { error } / { fieldErrors } / { id }.
// onSuccessState: callback nhận state mới sau mỗi lần submit — để dialog cha đọc
// state.id rồi redirect (mirror pattern useEffect trên state.ok ở team-form).
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AreaCombobox } from "@/features/matches/components/area-combobox";
import { fieldTypeLabels } from "@/features/matches/labels";
import { teamSkillTierLabels } from "@/features/teams/labels";
import { createTournament } from "../actions";
import type { TournamentFormState } from "../schemas";
import type {
  FieldType,
  SkillTier,
  TournamentFormat,
} from "@/generated/prisma/enums";

const initialState: TournamentFormState = {};

const FIELD_OPTIONS = Object.entries(fieldTypeLabels) as [FieldType, string][];
const SKILL_OPTIONS = Object.entries(teamSkillTierLabels) as [SkillTier, string][];

type TournamentFormProps = {
  tournament?: {
    id: string;
    name: string;
    fieldType: FieldType;
    format: TournamentFormat;
    skillTier?: SkillTier | null;
    area?: string | null;
    description?: string | null;
    bannerUrl?: string | null;
  };
  // Lock cấu trúc sau APPROVED — chỉ cho sửa description/area/banner.
  locked?: boolean;
  action?: (prev: TournamentFormState, formData: FormData) => Promise<TournamentFormState>;
  onSuccess?: () => void;
  onSuccessState?: (state: TournamentFormState) => void;
};

export function TournamentForm({
  tournament,
  locked = false,
  action,
  onSuccess,
  onSuccessState,
}: TournamentFormProps) {
  const [state, formAction, pending] = useActionState(
    action ?? createTournament,
    initialState,
  );

  const [name, setName] = useState<string>(tournament?.name ?? "");
  const [fieldType, setFieldType] = useState<FieldType>(
    tournament?.fieldType ?? "F7",
  );
  const [skillTier, setSkillTier] = useState<SkillTier | "">(
    tournament?.skillTier ?? "",
  );
  const [area, setArea] = useState<string>(tournament?.area ?? "");
  const [description, setDescription] = useState<string>(
    tournament?.description ?? "",
  );

  // Tạo/sửa xong -> đóng dialog (onSuccess) + truyền state ra dialog cha (id).
  useEffect(() => {
    if (state.ok) {
      onSuccess?.();
      onSuccessState?.(state);
    }
  }, [state, onSuccess, onSuccessState]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {tournament ? <input type="hidden" name="id" value={tournament.id} /> : null}
      {/* format ẩn MVP: chỉ LEAGUE. */}
      <input type="hidden" name="format" value="LEAGUE" />
      {/* fieldType submit qua hidden (Base UI Select không tự gắn name) — locked thì
          vẫn submit giá trị hiện tại để server parse không lỗi. */}
      <input type="hidden" name="fieldType" value={fieldType} />

      {/* Tên giải */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tournament-name">Tên giải</Label>
        <Input
          id="tournament-name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="VD: Giải giao hữu sân 7 Quận 7"
          required
          disabled={locked}
          aria-invalid={!!state.fieldErrors?.name}
        />
        {state.fieldErrors?.name ? (
          <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
        ) : null}
      </div>

      {/* Loại sân */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tournament-field">Loại sân</Label>
        <Select
          value={fieldType}
          onValueChange={(v) => setFieldType(v as FieldType)}
          disabled={locked}
        >
          <SelectTrigger id="tournament-field" className="h-11 w-full">
            <SelectValue>{fieldTypeLabels[fieldType]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {FIELD_OPTIONS.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.fieldErrors?.fieldType ? (
          <p className="text-sm text-destructive">
            {state.fieldErrors.fieldType}
          </p>
        ) : null}
      </div>

      {/* Thể thức (MVP: chỉ LEAGUE — hiện read-only). */}
      <div className="flex flex-col gap-1.5">
        <Label>Thể thức</Label>
        <div className="flex h-11 items-center rounded-lg border border-line bg-surface-muted px-3 text-sm font-semibold text-ink-muted">
          Đãi vòng tròn (1 lượt)
        </div>
      </div>

      {/* Trình độ mong muốn (tùy chọn). */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tournament-skill">
          Trình độ mong muốn{" "}
          <span className="font-normal text-ink-subtle">(tùy chọn)</span>
        </Label>
        <input type="hidden" name="skillTier" value={skillTier} />
        <Select
          value={skillTier}
          onValueChange={(v) => setSkillTier(v as SkillTier | "")}
          disabled={locked}
        >
          <SelectTrigger id="tournament-skill" className="h-11 w-full">
            <SelectValue placeholder="Chọn trình độ">
              {skillTier ? teamSkillTierLabels[skillTier] : "Mọi trình độ"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Mọi trình độ</SelectItem>
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

      {/* Khu vực (tùy chọn) — autocomplete gợi ý 4 sân. */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tournament-area">
          Khu vực{" "}
          <span className="font-normal text-ink-subtle">(tùy chọn)</span>
        </Label>
        <AreaCombobox name="area" value={area} onChange={setArea} />
        {state.fieldErrors?.area ? (
          <p className="text-sm text-destructive">{state.fieldErrors.area}</p>
        ) : null}
      </div>

      {/* Mô tả (tùy chọn). */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tournament-description">
          Mô tả{" "}
          <span className="font-normal text-ink-subtle">(tùy chọn)</span>
        </Label>
        <Textarea
          id="tournament-description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="VD: Giải giao hữu, fair-play, quỹ thưởng nhỏ..."
          className="text-base"
        />
        {state.fieldErrors?.description ? (
          <p className="text-sm text-destructive">
            {state.fieldErrors.description}
          </p>
        ) : null}
      </div>

      {/* Ảnh bìa (tùy chọn, chỉ sửa). */}
      {tournament ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tournament-banner">
            Ảnh bìa{" "}
            <span className="font-normal text-ink-subtle">
              (tùy chọn, tối đa 5MB)
            </span>
          </Label>
          {tournament.bannerUrl ? (
            <p className="text-xs text-ink-subtle">
              Đã có ảnh bìa. Chọn ảnh mới để thay.
            </p>
          ) : null}
          <Input
            id="tournament-banner"
            name="banner"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Chọn ảnh bìa"
          />
        </div>
      ) : null}

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={pending} className="h-11 w-full text-base">
        {pending
          ? "Đang lưu..."
          : tournament
            ? "Lưu giải"
            : "Tạo giải"}
      </Button>
    </form>
  );
}
