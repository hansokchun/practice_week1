import AsyncStorage from "@react-native-async-storage/async-storage";

export type AccountSettings = {
  readonly defaultVisibility: "private" | "public";
};

const DEFAULT_SETTINGS: AccountSettings = { defaultVisibility: "private" };

function storageKey(userId: string): string {
  return `ikkyee:mobile:settings:${userId}`;
}

function normalizeSettings(value: unknown): AccountSettings {
  if (typeof value !== "object" || value === null) return DEFAULT_SETTINGS;
  return {
    defaultVisibility: (value as { defaultVisibility?: unknown }).defaultVisibility === "public"
      ? "public"
      : "private"
  };
}

export async function loadAccountSettings(userId: string): Promise<AccountSettings> {
  if (userId.trim().length === 0) return DEFAULT_SETTINGS;
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    return raw === null ? DEFAULT_SETTINGS : normalizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveAccountSettings(userId: string, settings: AccountSettings): Promise<void> {
  if (userId.trim().length === 0) throw new Error("Settings require a signed-in account.");
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(normalizeSettings(settings)));
}
