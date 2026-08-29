import type { PublicationDerivative } from "./publication-derivative";

export function createPublicationDerivativeRuntime() {
  return {
    async clear(): Promise<number> {
      return 0;
    },
    async clearExpired(): Promise<number> {
      return 0;
    },
    async remove(): Promise<void> {},
    async prepare(): Promise<readonly PublicationDerivative[]> {
      throw new Error("Device photo derivatives require an iOS or Android build");
    }
  };
}

export const publicationDerivativeRuntime = createPublicationDerivativeRuntime();
