import { randomUUID } from "expo-crypto";

import { containsPublicationJpegMetadata } from "./publication-jpeg-sanitizer";
import { getSupabaseClient } from "./supabase-client";

export const AVATAR_BUCKET = "avatars";
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export type EditableProfile = {
  readonly nickname: string;
  readonly bio: string;
  readonly avatarPath: string | null;
  readonly avatarUrl: string | null;
};

export type AvatarChange =
  | { readonly kind: "keep" }
  | { readonly kind: "remove" }
  | { readonly kind: "replace"; readonly bytes: Uint8Array };

export type EditableProfileInput = {
  readonly userId: string;
  readonly nickname: string;
  readonly bio: string;
  readonly currentAvatarPath: string | null;
  readonly avatarChange: AvatarChange;
};

export type SavedEditableProfile = EditableProfile & { readonly cleanupPending: boolean };

type ProfileRowResult = { readonly row: unknown; readonly error: unknown };
type ObjectResult = { readonly uploaded?: boolean; readonly removed?: boolean; readonly error: unknown };

type FetchDependencies = {
  readonly fetchRow: (userId: string, signal?: AbortSignal) => Promise<ProfileRowResult>;
  readonly publicAvatarUrl: (path: string) => string | null;
};

type SaveDependencies = {
  readonly createAvatarId: () => string;
  readonly uploadAvatar: (path: string, bytes: Uint8Array) => Promise<ObjectResult>;
  readonly updateRow: (userId: string, patch: { readonly nickname: string; readonly bio: string; readonly avatar_path?: string }) => Promise<ProfileRowResult>;
  readonly removeAvatar: (path: string) => Promise<ObjectResult>;
  readonly publicAvatarUrl: (path: string) => string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const AVATAR_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const LOAD_ERROR = "프로필을 불러오지 못했습니다.";
const SAVE_ERROR = "프로필을 저장하지 못했습니다.";

function abortError(): Error {
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}

export function isManagedAvatarPath(value: unknown, userId: string): value is string {
  if (typeof value !== "string" || !UUID_PATTERN.test(userId)) return false;
  const escaped = userId.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`^${escaped}/avatar-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.jpg$`, "iu").test(value);
}

function normalizedFields(nickname: string, bio: string) {
  const normalizedNickname = nickname.trim();
  const normalizedBio = bio.trim();
  if (normalizedNickname.length === 0) throw new Error("이름을 입력해 주세요.");
  if (normalizedNickname.length > 40) throw new Error("이름은 40자 이하로 입력해 주세요.");
  if (normalizedBio.length > 300) throw new Error("소개는 300자 이하로 입력해 주세요.");
  return { nickname: normalizedNickname, bio: normalizedBio };
}

function avatarUrl(path: string | null, legacyUrl: unknown, publicAvatarUrl: (path: string) => string | null) {
  if (path !== null) {
    const managedUrl = publicAvatarUrl(path);
    return isHttpUrl(managedUrl) ? managedUrl : null;
  }
  return isHttpUrl(legacyUrl) ? legacyUrl : null;
}

const defaultFetchDependencies: FetchDependencies = {
  async fetchRow(userId, signal) {
    let query = getSupabaseClient().from("profiles").select("nickname,bio,avatar_url,avatar_path").eq("id", userId);
    if (signal !== undefined) query = query.abortSignal(signal);
    const { data, error } = await query.maybeSingle();
    return { row: data, error };
  },
  publicAvatarUrl(path) {
    const { data } = getSupabaseClient().storage.from(AVATAR_BUCKET).getPublicUrl(path);
    return isHttpUrl(data.publicUrl) ? data.publicUrl : null;
  }
};

const defaultSaveDependencies: SaveDependencies = {
  createAvatarId: randomUUID,
  async uploadAvatar(path, bytes) {
    const { data, error } = await getSupabaseClient().storage.from(AVATAR_BUCKET).upload(path, bytes, {
      cacheControl: "31536000",
      contentType: "image/jpeg",
      upsert: false
    });
    return { uploaded: data !== null, error };
  },
  async updateRow(userId, patch) {
    const { data, error } = await getSupabaseClient().from("profiles").upsert({ id: userId, ...patch }, { onConflict: "id" })
      .select("nickname,bio,avatar_url,avatar_path").single();
    return { row: data, error };
  },
  async removeAvatar(path) {
    const { data, error } = await getSupabaseClient().storage.from(AVATAR_BUCKET).remove([path]);
    return { removed: Array.isArray(data) && data.some((entry) => entry.name === path || path.endsWith(`/${entry.name}`)), error };
  },
  publicAvatarUrl: defaultFetchDependencies.publicAvatarUrl
};

