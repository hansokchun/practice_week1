export const PUBLICATION_DERIVATIVE_MAXIMUM_LONG_EDGE = 2048;
export const PUBLICATION_DERIVATIVE_QUALITY = 0.82;
export const PUBLICATION_DERIVATIVE_LIFETIME_MS = 60 * 60 * 1000;

export type PublicationDerivative = {
  readonly assetId: string;
  readonly uri: string;
  readonly width: number;
  readonly height: number;
  readonly byteSize: number;
  readonly format: "jpeg";
  readonly metadataPolicy: "stripped";
  readonly createdAt: number;
  readonly expiresAt: number;
};

export type PublicationDerivativeOptions = {
  readonly format: "jpeg";
  readonly maximumLongEdge: number;
  readonly quality: number;
  readonly createdAt: number;
  readonly expiresAt: number;
};

export interface PublicationDerivativeFactory {
  readonly create: (
    assetId: string,
    options: PublicationDerivativeOptions
  ) => Promise<PublicationDerivative>;
  readonly remove: (uri: string) => Promise<void>;
}

type PublicationDerivativeDependencies = {
  readonly factory: PublicationDerivativeFactory;
  readonly now?: () => number;
};

type PhotoShape = {
  readonly width: number;
  readonly height: number;
};

function isValidDimension(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isValidSelection(assetIds: readonly string[]): boolean {
  return assetIds.length > 0 && assetIds.length <= 20 &&
    assetIds.every((assetId) => assetId.trim() !== "" && assetId.length <= 512) &&
    new Set(assetIds).size === assetIds.length;
}

export function calculatePublicationDerivativeSize(shape: PhotoShape): PhotoShape {
  if (!isValidDimension(shape.width) || !isValidDimension(shape.height)) {
    throw new TypeError("A valid photo shape is required");
  }
  const longEdge = Math.max(shape.width, shape.height);
  if (longEdge <= PUBLICATION_DERIVATIVE_MAXIMUM_LONG_EDGE) {
    return { width: Math.round(shape.width), height: Math.round(shape.height) };
  }
  const ratio = PUBLICATION_DERIVATIVE_MAXIMUM_LONG_EDGE / longEdge;
  return {
    width: Math.max(1, Math.round(shape.width * ratio)),
    height: Math.max(1, Math.round(shape.height * ratio))
  };
}

export class PublicationDerivativePreparationError extends Error {
  public constructor(cause?: unknown) {
    super("게시용 사진을 준비하지 못했습니다", { cause });
    this.name = "PublicationDerivativePreparationError";
  }
}

export async function preparePublicationDerivatives(
  assetIds: readonly string[],
  { factory, now = Date.now }: PublicationDerivativeDependencies
): Promise<readonly PublicationDerivative[]> {
  if (!isValidSelection(assetIds)) {
    throw new PublicationDerivativePreparationError(new TypeError("유효한 사진 선택이 필요합니다"));
  }

  const createdAt = now();
  const options: PublicationDerivativeOptions = {
    format: "jpeg",
    maximumLongEdge: PUBLICATION_DERIVATIVE_MAXIMUM_LONG_EDGE,
    quality: PUBLICATION_DERIVATIVE_QUALITY,
    createdAt,
    expiresAt: createdAt + PUBLICATION_DERIVATIVE_LIFETIME_MS
  };
  const derivatives: PublicationDerivative[] = [];
  try {
    for (const assetId of assetIds) {
      const derivative = await factory.create(assetId, options);
      if (derivative.metadataPolicy !== "stripped") {
        await factory.remove(derivative.uri);
        throw new TypeError("Publication derivative metadata policy was not verified");
      }
      derivatives.push(derivative);
    }
    return derivatives;
  } catch (cause) {
    await Promise.allSettled(derivatives.map((derivative) => factory.remove(derivative.uri)));
    throw new PublicationDerivativePreparationError(cause);
  }
}
