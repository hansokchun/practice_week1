import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock, type SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { AppState, Platform } from "react-native";
import "react-native-url-polyfill/auto";

type PublicEnvironment = Record<string, string | undefined>;
type AppEnvironment = "development" | "preview" | "production";

type SecureStoreApi = {
  deleteItemAsync(key: string): Promise<void>;
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
};

type AuthRefreshApi = {
  startAutoRefresh(): void;
  stopAutoRefresh(): void;
};

type AppStateApi = {
  addEventListener(event: "change", listener: (state: string) => void): { remove(): void };
};

const DEFAULT_SECURE_CHUNK_SIZE = 1_800;
const META_SUFFIX = ":chunks";
const PRODUCTION_SUPABASE_PROJECT_REF = "pqczcponriukilrtpbdl";

function chunkKey(key: string, index: number) {
  return `${key}:chunk:${index}`;
}

function parseChunkCount(value: string | null) {
  if (value === null || !/^\d+$/u.test(value)) return 0;
  return Number(value);
}

export function createChunkedSecureStorage(secureStore: SecureStoreApi, chunkSize = DEFAULT_SECURE_CHUNK_SIZE) {
  if (!Number.isInteger(chunkSize) || chunkSize < 1) throw new Error("Secure session chunk size must be a positive integer.");

  return {
    async getItem(key: string) {
      const count = parseChunkCount(await secureStore.getItemAsync(`${key}${META_SUFFIX}`));
      if (count === 0) return null;

      const chunks = await Promise.all(
        Array.from({ length: count }, (_, index) => secureStore.getItemAsync(chunkKey(key, index)))
      );
      if (chunks.some((chunk) => chunk === null)) return null;
      return chunks.join("");
    },

    async removeItem(key: string) {
      const count = parseChunkCount(await secureStore.getItemAsync(`${key}${META_SUFFIX}`));
      await Promise.all(Array.from({ length: count }, (_, index) => secureStore.deleteItemAsync(chunkKey(key, index))));
      await secureStore.deleteItemAsync(`${key}${META_SUFFIX}`);
    },

    async setItem(key: string, value: string) {
      const previousCount = parseChunkCount(await secureStore.getItemAsync(`${key}${META_SUFFIX}`));
      const chunks = Array.from(
        { length: Math.ceil(value.length / chunkSize) },
        (_, index) => value.slice(index * chunkSize, (index + 1) * chunkSize)
      );

      await Promise.all(chunks.map((chunk, index) => secureStore.setItemAsync(chunkKey(key, index), chunk)));
      await secureStore.setItemAsync(`${key}${META_SUFFIX}`, String(chunks.length));
      await Promise.all(
        Array.from({ length: Math.max(0, previousCount - chunks.length) }, (_, offset) =>
          secureStore.deleteItemAsync(chunkKey(key, chunks.length + offset))
        )
      );
    }
  };
}

export function parseSupabasePublicConfig(environment: PublicEnvironment) {
  const appEnvironment = environment["EXPO_PUBLIC_APP_ENV"];
  const url = environment["EXPO_PUBLIC_SUPABASE_URL"];
  if (!(["development", "preview", "production"] as const).includes(appEnvironment as AppEnvironment)) {
    throw new Error("EXPO_PUBLIC_APP_ENV must be development, preview, or production.");
  }
  const publishableKey = environment["EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const key = publishableKey ?? (appEnvironment === "development" ? environment["EXPO_PUBLIC_SUPABASE_ANON_KEY"] : undefined);

  if (url === undefined || key === undefined) {
    throw new Error(`Supabase public URL and publishable key are required for ${appEnvironment}.`);
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Supabase public URL is malformed.");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Supabase public URL must use HTTP or HTTPS.");
  }
  if (key.length < 20 || /service[_-]?role|secret/iu.test(key)) {
    throw new Error("Supabase publishable key is missing or unsafe for a public client.");
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const projectRefMatch = /^([a-z0-9]{10,40})\.supabase\.co$/u.exec(hostname);
  const projectRef = projectRefMatch?.[1] ?? null;
  const localIpv4 = /^(?:127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})$/u.test(hostname);
  const localHost = hostname === "localhost" || hostname === "::1" || hostname === "[::1]" || localIpv4;

  if (appEnvironment === "development" && !localHost) {
    throw new Error("The development app must use a local Supabase URL.");
  }
  if (appEnvironment === "preview" &&
      (parsedUrl.protocol !== "https:" || projectRef === null || projectRef === PRODUCTION_SUPABASE_PROJECT_REF)) {
    throw new Error("The preview app must use a separate HTTPS Supabase project.");
  }
  if (appEnvironment === "production" &&
      (parsedUrl.protocol !== "https:" || projectRef !== PRODUCTION_SUPABASE_PROJECT_REF || parsedUrl.port !== "")) {
    throw new Error("The production app must use the approved production Supabase project.");
  }

  return {
    appEnvironment: appEnvironment as AppEnvironment,
    key,
    projectRef,
    url: parsedUrl.toString().replace(/\/$/u, "")
  };
}

export function registerAuthAutoRefresh(auth: AuthRefreshApi, appState: AppStateApi = AppState) {
  const subscription = appState.addEventListener("change", (state) => {
    if (state === "active") auth.startAutoRefresh();
    else auth.stopAutoRefresh();
  });

  return () => {
    auth.stopAutoRefresh();
    subscription.remove();
  };
}

let client: SupabaseClient | undefined;

function embeddedPublicEnvironment(): PublicEnvironment {
  return {
    // @ts-expect-error Expo requires static dot access so EXPO_PUBLIC values are inlined at bundle time.
    EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
    // @ts-expect-error Expo requires static dot access so EXPO_PUBLIC values are inlined at bundle time.
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    // @ts-expect-error Expo requires static dot access so EXPO_PUBLIC values are inlined at bundle time.
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    // @ts-expect-error Expo requires static dot access so EXPO_PUBLIC values are inlined at bundle time.
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  };
}

export function getSupabaseClient(environment: PublicEnvironment = embeddedPublicEnvironment()) {
  if (client !== undefined) return client;

  const config = parseSupabasePublicConfig(environment);
  const storage = Platform.OS === "web" ? AsyncStorage : createChunkedSecureStorage(SecureStore);
  client = createClient(config.url, config.key, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: "pkce",
      lock: processLock,
      persistSession: true,
      storage
    }
  });
  return client;
}
