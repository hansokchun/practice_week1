import { getSupabaseClient } from "./supabase-client";

export type OwnedPhotoPatch = {
  readonly description: string;
  readonly visibility: "private" | "public";
  readonly locationPrecision: "approximate" | "exact";
};

export type SavedOwnedPhotoPatch = OwnedPhotoPatch;

type OwnedPhotoDatabasePatch = {
  readonly description: string;
  readonly visibility: "private" | "public";
  readonly shared: boolean;
  readonly location_precision: "approximate" | "exact";
};

type MutateOwnedPhoto = (
  photoId: string,
  ownerId: string,
  patch: OwnedPhotoDatabasePatch
) => Promise<{ readonly row: unknown; readonly error: unknown }>;

const GENERIC_MUTATION_ERROR = "사진을 수정하지 못했습니다.";

function validOwnerId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function validPhotoId(value: string): boolean {
  return /^[A-Za-z0-9._:-]{1,128}$/u.test(value) && !value.includes("..");
}

const defaultMutation: MutateOwnedPhoto = async (photoId, ownerId, patch) => {
  const { data, error } = await getSupabaseClient()
    .from("photos")
    .update(patch)
    .eq("id", photoId)
    .eq("owner_id", ownerId)
    .select("description,visibility,location_precision")
    .maybeSingle();
  return { row: data, error };
};

export async function updateOwnedPhoto(
  photoId: string,
  ownerId: string,
  patch: OwnedPhotoPatch,
  mutate: MutateOwnedPhoto = defaultMutation
): Promise<SavedOwnedPhotoPatch> {
  const description = patch.description.trim();
  if (!validPhotoId(photoId) || !validOwnerId(ownerId) || description.length > 2000 ||
    !["private", "public"].includes(patch.visibility) ||
    !["approximate", "exact"].includes(patch.locationPrecision)) {
    throw new Error(GENERIC_MUTATION_ERROR);
  }
  try {
    const result = await mutate(photoId, ownerId, {
      description,
      visibility: patch.visibility,
      shared: patch.visibility === "public",
      location_precision: patch.locationPrecision
    });
    if (result.error !== null || typeof result.row !== "object" || result.row === null) {
      throw new Error(GENERIC_MUTATION_ERROR);
    }
    const row = result.row as Record<string, unknown>;
    if (typeof row["description"] !== "string" || row["visibility"] !== patch.visibility ||
      row["location_precision"] !== patch.locationPrecision) {
      throw new Error(GENERIC_MUTATION_ERROR);
    }
    return {
      description: row["description"],
      visibility: row["visibility"],
      locationPrecision: row["location_precision"]
    } as SavedOwnedPhotoPatch;
  } catch {
    throw new Error(GENERIC_MUTATION_ERROR);
  }
}
