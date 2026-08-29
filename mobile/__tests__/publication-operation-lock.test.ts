import { createPublicationOperationLock } from "../src/publication-operation-lock";

describe("publication operation lock", () => {
  it("blocks overlapping submissions for the same owner asset and releases after completion", async () => {
    const lock = createPublicationOperationLock();
    let release: (() => void) | undefined;
    const first = lock.run("owner-a", ["asset-a"], () => new Promise<void>((resolve) => { release = resolve; }));

    await expect(lock.run("owner-a", ["asset-a"], async () => undefined)).rejects.toThrow("진행 중");
    await expect(lock.run("owner-a", ["asset-b"], async () => "other")).resolves.toBe("other");
    release?.();
    await first;
    await expect(lock.run("owner-a", ["asset-a"], async () => "released")).resolves.toBe("released");
  });
});
