import type { PublicationDerivative } from "./publication-derivative";
import type { PublicationResult } from "./publication-publisher";
import type { PublicationSelection } from "./publication-selection";

export const publicationRuntime = {
  async publish(_ownerId: string, _selection: PublicationSelection, _derivatives: readonly PublicationDerivative[]): Promise<PublicationResult> {
    throw new Error("Device publication requires an iOS or Android build");
  },
  async retry(_ownerId: string, _assetId: string): Promise<PublicationResult> {
    throw new Error("Device publication retry requires an iOS or Android build");
  }
};
