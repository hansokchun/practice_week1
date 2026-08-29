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
if (url === undefined || anonKey === undefined || serviceKey === undefined) throw new Error("Local Supabase credentials are unavailable");

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const anon = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
const password = `Local-${randomUUID()}-A1!`;
const ownerEmail = `profile-owner-${randomUUID()}@example.invalid`;
const otherEmail = `profile-other-${randomUUID()}@example.invalid`;
let ownerId;
let otherId;
let avatarPath;

try {
  const ownerCreated = await admin.auth.admin.createUser({ email: ownerEmail, password, email_confirm: true });
  const otherCreated = await admin.auth.admin.createUser({ email: otherEmail, password, email_confirm: true });
  if (ownerCreated.error !== null || otherCreated.error !== null || ownerCreated.data.user === null || otherCreated.data.user === null) {
    throw new Error("Could not create local profile test users");
  }
  ownerId = ownerCreated.data.user.id;
  otherId = otherCreated.data.user.id;
  avatarPath = `${ownerId}/avatar-${randomUUID()}.jpg`;
  const profileRows = await admin.from("profiles").insert([
    { id: ownerId, nickname: `owner-${ownerId.slice(0, 8)}`, bio: "", avatar_url: "" },
    { id: otherId, nickname: `other-${otherId.slice(0, 8)}`, bio: "", avatar_url: "" }
  ]);
  if (profileRows.error !== null) throw new Error("Could not create local profile fixtures");

  const owner = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const other = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  if ((await owner.auth.signInWithPassword({ email: ownerEmail, password })).error !== null ||
      (await other.auth.signInWithPassword({ email: otherEmail, password })).error !== null) {
    throw new Error("Could not authenticate local profile test users");
  }

  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xda, 0x00, 0x03, 0x00, 0x11, 0xff, 0xd9]);
  const uploaded = await owner.storage.from("avatars").upload(avatarPath, jpeg.buffer, { contentType: "image/jpeg", upsert: false });
  if (uploaded.error !== null) throw new Error("Owner avatar upload was rejected");
  const crossFolder = await owner.storage.from("avatars").upload(`${otherId}/avatar-${randomUUID()}.jpg`, jpeg.buffer, { contentType: "image/jpeg", upsert: false });
  if (crossFolder.error === null) throw new Error("Cross-folder avatar upload unexpectedly succeeded");
  const wrongMime = await owner.storage.from("avatars").upload(`${ownerId}/avatar-${randomUUID()}.jpg`, jpeg.buffer, { contentType: "image/png", upsert: false });
  if (wrongMime.error === null) throw new Error("Non-JPEG avatar upload unexpectedly succeeded");

  const ownerProfile = await owner.from("profiles").update({ nickname: " 새 이름 ", bio: " 새 소개 ", avatar_path: avatarPath }).eq("id", ownerId).select("nickname,bio,avatar_path").single();
  if (ownerProfile.error !== null || ownerProfile.data.nickname !== "새 이름" || ownerProfile.data.bio !== "새 소개" || ownerProfile.data.avatar_path !== avatarPath) {
    throw new Error("Owner profile update did not normalize safely");
  }
  const otherUpdate = await other.from("profiles").update({ nickname: "침입" }).eq("id", ownerId).select("id");
  if (otherUpdate.error !== null || otherUpdate.data.length !== 0) throw new Error("Non-owner profile update was not isolated");
  const publicProfile = await anon.from("profiles").select("nickname,bio,avatar_path").eq("id", ownerId).single();
  if (publicProfile.error !== null || publicProfile.data.avatar_path !== avatarPath) throw new Error("Anonymous public profile projection failed");

  const publicDownload = await anon.storage.from("avatars").download(avatarPath);
  if (publicDownload.error !== null || publicDownload.data.size !== jpeg.byteLength) throw new Error("Public avatar download failed");
  const otherList = await other.storage.from("avatars").list(ownerId);
  if (otherList.error !== null || otherList.data.length !== 0) throw new Error("Non-owner avatar listing was not isolated");
  await other.storage.from("avatars").remove([avatarPath]);
  if ((await anon.storage.from("avatars").download(avatarPath)).error !== null) throw new Error("Non-owner avatar removal unexpectedly succeeded");
  const removed = await owner.storage.from("avatars").remove([avatarPath]);
  if (removed.error !== null) throw new Error("Owner avatar removal failed");
  if ((await anon.storage.from("avatars").download(avatarPath)).error === null) throw new Error("Removed avatar remained publicly downloadable");

  console.log("[profile-storage] Owner upload/delete, MIME boundary, non-owner isolation, and anonymous public download passed.");
} finally {
  if (avatarPath !== undefined) await admin.storage.from("avatars").remove([avatarPath]);
  if (ownerId !== undefined) await admin.auth.admin.deleteUser(ownerId);
  if (otherId !== undefined) await admin.auth.admin.deleteUser(otherId);
}
