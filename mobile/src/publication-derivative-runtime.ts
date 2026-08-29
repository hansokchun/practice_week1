import { CryptoDigestAlgorithm, digestStringAsync } from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import {
  calculatePublicationDerivativeSize,
  preparePublicationDerivatives,
  type PublicationDerivative,
  type PublicationDerivativeFactory,
  type PublicationDerivativeOptions
} from "./publication-derivative";
import { sanitizePublicationJpegMetadata } from "./publication-jpeg-sanitizer";

const DERIVATIVE_DIRECTORY_NAME = "ikkyee-derivatives";
const DERIVATIVE_FILE_PATTERN = /^(\d+)-[a-f0-9]{64}\.jpg$/;

export interface PublicationDerivativeCache {
  readonly clearAll: () => Promise<number>;
  readonly clearExpired: (now: number) => Promise<number>;
}

type PublicationDerivativeRuntimeDependencies = {
  readonly cache: PublicationDerivativeCache;
  readonly factory: PublicationDerivativeFactory;
  readonly now?: () => number;
};

export function createPublicationDerivativeRuntime({
  cache,
  factory,
  now = Date.now
}: PublicationDerivativeRuntimeDependencies) {
  return {
    clear(): Promise<number> {
      return cache.clearAll();
    },
    clearExpired(): Promise<number> {
      return cache.clearExpired(now());
    },
    remove(uri: string): Promise<void> {
      return factory.remove(uri);
    },
    async prepare(assetIds: readonly string[]): Promise<readonly PublicationDerivative[]> {
      const timestamp = now();
      await cache.clearExpired(timestamp);
      return preparePublicationDerivatives(assetIds, { factory, now: () => timestamp });
    }
  };
}

class ExpoPublicationDerivativeStore implements PublicationDerivativeFactory, PublicationDerivativeCache {
  private readonly directory = new Directory(Paths.cache, DERIVATIVE_DIRECTORY_NAME);

  private ensureDirectory(): void {
    this.directory.create({ idempotent: true, intermediates: true });
  }

  async create(assetId: string, options: PublicationDerivativeOptions): Promise<PublicationDerivative> {
    const { Asset, MediaType } = await import("expo-media-library");
    const asset = new Asset(assetId);
    const [mediaType, sourceUri, shape] = await Promise.all([
      asset.getMediaType(),
      asset.getUri(),
      asset.getShape()
    ]);
    if (mediaType !== MediaType.IMAGE || shape === null) {
      throw new TypeError("Only still photos can create publication derivatives");
    }

    const target = calculatePublicationDerivativeSize(shape);
    const context = ImageManipulator.manipulate(sourceUri);
    if (target.width !== Math.round(shape.width) || target.height !== Math.round(shape.height)) {
      context.resize(target);
    }
    const image = await context.renderAsync();
    let renderedUri: string | null = null;
    try {
      const rendered = await image.saveAsync({
        compress: options.quality,
        format: SaveFormat.JPEG
      });
      renderedUri = rendered.uri;
      const renderedFile = new File(rendered.uri);
      if (!renderedFile.exists || renderedFile.size <= 0) {
        throw new Error("Publication derivative rendering produced an empty file");
      }
      const sanitizedBytes = sanitizePublicationJpegMetadata(await renderedFile.bytes());
      renderedFile.write(sanitizedBytes);
      this.ensureDirectory();
      const key = await digestStringAsync(
        CryptoDigestAlgorithm.SHA256,
        `${assetId}:${options.createdAt}`
      );
      const destination = new File(this.directory, `${options.createdAt}-${key}.jpg`);
      await renderedFile.move(destination, { overwrite: true });
      renderedUri = null;
      return {
        assetId,
        uri: destination.uri,
        width: target.width,
        height: target.height,
        byteSize: destination.size,
        format: "jpeg",
        metadataPolicy: "stripped",
        createdAt: options.createdAt,
        expiresAt: options.expiresAt
      };
    } finally {
      if (renderedUri !== null) {
        const renderedFile = new File(renderedUri);
        if (renderedFile.exists) renderedFile.delete();
      }
      image.release();
      context.release();
    }
  }

  async remove(uri: string): Promise<void> {
    this.ensureDirectory();
    const expectedPrefix = `${this.directory.uri.replace(/\/$/, "")}/`;
    if (!uri.startsWith(expectedPrefix)) throw new TypeError("Invalid derivative cache path");
    const file = new File(uri);
    if (file.exists) file.delete();
  }

  async clearExpired(now: number): Promise<number> {
    this.ensureDirectory();
    let removed = 0;
    for (const entry of this.directory.list()) {
      if (!(entry instanceof File)) continue;
      const match = DERIVATIVE_FILE_PATTERN.exec(entry.name);
      if (match === null) continue;
      const createdAt = Number(match[1]);
      if (Number.isFinite(createdAt) && createdAt + 60 * 60 * 1000 <= now) {
        entry.delete();
        removed += 1;
      }
    }
    return removed;
  }

  async clearAll(): Promise<number> {
    this.ensureDirectory();
    let removed = 0;
    for (const entry of this.directory.list()) {
      if (!(entry instanceof File) || !DERIVATIVE_FILE_PATTERN.test(entry.name)) continue;
      entry.delete();
      removed += 1;
    }
    return removed;
  }
}

const expoPublicationDerivativeStore = new ExpoPublicationDerivativeStore();

export const publicationDerivativeRuntime = createPublicationDerivativeRuntime({
  cache: expoPublicationDerivativeStore,
  factory: expoPublicationDerivativeStore
});
