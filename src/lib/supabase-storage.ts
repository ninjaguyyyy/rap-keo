// Supabase Storage client (server-only). Dùng service_role để upload/xoá file
// bypass RLS. File này chứa admin key — KHÔNG import từ client component.
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const SUPABASE_TEAM_BUCKET =
  process.env.SUPABASE_TEAM_BUCKET ?? "team-assets";

// Singleton trên globalThis — mirror src/lib/db.ts để tránh tạo nhiều client
// khi Next.js dev hot-reload.
const globalForSupabase = globalThis as unknown as {
  supabaseAdmin?: SupabaseClient;
};

function getAdminClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY chưa cấu hình. Xem .env.example.",
    );
  }
  return (globalForSupabase.supabaseAdmin ??= createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  ));
}

// Kết quả upload: storage path + public URL.
export type UploadResult = { path: string; publicUrl: string };

// Upload 1 file làm ảnh bìa đội. Path: team-assets/{teamId}/{uuid}.{ext}.
// Upsert true: trùng tên thì ghi đè (không xảy ra vì uuid trong path).
export async function uploadTeamCover(
  file: File,
  teamId: string,
): Promise<UploadResult> {
  const supabase = getAdminClient();
  // Lấy ext từ tên file, fallback "webp". Trim ký tự lạ.
  const rawExt = file.name.split(".").pop() ?? "webp";
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "webp";
  const path = `${teamId}/${crypto.randomUUID()}.${ext}`;
  const body = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from(SUPABASE_TEAM_BUCKET)
    .upload(path, body, {
      contentType: file.type,
      upsert: true,
      cacheControl: "3600",
    });
  if (error) throw error;
  const { data } = supabase.storage
    .from(SUPABASE_TEAM_BUCKET)
    .getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

// Xoá 1 ảnh bìa cũ từ URL lưu DB. Parse path sau "/public/<bucket>/" trong URL.
// Best-effort: lỗi chỉ log, không ném ra ngoài.
export async function deleteTeamCover(storedUrl: string): Promise<void> {
  try {
    const supabase = getAdminClient();
    const marker = `/public/${SUPABASE_TEAM_BUCKET}/`;
    const idx = storedUrl.indexOf(marker);
    if (idx === -1) return;
    const path = storedUrl.slice(idx + marker.length).split("?")[0];
    if (!path) return;
    await supabase.storage.from(SUPABASE_TEAM_BUCKET).remove([path]);
  } catch (err) {
    console.warn("deleteTeamCover (non-fatal):", err);
  }
}
