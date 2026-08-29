import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";

const status = spawnSync("npx", ["supabase", "status", "--workdir", "..", "-o", "env"], {
  encoding: "utf8"
});
if (status.status !== 0) throw new Error("Local Supabase services are required");
const environment = new Map(status.stdout.split(/\r?\n/u).flatMap((line) => {
  const match = /^([A-Z0-9_]+)="?(.*?)"?$/u.exec(line.trim());
  return match === null ? [] : [[match[1], match[2].replace(/"$/u, "")]];
}));
const url = environment.get("API_URL");
const anonKey = environment.get("ANON_KEY");
const serviceKey = environment.get("SERVICE_ROLE_KEY");
if (url === undefined || anonKey === undefined || serviceKey === undefined) {
  throw new Error("Local Supabase credentials are unavailable");
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const password = `Local-${randomUUID()}-A1!`;
const targetEmail = `delete-target-${randomUUID()}@example.invalid`;
const otherEmail = `delete-other-${randomUUID()}@example.invalid`;
const targetPhotoId = `delete-target-${randomUUID()}`;
const otherPhotoId = `delete-other-${randomUUID()}`;
let targetId;
let otherId;
let targetPhotoPath;
let targetAvatarPath;
let otherPhotoPath;
let otherAvatarPath;
let createdPhotosBucket = false;

async function invoke(token, confirmation) {
  return fetch(`${url}/functions/v1/delete-account`, {
    method: "POST",
    headers: {
      "apikey": anonKey,
      "authorization": `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ confirmation })
  });
}

async function count(table, column, value) {
  const result = await admin.from(table).select("*", { count: "exact", head: true }).eq(column, value);
  if (result.error !== null) throw new Error(`Could not verify ${table} cleanup`);
  return result.count;
}

try {
  const buckets = await admin.storage.listBuckets();
  if (buckets.error !== null) throw new Error("Could not inspect local Storage buckets");
  if (!buckets.data.some((bucket) => bucket.id === "photos")) {
    const created = await admin.storage.createBucket("photos", { public: false, fileSizeLimit: 15 * 1024 * 1024 });
    if (created.error !== null) throw new Error("Could not create local photos bucket fixture");
    createdPhotosBucket = true;
  }
  const targetCreated = await admin.auth.admin.createUser({ email: targetEmail, password, email_confirm: true });
  const otherCreated = await admin.auth.admin.createUser({ email: otherEmail, password, email_confirm: true });
  if (targetCreated.error !== null || otherCreated.error !== null || targetCreated.data.user === null || otherCreated.data.user === null) {
    throw new Error("Could not create local deletion test users");
  }
  targetId = targetCreated.data.user.id;
  otherId = otherCreated.data.user.id;
  targetPhotoPath = `${targetId}/account-delete.jpg`;
  targetAvatarPath = `${targetId}/avatar-${randomUUID()}.jpg`;
  otherPhotoPath = `${otherId}/account-delete-control.jpg`;
  otherAvatarPath = `${otherId}/avatar-${randomUUID()}.jpg`;

  const profiles = await admin.from("profiles").insert([
    { id: targetId, nickname: `delete-target-${targetId.slice(0, 8)}`, bio: "delete me", avatar_url: "", avatar_path: targetAvatarPath },
    { id: otherId, nickname: `delete-other-${otherId.slice(0, 8)}`, bio: "keep me", avatar_url: "", avatar_path: otherAvatarPath }
  ]);
  if (profiles.error !== null) throw new Error("Could not create deletion profile fixtures");
  const photos = await admin.from("photos").insert([
    { id: targetPhotoId, owner_id: targetId, visibility: "private", shared: false, storage_path: targetPhotoPath },
    { id: otherPhotoId, owner_id: otherId, visibility: "public", shared: true, storage_path: otherPhotoPath }
  ]);
  if (photos.error !== null) throw new Error("Could not create deletion photo fixtures");
  const album = await admin.from("albums").insert({ owner_id: targetId, title: "delete fixture" });
  const like = await admin.from("user_likes").insert({ photo_id: otherPhotoId, user_id: targetId });
  if (album.error !== null || like.error !== null) {
    throw new Error(`Could not create deletion relationship fixtures (${album.error?.code ?? "album-ok"}, ${like.error?.code ?? "like-ok"})`);
  }

  const target = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const other = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const targetSession = await target.auth.signInWithPassword({ email: targetEmail, password });
  const otherSession = await other.auth.signInWithPassword({ email: otherEmail, password });
  const accessToken = targetSession.data.session?.access_token;
  if (targetSession.error !== null || otherSession.error !== null || accessToken === undefined) {
    throw new Error("Could not authenticate deletion test users");
  }
  const comment = await target.from("comments").insert({ photo_id: otherPhotoId, author_id: targetId, text: "delete fixture" });
  if (comment.error !== null) throw new Error(`Could not create deletion comment fixture (${comment.error.code})`);

  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xda, 0x00, 0x03, 0x00, 0x11, 0xff, 0xd9]);
  for (const [client, bucket, path] of [
    [target, "avatars", targetAvatarPath],
    [other, "avatars", otherAvatarPath]
  ]) {
    const uploaded = await client.storage.from(bucket).upload(path, jpeg.buffer, { contentType: "image/jpeg", upsert: false });
    if (uploaded.error !== null) throw new Error("Could not create owned avatar fixture");
  }
  for (const path of [targetPhotoPath, otherPhotoPath]) {
    const uploaded = await admin.storage.from("photos").upload(path, jpeg.buffer, { contentType: "image/jpeg", upsert: false });
    if (uploaded.error !== null) throw new Error("Could not create photo object fixture");
  }

  const missingAuth = await fetch(`${url}/functions/v1/delete-account`, {
    method: "POST", headers: { apikey: anonKey, "content-type": "application/json" },
    body: JSON.stringify({ confirmation: "DELETE_ACCOUNT" })
  });
  if (missingAuth.status !== 401) throw new Error(`Missing authorization was not rejected (${missingAuth.status})`);
  if ((await invoke(accessToken, "wrong")).status !== 400) throw new Error("Wrong confirmation was not rejected");
  const deleted = await invoke(accessToken, "DELETE_ACCOUNT");
  if (deleted.status !== 200 || (await deleted.json()).deleted !== true) throw new Error("Account deletion function failed");

  const removedUser = await admin.auth.admin.getUserById(targetId);
  if (removedUser.data.user !== null) throw new Error("Deleted Auth user remains");
  for (const [table, column] of [
    ["profiles", "id"], ["photos", "owner_id"], ["albums", "owner_id"],
    ["comments", "author_id"], ["user_likes", "user_id"]
  ]) {
    if (await count(table, column, targetId) !== 0) throw new Error(`${table} target rows remain`);
  }
  if ((await admin.storage.from("photos").download(targetPhotoPath)).error === null ||
      (await admin.storage.from("avatars").download(targetAvatarPath)).error === null) {
    throw new Error("Deleted account Storage objects remain");
  }
  if (await count("profiles", "id", otherId) !== 1 || await count("photos", "id", otherPhotoId) !== 1 ||
      (await admin.storage.from("photos").download(otherPhotoPath)).error !== null ||
      (await admin.storage.from("avatars").download(otherAvatarPath)).error !== null) {
    throw new Error("Control user data was changed");
  }

  console.log("[account-deletion] Confirmation, Storage/DB/Auth cleanup, and control-user preservation passed.");
} finally {
  const photoPaths = [targetPhotoPath, otherPhotoPath].filter((value) => value !== undefined);
  const avatarPaths = [targetAvatarPath, otherAvatarPath].filter((value) => value !== undefined);
  if (photoPaths.length > 0) await admin.storage.from("photos").remove(photoPaths);
  if (avatarPaths.length > 0) await admin.storage.from("avatars").remove(avatarPaths);
  if (targetId !== undefined) await admin.auth.admin.deleteUser(targetId);
  if (otherId !== undefined) await admin.auth.admin.deleteUser(otherId);
  if (createdPhotosBucket) await admin.storage.deleteBucket("photos");
}
