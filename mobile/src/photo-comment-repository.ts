import { getSupabaseClient } from "./supabase-client";

export type PhotoComment = {
  readonly id: number;
  readonly text: string;
  readonly date: string;
  readonly author: { readonly id: string; readonly displayName: string };
};

type QueryResult = { readonly rows: unknown; readonly error: unknown };
type SingleResult = { readonly row: unknown; readonly error: unknown };

type FetchDependencies = {
  readonly fetchComments: (photoId: string, signal?: AbortSignal) => Promise<QueryResult>;
  readonly fetchProfiles: (authorIds: readonly string[], signal?: AbortSignal) => Promise<QueryResult>;
};

type CreateDependencies = {
  readonly insertComment: (photoId: string, authorId: string, text: string) => Promise<SingleResult>;
  readonly fetchProfile: (authorId: string) => Promise<SingleResult>;
};

type RemoveComment = (commentId: number) => Promise<{ readonly deleted: boolean; readonly error: unknown }>;

const LOAD_ERROR = "댓글을 불러오지 못했습니다.";
const CREATE_ERROR = "댓글을 작성하지 못했습니다.";
const DELETE_ERROR = "댓글을 삭제하지 못했습니다.";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function isSafePhotoId(value: string): boolean {
  return /^[A-Za-z0-9._:-]{1,128}$/u.test(value) && !value.includes("..");
}

function abortError(): Error {
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted === true) throw abortError();
}

function displayName(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim().slice(0, 80) : "Ikkyee 여행자";
}

function parseComment(row: unknown, names: ReadonlyMap<string, string>): PhotoComment | null {
  if (typeof row !== "object" || row === null) return null;
  const record = row as Record<string, unknown>;
  if (!Number.isInteger(record["id"]) || Number(record["id"]) <= 0 ||
      typeof record["text"] !== "string" || record["text"].trim().length === 0 || record["text"].length > 1000 ||
      typeof record["date"] !== "string" || Number.isNaN(Date.parse(record["date"])) ||
      typeof record["author_id"] !== "string" || !UUID_PATTERN.test(record["author_id"])) return null;
  const authorId = record["author_id"];
  return { id: Number(record["id"]), text: record["text"], date: record["date"], author: { id: authorId, displayName: names.get(authorId) ?? "Ikkyee 여행자" } };
}

const defaultFetchDependencies: FetchDependencies = {
  async fetchComments(photoId, signal) {
    let query = getSupabaseClient().from("comments").select("id,text,date,author_id").eq("photo_id", photoId).order("date", { ascending: true }).limit(100);
    if (signal !== undefined) query = query.abortSignal(signal);
    const { data, error } = await query;
    return { rows: data, error };
  },
  async fetchProfiles(authorIds, signal) {
    if (authorIds.length === 0) return { rows: [], error: null };
    let query = getSupabaseClient().from("profiles").select("id,nickname").in("id", [...authorIds]);
    if (signal !== undefined) query = query.abortSignal(signal);
    const { data, error } = await query;
    return { rows: data, error };
  }
};

const defaultCreateDependencies: CreateDependencies = {
  async insertComment(photoId, authorId, text) {
    const { data, error } = await getSupabaseClient().from("comments").insert({ photo_id: photoId, author_id: authorId, text }).select("id,text,date,author_id").single();
    return { row: data, error };
  },
  async fetchProfile(authorId) {
    const { data, error } = await getSupabaseClient().from("profiles").select("nickname").eq("id", authorId).maybeSingle();
    return { row: data, error };
  }
};

const defaultRemoveComment: RemoveComment = async (commentId) => {
  const { data, error } = await getSupabaseClient().from("comments").delete().eq("id", commentId).select("id").maybeSingle();
  return { deleted: data !== null, error };
};

export async function fetchPhotoComments(photoId: string, signal?: AbortSignal, dependencies: FetchDependencies = defaultFetchDependencies): Promise<PhotoComment[]> {
  if (!isSafePhotoId(photoId)) throw new Error(LOAD_ERROR);
  try {
    throwIfAborted(signal);
    const commentsResult = await dependencies.fetchComments(photoId, signal);
    if (commentsResult.error !== null || !Array.isArray(commentsResult.rows)) throw new Error(LOAD_ERROR);
    const authorIds: string[] = [];
    for (const row of commentsResult.rows) {
      if (typeof row !== "object" || row === null) continue;
      const authorId = (row as Record<string, unknown>)["author_id"];
      if (typeof authorId === "string" && !authorIds.includes(authorId)) authorIds.push(authorId);
    }
    const profileResult = await dependencies.fetchProfiles(authorIds, signal);
    throwIfAborted(signal);
    if (profileResult.error !== null || !Array.isArray(profileResult.rows)) throw new Error(LOAD_ERROR);
    const names = new Map<string, string>();
    for (const row of profileResult.rows) {
      if (typeof row === "object" && row !== null) {
        const profile = row as Record<string, unknown>;
        if (typeof profile["id"] === "string") names.set(profile["id"], displayName(profile["nickname"]));
      }
    }
    return commentsResult.rows.map((row) => parseComment(row, names)).filter((comment): comment is PhotoComment => comment !== null);
  } catch (error) {
    if (signal?.aborted === true || (typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError")) throw abortError();
    throw new Error(LOAD_ERROR);
  }
}

export async function createPhotoComment(photoId: string, authorId: string, text: string, dependencies: CreateDependencies = defaultCreateDependencies): Promise<PhotoComment> {
  const normalizedText = text.trim();
  if (!isSafePhotoId(photoId) || !UUID_PATTERN.test(authorId) || normalizedText.length < 1 || normalizedText.length > 1000) throw new Error(CREATE_ERROR);
  try {
    const [insertResult, profileResult] = await Promise.all([
      dependencies.insertComment(photoId, authorId, normalizedText),
      dependencies.fetchProfile(authorId)
    ]);
    if (insertResult.error !== null) throw new Error(CREATE_ERROR);
    const profile = typeof profileResult.row === "object" && profileResult.row !== null ? profileResult.row as Record<string, unknown> : {};
    const parsed = parseComment(insertResult.row, new Map([[authorId, displayName(profile["nickname"])]]));
    if (parsed === null) throw new Error(CREATE_ERROR);
    return parsed;
  } catch {
    throw new Error(CREATE_ERROR);
  }
}

export async function deletePhotoComment(commentId: number, removeComment: RemoveComment = defaultRemoveComment): Promise<void> {
  if (!Number.isInteger(commentId) || commentId <= 0) throw new Error(DELETE_ERROR);
  try {
    const result = await removeComment(commentId);
    if (result.error !== null || !result.deleted) throw new Error(DELETE_ERROR);
  } catch {
    throw new Error(DELETE_ERROR);
  }
}
