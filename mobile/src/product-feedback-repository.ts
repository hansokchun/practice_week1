import { getSupabaseClient } from "./supabase-client";

export const feedbackCategories = ["bug", "usability", "feature_request", "other"] as const;
export type FeedbackCategory = typeof feedbackCategories[number];

export type FeedbackDraft = {
  readonly category?: FeedbackCategory;
  readonly contactAllowed?: boolean;
  readonly message: string;
  readonly pagePath?: string;
  readonly rating?: number | null;
};

type FeedbackRow = {
  readonly user_id: string;
  readonly category: FeedbackCategory;
  readonly contact_allowed: boolean;
  readonly message: string;
  readonly page_path: string;
  readonly rating: number | null;
  readonly status: "received";
};

type SubmitDependencies = {
  readonly insert: (row: FeedbackRow) => Promise<{ readonly inserted: boolean; readonly error: unknown }>;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SUBMIT_ERROR = "의견을 보내지 못했어요. 잠시 후 다시 시도해 주세요.";

function truncate(value: unknown, limit: number): string {
  return String(value ?? "").trim().slice(0, limit);
}

export function normalizeFeedbackDraft(draft: FeedbackDraft) {
  const category = feedbackCategories.includes(draft.category ?? "usability")
    ? draft.category ?? "usability"
    : "usability";
  const rating = Number(draft.rating);
  return {
    category,
    contact_allowed: draft.contactAllowed === true,
    message: truncate(draft.message, 1000),
    page_path: truncate(draft.pagePath, 200),
    rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null
  };
}

const defaultDependencies: SubmitDependencies = {
  async insert(row) {
    const { error } = await getSupabaseClient().from("product_feedback").insert(row);
    return { inserted: error === null, error };
  }
};

export async function submitProductFeedback(
  userId: string,
  draft: FeedbackDraft,
  dependencies: SubmitDependencies = defaultDependencies
): Promise<void> {
  const normalized = normalizeFeedbackDraft(draft);
  if (!UUID_PATTERN.test(userId) || normalized.message.length < 3) throw new Error(SUBMIT_ERROR);
  try {
    const result = await dependencies.insert({ user_id: userId, ...normalized, status: "received" });
    if (result.error !== null || result.inserted !== true) throw new Error(SUBMIT_ERROR);
  } catch {
    throw new Error(SUBMIT_ERROR);
  }
}
