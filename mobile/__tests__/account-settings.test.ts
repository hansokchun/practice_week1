import AsyncStorage from "@react-native-async-storage/async-storage";

import { loadAccountSettings, saveAccountSettings } from "../src/account-settings";

describe("mobile account settings", () => {
  beforeEach(async () => AsyncStorage.clear());

  it("keeps private publication as the safe default and scopes values by user", async () => {
    await expect(loadAccountSettings("user-a")).resolves.toEqual({ defaultVisibility: "private" });
    await saveAccountSettings("user-a", { defaultVisibility: "public" });
    await expect(loadAccountSettings("user-a")).resolves.toEqual({ defaultVisibility: "public" });
    await expect(loadAccountSettings("user-b")).resolves.toEqual({ defaultVisibility: "private" });
  });

  it("falls back safely when stored data is malformed", async () => {
    await AsyncStorage.setItem("ikkyee:mobile:settings:user-a", "not-json");
    await expect(loadAccountSettings("user-a")).resolves.toEqual({ defaultVisibility: "private" });
  });
});