export async function fetchEditableProfile(
  userId: string,
  signal?: AbortSignal,
  dependencies: FetchDependencies = defaultFetchDependencies
): Promise<EditableProfile> {
  if (!UUID_PATTERN.test(userId)) throw new Error(LOAD_ERROR);
  if (signal?.aborted === true) throw abortError();
  try {
    const result = await dependencies.fetchRow(userId, signal);
    if (result.error !== null || typeof result.row !== "object" || result.row === null) throw new Error(LOAD_ERROR);
    const row = result.row as Record<string, unknown>;
    const fields = normalizedFields(typeof row["nickname"] === "string" ? row["nickname"] : "", typeof row["bio"] === "string" ? row["bio"] : "");
    const path = isManagedAvatarPath(row["avatar_path"], userId) ? row["avatar_path"] : null;
    return { ...fields, avatarPath: path, avatarUrl: avatarUrl(path, row["avatar_url"], dependencies.publicAvatarUrl) };
  } catch (error) {
    const aborted = signal?.aborted ?? false;
    if (aborted || (typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError")) throw abortError();
    throw new Error(LOAD_ERROR);
  }
}

export async function saveEditableProfile(input: EditableProfileInput, dependencies: SaveDependencies = defaultSaveDependencies): Promise<SavedEditableProfile> {
  if (!UUID_PATTERN.test(input.userId) || (input.currentAvatarPath !== null && !isManagedAvatarPath(input.currentAvatarPath, input.userId))) throw new Error(SAVE_ERROR);
  const fields = normalizedFields(input.nickname, input.bio);
  let nextPath = input.currentAvatarPath;
  let uploadedPath: string | null = null;

  if (input.avatarChange.kind === "replace") {
    if (input.avatarChange.bytes.byteLength === 0 || input.avatarChange.bytes.byteLength > MAX_AVATAR_BYTES) throw new Error("프로필 사진은 2MB 이하로 선택해 주세요.");
    try {
      if (containsPublicationJpegMetadata(input.avatarChange.bytes)) throw new Error(SAVE_ERROR);
    } catch { throw new Error("안전한 JPEG 프로필 사진을 선택해 주세요."); }
    const avatarId = dependencies.createAvatarId();
    if (!AVATAR_ID_PATTERN.test(avatarId)) throw new Error(SAVE_ERROR);
    uploadedPath = `${input.userId}/avatar-${avatarId}.jpg`;
    let upload: ObjectResult;
    try {
      upload = await dependencies.uploadAvatar(uploadedPath, input.avatarChange.bytes);
    } catch {
      throw new Error(SAVE_ERROR);
    }
    if (upload.error !== null || upload.uploaded !== true) throw new Error(SAVE_ERROR);
    nextPath = uploadedPath;
  } else if (input.avatarChange.kind === "remove") {
    nextPath = null;
  }

  const patch = { ...fields, ...(input.avatarChange.kind === "keep" ? {} : { avatar_path: nextPath ?? "" }) };
  let updated: ProfileRowResult;
  try {
    updated = await dependencies.updateRow(input.userId, patch);
  } catch {
    updated = { row: null, error: new Error(SAVE_ERROR) };
  }
  if (updated.error !== null || typeof updated.row !== "object" || updated.row === null) {
    if (uploadedPath !== null) await dependencies.removeAvatar(uploadedPath).catch(() => undefined);
    throw new Error(SAVE_ERROR);
  }

  let cleanupPending = false;
  if (input.currentAvatarPath !== null && input.currentAvatarPath !== nextPath) {
    try {
      const removed = await dependencies.removeAvatar(input.currentAvatarPath);
      cleanupPending = removed.error !== null || removed.removed !== true;
    } catch { cleanupPending = true; }
  }
  return { ...fields, avatarPath: nextPath, avatarUrl: nextPath === null ? null : avatarUrl(nextPath, null, dependencies.publicAvatarUrl), cleanupPending };
}
