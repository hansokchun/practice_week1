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
const anonymous = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
const password = `Local-${randomUUID()}-A1!`;
const ownerEmail = `storage-owner-${randomUUID()}@example.invalid`;
const otherEmail = `storage-other-${randomUUID()}@example.invalid`;
let ownerId;
let otherId;
let publicPath;
let privatePath;

async function requireSignedUrl(client, path, expiresIn) {
  const result = await client.storage.from("photos").createSignedUrl(path, expiresIn);
  if (result.error !== null || result.data?.signedUrl === undefined) {
    throw new Error("Expected signed photo URL was not issued");
  }
  return result.data.signedUrl;
}

async function requireSigningDenied(client, path) {
  const result = await client.storage.from("photos").createSignedUrl(path, 300);
  if (result.error === null || result.data?.signedUrl !== undefined) {
    throw new Error("Private photo signed URL was issued to an unauthorized client");
  }
}

try {
  const buckets = await admin.storage.listBuckets();
  if (buckets.error !== null || !buckets.data.some((bucket) => bucket.id === "photos" && bucket.public === false)) {
    throw new Error("A private photos bucket migration is required");
  }

  const ownerCreated = await admin.auth.admin.createUser({ email: ownerEmail, password, email_confirm: true });
  const otherCreated = await admin.auth.admin.createUser({ email: otherEmail, password, email_confirm: true });
  if (ownerCreated.error !== null || otherCreated.error !== null || ownerCreated.data.user === null || otherCreated.data.user === null) {
    throw new Error("Could not create local Storage test users");
  }
  ownerId = ownerCreated.data.user.id;
  otherId = otherCreated.data.user.id;
  publicPath = `${ownerId}/storage-public-${randomUUID()}.jpg`;
  privatePath = `${ownerId}/storage-private-${randomUUID()}.jpg`;

  const photos = await admin.from("photos").insert([
    { id: `storage-public-${randomUUID()}`, owner_id: ownerId, visibility: "public", shared: true, storage_path: publicPath },
    { id: `storage-private-${randomUUID()}`, owner_id: ownerId, visibility: "private", shared: false, storage_path: privatePath }
  ]).select("id,storage_path");
  if (photos.error !== null || photos.data.length !== 2) throw new Error("Could not create local Storage photo fixtures");

  const owner = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const other = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  if ((await owner.auth.signInWithPassword({ email: ownerEmail, password })).error !== null ||
      (await other.auth.signInWithPassword({ email: otherEmail, password })).error !== null) {
    throw new Error("Could not authenticate local Storage test users");
  }

  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xda, 0x00, 0x03, 0x00, 0x11, 0xff, 0xd9]);
  for (const path of [publicPath, privatePath]) {
    const uploaded = await owner.storage.from("photos").upload(path, jpeg.buffer, { contentType: "image/jpeg", upsert: false });
    if (uploaded.error !== null) throw new Error("Owner photo upload was rejected");
  }

  const anonymousPublicUrl = await requireSignedUrl(anonymous, publicPath, 1);
  const otherPublicUrl = await requireSignedUrl(other, publicPath, 300);
  if (!(await fetch(anonymousPublicUrl)).ok || !(await fetch(otherPublicUrl)).ok) {
    throw new Error("Authorized public signed URL download failed");
  }
  await new Promise((resolve) => setTimeout(resolve, 1_500));
  if ((await fetch(anonymousPublicUrl, { cache: "no-store" })).ok) {
    throw new Error("Expired signed photo URL remained downloadable");
  }

  await requireSignedUrl(owner, privatePath, 300);
  await requireSigningDenied(other, privatePath);
  await requireSigningDenied(anonymous, privatePath);
  if ((await other.storage.from("photos").download(privatePath)).error === null ||
      (await anonymous.storage.from("photos").download(privatePath)).error === null) {
    throw new Error("Private photo was directly downloadable by an unauthorized client");
  }

  const madePrivate = await admin.from("photos").update({ visibility: "private", shared: false }).eq("storage_path", publicPath);
  if (madePrivate.error !== null) throw new Error("Could not change the public Storage fixture to private");
  await requireSigningDenied(other, publicPath);
  await requireSigningDenied(anonymous, publicPath);
  await requireSignedUrl(owner, publicPath, 300);

  const privatePhoto = photos.data.find((photo) => photo.storage_path === privatePath);
  if (privatePhoto === undefined) throw new Error("Private deletion fixture was not found");
  const otherRowDeletion = await other.from("photos").delete().eq("id", privatePhoto.id).select("id");
  if (otherRowDeletion.error !== null || otherRowDeletion.data.length !== 0) {
    throw new Error("A non-owner could delete an owned photo row");
  }
  await other.storage.from("photos").remove([privatePath]);
  const survivedUnauthorizedDelete = await requireSignedUrl(owner, privatePath, 300);
  if (!(await fetch(survivedUnauthorizedDelete, { cache: "no-store" })).ok) {
    throw new Error("A non-owner could delete an owned photo object");
  }
  const ownerRowDeletion = await owner.from("photos").delete().eq("id", privatePhoto.id).select("id");
  if (ownerRowDeletion.error !== null || ownerRowDeletion.data.length !== 1) {
    throw new Error("The owner could not delete their photo row");
  }
  if ((await owner.storage.from("photos").remove([privatePath])).error !== null) {
    throw new Error("The owner could not delete their photo object");
  }

  console.log("[photo-storage] Expiry, renewal, owner reads/deletes, and non-owner private denial passed.");
} finally {
  if (ownerId !== undefined && publicPath !== undefined && privatePath !== undefined) {
    const owner = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    if ((await owner.auth.signInWithPassword({ email: ownerEmail, password })).error === null) {
      await owner.storage.from("photos").remove([publicPath, privatePath]);
    } else {
      await admin.storage.from("photos").remove([publicPath, privatePath]);
    }
    await admin.from("photos").delete().eq("owner_id", ownerId);
  }
  if (ownerId !== undefined) await admin.auth.admin.deleteUser(ownerId);
  if (otherId !== undefined) await admin.auth.admin.deleteUser(otherId);
}
