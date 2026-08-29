import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const configPath = resolve(process.env["SUPABASE_CONFIG_PATH"] ?? resolve(projectRoot, "supabase", "config.toml"));

function fail(message) {
  console.error(`[supabase:check] ${message}`);
  process.exit(1);
}

let config;
try {
  config = readFileSync(configPath, "utf8");
} catch (error) {
  if (error instanceof Error) {
    fail("Config is missing or unreadable. Expected root supabase/config.toml.");
  }
  throw error;
}

if (!/^project_id\s*=\s*"[a-z0-9-]+"/mu.test(config) || !/^port\s*=\s*54321$/mu.test(config)) {
  fail("Config is malformed. A lowercase project_id and local API port 54321 are required.");
}

const publicUrl = process.env["EXPO_PUBLIC_SUPABASE_URL"];
if (publicUrl !== undefined) {
  try {
    const parsedUrl = new URL(publicUrl);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      fail("EXPO_PUBLIC_SUPABASE_URL must use http or https. Values are never printed.");
    }
  } catch (error) {
    if (error instanceof TypeError) {
      fail("EXPO_PUBLIC_SUPABASE_URL is malformed. Values are never printed.");
    }
    throw error;
  }
}

const publicKey = process.env["EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] ?? process.env["EXPO_PUBLIC_SUPABASE_ANON_KEY"];
if (publicKey !== undefined && (publicKey.length < 20 || /service[_-]?role|secret/iu.test(publicKey))) {
  fail("The Supabase public key is invalid or unsafe. Values are never printed.");
}

const docker = spawnSync("docker", ["version", "--format", "{{.Server.Version}}"], {
  encoding: "utf8",
  timeout: 10_000,
  windowsHide: true
});

if (docker.error !== undefined || docker.status !== 0 || docker.stdout.trim().length === 0) {
  fail("Docker is unavailable. Start Docker Desktop and retry.");
}

console.log("[supabase:check] Config, public environment shape, and Docker engine are ready.");
