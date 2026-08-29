import { getSupabaseClient } from "./supabase-client";

export const CONTENT_REPORT_REASONS = ["spam", "harassment", "sensitive", "copyright", "other"] as const;
export type ContentReportReason = typeof CONTENT_REPORT_REASONS[number];

export type BlockedUser = {
  readonly blockedUserId: string;
  readonly displayName: string;
  readonly createdAt: string;
};

type ReportInput = {
  readonly photoId: string;
  readonly reporterId: string;
  readonly reportedUserId: string;
  readonly reason: ContentReportReason;
  readonly details: string;
};

type InsertReport = (input: ReportInput) => Promise<{ readonly inserted: boolean; readonly error: unknown }>;
type InsertBlock = (blockerId: string, blockedId: string) => Promise<{ readonly inserted: boolean; readonly error: unknown }>;
type DeleteBlock = (blockedId: string) => Promise<{ readonly deleted: boolean; readonly error: unknown }>;
type FetchBlocks = (signal?: AbortSignal) => Promise<{ readonly rows: unknown; readonly error: unknown }>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const REPORT_ERROR = "신고를 접수하지 못했습니다.";
const BLOCK_ERROR = "사용자를 차단하지 못했습니다.";
const UNBLOCK_ERROR = "차단을 해제하지 못했습니다.";
const LOAD_BLOCKS_ERROR = "차단 목록을 불러오지 못했습니다.";

function isSafePhotoId(value: string): boolean {
  return /^[A-Za-z0-9._:-]{1,128}$/u.test(value) && !value.includes("..");
}

const defaultInsertReport: InsertReport = async (input) => {
  const { data, error } = await getSupabaseClient().from("content_reports").insert({
    photo_id: input.photoId,
    reporter_id: input.reporterId,
    reported_user_id: input.reportedUserId,
    reason: input.reason,
    details: input.details
  }).select("id").maybeSingle();
  return { inserted: data !== null, error };
};

const defaultInsertBlock: InsertBlock = async (blockerId, blockedId) => {
  const { data, error } = await getSupabaseClient().from("user_blocks").insert({ blocker_id: blockerId, blocked_id: blockedId }).select("blocked_id").maybeSingle();
  return { inserted: data !== null, error };
};

const defaultDeleteBlock: DeleteBlock = async (blockedId) => {
  const { data, error } = await getSupabaseClient().from("user_blocks").delete().eq("blocked_id", blockedId).select("blocked_id").maybeSingle();
  return { deleted: data !== null, error };
};

const defaultFetchBlocks: FetchBlocks = async (signal) => {
  let query = getSupabaseClient().from("user_blocks").select("blocked_id,blocked_display_name,created_at").order("created_at", { ascending: false });
  if (signal !== undefined) query = query.abortSignal(signal);
  const { data, error } = await query;
  return { rows: data, error };
};

export async function reportPublicPhoto(photoId: string, reporterId: string, reportedUserId: string, reason: ContentReportReason, details: string, insertReport: InsertReport = defaultInsertReport): Promise<void> {
  const normalizedDetails = details.trim();
  if (!isSafePhotoId(photoId) || !UUID_PATTERN.test(reporterId) || !UUID_PATTERN.test(reportedUserId) || reporterId === reportedUserId || !CONTENT_REPORT_REASONS.includes(reason) || normalizedDetails.length > 500) throw new Error(REPORT_ERROR);
  try {
    const result = await insertReport({ photoId, reporterId, reportedUserId, reason, details: normalizedDetails });
    if (result.error !== null || !result.inserted) throw new Error(REPORT_ERROR);
  } catch {
    throw new Error(REPORT_ERROR);
  }
}

export async function blockUser(blockerId: string, blockedId: string, insertBlock: InsertBlock = defaultInsertBlock): Promise<void> {
  if (!UUID_PATTERN.test(blockerId) || !UUID_PATTERN.test(blockedId) || blockerId === blockedId) throw new Error(BLOCK_ERROR);
  try {
    const result = await insertBlock(blockerId, blockedId);
    if (result.error !== null || !result.inserted) throw new Error(BLOCK_ERROR);
  } catch {
    throw new Error(BLOCK_ERROR);
  }
}

export async function unblockUser(blockedId: string, deleteBlock: DeleteBlock = defaultDeleteBlock): Promise<void> {
  if (!UUID_PATTERN.test(blockedId)) throw new Error(UNBLOCK_ERROR);
  try {
    const result = await deleteBlock(blockedId);
    if (result.error !== null || !result.deleted) throw new Error(UNBLOCK_ERROR);
  } catch {
    throw new Error(UNBLOCK_ERROR);
  }
}

export async function fetchBlockedUsers(signal?: AbortSignal, fetchRows: FetchBlocks = defaultFetchBlocks): Promise<BlockedUser[]> {
  try {
    const result = await fetchRows(signal);
    if (result.error !== null || !Array.isArray(result.rows)) throw new Error(LOAD_BLOCKS_ERROR);
    return result.rows.flatMap((value) => {
      if (typeof value !== "object" || value === null) return [];
      const row = value as Record<string, unknown>;
      if (typeof row["blocked_id"] !== "string" || !UUID_PATTERN.test(row["blocked_id"]) || typeof row["created_at"] !== "string" || Number.isNaN(Date.parse(row["created_at"]))) return [];
      const name = typeof row["blocked_display_name"] === "string" && row["blocked_display_name"].trim().length > 0 ? row["blocked_display_name"].trim().slice(0, 80) : "Ikkyee 여행자";
      return [{ blockedUserId: row["blocked_id"], displayName: name, createdAt: row["created_at"] }];
    });
  } catch (error) {
    if (signal?.aborted === true || (typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError")) throw error;
    throw new Error(LOAD_BLOCKS_ERROR);
  }
}
