// AI parser: từ text tự do (copy từ FB group) -> draft Match fields.
// Dùng Google Gemini (gemini-2.0-flash) với structured output (JSON mode).
// Server-only: gọi API key, không expose ra client.
import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import {
  matchTypeLabels,
  fieldTypeLabels,
  skillTierLabels,
  timeSlotLabels,
  areaLabels,
} from "./labels";
import type {
  FieldType,
  MatchSkillTier,
  MatchType,
} from "@/generated/prisma/enums";

// Draft trả về từ AI — mọi field optional, form tự apply nếu có.
export type MatchDraft = {
  matchType?: MatchType;
  fieldType?: FieldType;
  skillTiers?: MatchSkillTier[];
  area?: keyof typeof areaLabels;
  timeSlots?: string[]; // key slot (vd "1930") — form map thành playTimes
  hasField?: boolean;
  note?: string;
};

const VALID_MATCH_TYPES = Object.keys(matchTypeLabels) as MatchType[];
const VALID_FIELD_TYPES = Object.keys(fieldTypeLabels) as FieldType[];
const VALID_SKILL_TIERS = Object.keys(skillTierLabels) as MatchSkillTier[];
const VALID_AREAS = Object.keys(areaLabels);
const VALID_TIME_SLOTS = Object.keys(timeSlotLabels);

function getApiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.trim() === "") return undefined;
  return key;
}

// Model + config có thể override qua env (vd GEMINI_MODEL=gemini-2.5-flash).
const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
const GEMINI_MAX_TOKENS = Number(process.env.GEMINI_MAX_TOKENS) || undefined;
const GEMINI_TEMPERATURE = (() => {
  const raw = process.env.GEMINI_TEMPERATURE;
  if (!raw || raw.trim() === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
})();

// Sinh prompt mô tả mapping label -> enum để Gemini trả đúng giá trị hợp lệ.
function buildPrompt(rawText: string): string {
  const skillMap = VALID_SKILL_TIERS.map((k) => `${k}=${skillTierLabels[k]}`).join(", ");
  const areaMap = VALID_AREAS.map((k) => `${k}=${areaLabels[k]}`).join(", ");
  const slotMap = VALID_TIME_SLOTS.map((k) => `${k}=${timeSlotLabels[k]}`).join(", ");
  return `Bạn là trợ lý parse kèo bóng đá phủi. Từ text người dùng dán vào (copy từ group FB), trích ra các trường.struct của kèo (JSON).

Quy ước giá trị hợp lệ (CHỈ trả các giá trị này, nếu không rõ để null):
- matchType: 1 trong ${VALID_MATCH_TYPES.join(", ")} (Tìm đối=tìm đối thủ, Thiếu người=cần/thiếu người vào kèo, Có sân trống=có sân cho thuê/rảnh, Tìm đội=cá nhân rảnh tìm đội). Ví dụ "cần tìm kèo" = FIND_OPPONENT.
- fieldType: 1 trong ${VALID_FIELD_TYPES.join(", ")} ("sân 5"=F5, "sân 7"=F7, "sân 11"=F11).
- skillTiers: mảng trong ${VALID_SKILL_TIERS.join(", ")} (label: ${skillMap}). Ví dụ "trình Yếu" -> ["WEAK"].
- area: 1 trong ${VALID_AREAS.join(", ")} (label: ${areaMap}). "sân trung tâm" -> "trung_tam". Nếu text nhắc tên khác/không rõ -> null.
- timeSlots: mảng key slot (${slotMap}). Chỉ dùng giá trị này. "19h30" -> ["1930"], "16h30 và 20h30" -> ["1630","2030"]. Nếu text không có giờ rõ -> null.
- hasField: boolean true nếu text nói "đã có sân"/"có sẵn sân"/"đã đặt sân", false nếu "chưa có sân"/"tìm sân".
- note: tóm tắt ngắn gọn nội dung kèo (tiếng Việt), kèm "[N cầu rảnh] " ở đầu nếu matchType=LOOKING_FOR_TEAM và text nói số cầu rảnh (N=1 hoặc 2).

Trả JSON đúng schema, KHÔNG Markdown, KHÔNG giải thích. Text gốc:
"""
${rawText}
"""`;
}

// Thử parse JSON an toàn — Gemini có thể thừa/kém ký tự.
function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Thử bóc JSON trong markdown code fence.
    const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) {
      try {
        return JSON.parse(m[1]);
      } catch {
        /* swallow */
      }
    }
    return null;
  }
}

function coerceDraft(raw: unknown): MatchDraft {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const draft: MatchDraft = {};

  if (typeof obj.matchType === "string" && VALID_MATCH_TYPES.includes(obj.matchType as MatchType)) {
    draft.matchType = obj.matchType as MatchType;
  }
  if (typeof obj.fieldType === "string" && VALID_FIELD_TYPES.includes(obj.fieldType as FieldType)) {
    draft.fieldType = obj.fieldType as FieldType;
  }
  if (Array.isArray(obj.skillTiers)) {
    draft.skillTiers = obj.skillTiers.filter(
      (s): s is MatchSkillTier =>
        typeof s === "string" && VALID_SKILL_TIERS.includes(s as MatchSkillTier),
    );
    if (draft.skillTiers.length === 0) delete draft.skillTiers;
  }
  if (typeof obj.area === "string" && VALID_AREAS.includes(obj.area)) {
    draft.area = obj.area as keyof typeof areaLabels;
  }
  if (Array.isArray(obj.timeSlots)) {
    draft.timeSlots = obj.timeSlots.filter(
      (s): s is string => typeof s === "string" && VALID_TIME_SLOTS.includes(s),
    );
    if (draft.timeSlots.length === 0) delete draft.timeSlots;
  }
  if (typeof obj.hasField === "boolean") draft.hasField = obj.hasField;
  if (typeof obj.note === "string" && obj.note.trim()) draft.note = obj.note.trim();

  return draft;
}

/**
 * Parse text tự do -> MatchDraft (các field match). Trả {} nếu:
 * - Không có GEMINI_API_KEY (log cảnh báo, không crash).
 * - Lỗi gọi API / parse JSON.
 * Caller (form) apply draft vào state; user có thể sửa trước khi submit.
 */
export async function parseMatchFromText(text: string): Promise<MatchDraft> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("[ai-parser] GEMINI_API_KEY chưa cấu hình — bỏ qua parse AI.");
    return {};
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: buildPrompt(text),
      config: {
        responseMimeType: "application/json",
        // Schema nới lỏng (tất cả optional) để AI không bị ép buộc bịa giá trị.
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchType: { type: Type.STRING, nullable: true },
            fieldType: { type: Type.STRING, nullable: true },
            skillTiers: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
            area: { type: Type.STRING, nullable: true },
            timeSlots: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
            hasField: { type: Type.BOOLEAN, nullable: true },
            note: { type: Type.STRING, nullable: true },
          },
        },
        temperature: GEMINI_TEMPERATURE,
        ...(GEMINI_MAX_TOKENS ? { maxOutputTokens: GEMINI_MAX_TOKENS } : {}),
      },
    });

    const text2 = response.text;
    if (!text2) return {};
    return coerceDraft(safeParseJson(text2));
  } catch (err) {
    console.error("[ai-parser] Lỗi parse:", err);
    return {};
  }
}
