import { createChunkedSecureStorage, parseSupabasePublicConfig, registerAuthAutoRefresh } from "../src/supabase-client";

describe("Supabase mobile client foundation", () => {
  it("accepts the local development project without exposing secret keys", () => {
    expect(parseSupabasePublicConfig({
      EXPO_PUBLIC_APP_ENV: "development",
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_value_1234567890",
      EXPO_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321"
    })).toEqual({
      appEnvironment: "development",
      key: "sb_publishable_test_value_1234567890",
      projectRef: null,
      url: "http://127.0.0.1:54321"
    });
    expect(parseSupabasePublicConfig({
      EXPO_PUBLIC_APP_ENV: "development",
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_value_1234567890",
      EXPO_PUBLIC_SUPABASE_URL: "http://[::1]:54321"
    }).url).toBe("http://[::1]:54321");

    expect(() => parseSupabasePublicConfig({
      EXPO_PUBLIC_APP_ENV: "development",
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "service_role_secret_value_1234567890",
      EXPO_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321"
    })).toThrow("publishable");
  });

  it("separates preview and production Supabase projects", () => {
    expect(parseSupabasePublicConfig({
      EXPO_PUBLIC_APP_ENV: "preview",
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_preview_value_1234567890",
      EXPO_PUBLIC_SUPABASE_URL: "https://previewprojectref.supabase.co"
    })).toEqual({
      appEnvironment: "preview",
      key: "sb_publishable_preview_value_1234567890",
      projectRef: "previewprojectref",
      url: "https://previewprojectref.supabase.co"
    });
    expect(parseSupabasePublicConfig({
      EXPO_PUBLIC_APP_ENV: "production",
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_production_value_1234567890",
      EXPO_PUBLIC_SUPABASE_URL: "https://pqczcponriukilrtpbdl.supabase.co"
    })).toMatchObject({ appEnvironment: "production", projectRef: "pqczcponriukilrtpbdl" });
  });

  it("rejects cross-environment URLs and legacy keys outside local development", () => {
    const publishableKey = "sb_publishable_test_value_1234567890";
    expect(() => parseSupabasePublicConfig({
      EXPO_PUBLIC_APP_ENV: "production",
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      EXPO_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321"
    })).toThrow("production");
    expect(() => parseSupabasePublicConfig({
      EXPO_PUBLIC_APP_ENV: "preview",
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      EXPO_PUBLIC_SUPABASE_URL: "https://pqczcponriukilrtpbdl.supabase.co"
    })).toThrow("preview");
    expect(() => parseSupabasePublicConfig({
      EXPO_PUBLIC_APP_ENV: "development",
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      EXPO_PUBLIC_SUPABASE_URL: "https://pqczcponriukilrtpbdl.supabase.co"
    })).toThrow("development");
    expect(() => parseSupabasePublicConfig({
      EXPO_PUBLIC_APP_ENV: "preview",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: "legacy_anon_key_value_1234567890",
      EXPO_PUBLIC_SUPABASE_URL: "https://previewprojectref.supabase.co"
    })).toThrow("publishable");
  });

  it("splits large native sessions across secure values and removes every chunk", async () => {
    const values = new Map<string, string>();
    const secureStore = {
      deleteItemAsync: jest.fn(async (key: string) => { values.delete(key); }),
      getItemAsync: jest.fn(async (key: string) => values.get(key) ?? null),
      setItemAsync: jest.fn(async (key: string, value: string) => { values.set(key, value); })
    };
    const storage = createChunkedSecureStorage(secureStore, 8);
    const session = "session-value-larger-than-one-secure-chunk";

    await storage.setItem("auth", session);

    expect(await storage.getItem("auth")).toBe(session);
    expect(secureStore.setItemAsync).toHaveBeenCalledTimes(7);

    await storage.removeItem("auth");

    expect(await storage.getItem("auth")).toBeNull();
    expect(values.size).toBe(0);
  });

  it("refreshes only while the native app is active and unregisters cleanly", () => {
    let listener: ((state: string) => void) | undefined;
    const remove = jest.fn();
    const appState = {
      addEventListener: jest.fn((_event: "change", next: (state: string) => void) => {
        listener = next;
        return { remove };
      })
    };
    const auth = { startAutoRefresh: jest.fn(), stopAutoRefresh: jest.fn() };

    const cleanup = registerAuthAutoRefresh(auth, appState);
    listener?.("active");
    listener?.("background");
    cleanup();

    expect(auth.startAutoRefresh).toHaveBeenCalledTimes(1);
    expect(auth.stopAutoRefresh).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
