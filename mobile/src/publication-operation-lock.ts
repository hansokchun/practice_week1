import { DuplicatePublicationError } from "./publication-publisher";

export function createPublicationOperationLock() {
  const activeAssets = new Set<string>();
  return {
    async run<T>(ownerId: string, assetIds: readonly string[], task: () => Promise<T>): Promise<T> {
      const keys = assetIds.map((assetId) => `${ownerId}:${assetId}`);
      if (keys.some((key) => activeAssets.has(key))) throw new DuplicatePublicationError();
      keys.forEach((key) => activeAssets.add(key));
      try {
        return await task();
      } finally {
        keys.forEach((key) => activeAssets.delete(key));
      }
    }
  };
}
