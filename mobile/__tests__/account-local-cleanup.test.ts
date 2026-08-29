import { clearLocalAccountData } from "../src/account-local-cleanup";

describe("account local data cleanup", () => {
  it("clears account-derived rows before caches and always closes the database", async () => {
    const calls: string[] = [];
    await clearLocalAccountData({
      openDatabase: async () => ({
        exec: async (sql) => { calls.push(sql.replace(/\s+/gu, " ").trim()); },
        close: async () => { calls.push("close"); }
      }),
      clearThumbnails: async () => { calls.push("thumbnails"); },
      clearDerivatives: async () => { calls.push("derivatives"); }
    });

    expect(calls[0]).toMatch(/BEGIN IMMEDIATE.*DELETE FROM publication_jobs.*DELETE FROM device_assets.*COMMIT/u);
    expect(calls).toEqual([calls[0]!, "close", "thumbnails", "derivatives"]);
  });

  it("rolls back and closes without clearing caches when database deletion fails", async () => {
    const calls: string[] = [];
    await expect(clearLocalAccountData({
      openDatabase: async () => ({
        exec: async (sql) => {
          calls.push(sql);
          if (sql.includes("DELETE FROM")) throw new Error("disk detail");
        },
        close: async () => { calls.push("close"); }
      }),
      clearThumbnails: async () => { calls.push("thumbnails"); },
      clearDerivatives: async () => { calls.push("derivatives"); }
    })).rejects.toThrow("기기 데이터를 정리하지 못했습니다.");
    expect(calls.some((entry) => entry === "ROLLBACK")).toBe(true);
    expect(calls.at(-1)).toBe("close");
    expect(calls).not.toContain("thumbnails");
  });
});
