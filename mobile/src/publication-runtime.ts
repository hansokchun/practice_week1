import {
  CryptoDigestAlgorithm,
  digestStringAsync,
  getRandomBytesAsync,
  randomUUID
} from "expo-crypto";
import { File } from "expo-file-system";

import { getSupabaseClient } from "./supabase-client";
import { openLocalPhotoDatabase } from "./local-photo-database";
import { nativeLocalPhotoStorage } from "./native-local-photo-storage";
import { publicationDerivativeRuntime } from "./publication-derivative-runtime";
import type { PublicationDerivative } from "./publication-derivative";
import { createPublicationJobRepository, recoverInterruptedPublicationJobsOnce } from "./publication-job-repository";
import {
  publishPreparedSelection,
  type PublicationRemote,
  type PublicationResult
} from "./publication-publisher";
import { retryPublicationJob } from "./publication-retry";
import type { PublicationSelection } from "./publication-selection";
import { createPublicationOperationLock } from "./publication-operation-lock";
import { encodePublicationShareToken, PUBLICATION_SHARE_TOKEN_BYTES } from "./publication-link-token";
import { deletePublishedPhoto } from "./publication-deletion";

function createSupabasePublicationRemote(): PublicationRemote {
  const client = getSupabaseClient();
  return {
    async upload({ path, bytes, contentType, upsert }) {
      const { error } = await client.storage.from("photos").upload(path, bytes, { contentType, upsert });
      if (error !== null) throw error;
    },
    async insertPhoto(photo) {
      const { error } = await client.from("photos").insert(photo);
      if (error !== null) throw error;
    },
    async remove(path) {
      const { error } = await client.storage.from("photos").remove([path]);
      if (error !== null) throw error;
    }
  };
}

function createRepository(handle: Awaited<ReturnType<typeof openLocalPhotoDatabase>>) {
  return createPublicationJobRepository({
    runAsync: (source, params = []) => handle.database.runAsync(source, [...params]),
    getFirstAsync: <T>(source: string, params: readonly (string | number | null)[] = []) =>
      handle.database.getFirstAsync<T>(source, [...params]),
    getAllAsync: <T>(source: string, params: readonly (string | number | null)[] = []) =>
      handle.database.getAllAsync<T>(source, [...params])
  });
}

function databaseExecutor(handle: Awaited<ReturnType<typeof openLocalPhotoDatabase>>) {
  return {
    runAsync: (source: string, params: readonly (string | number | null)[] = []) =>
      handle.database.runAsync(source, [...params]),
    getFirstAsync: <T>(source: string, params: readonly (string | number | null)[] = []) =>
      handle.database.getFirstAsync<T>(source, [...params]),
    getAllAsync: <T>(source: string, params: readonly (string | number | null)[] = []) =>
      handle.database.getAllAsync<T>(source, [...params])
  };
}

function publicationDependencies(handle: Awaited<ReturnType<typeof openLocalPhotoDatabase>>) {
  return {
    repository: createRepository(handle),
    remote: createSupabasePublicationRemote(),
    readBytes: (uri: string) => new File(uri).arrayBuffer(),
    removeDerivative: (uri: string) => publicationDerivativeRuntime.remove(uri),
    createShareToken: async () => encodePublicationShareToken(
      await getRandomBytesAsync(PUBLICATION_SHARE_TOKEN_BYTES)
    ),
    hashShareToken: (token: string) => digestStringAsync(CryptoDigestAlgorithm.SHA256, token)
  };
}

const publicationOperationLock = createPublicationOperationLock();

export const publicationRuntime = {
  async publish(ownerId: string, selection: PublicationSelection, derivatives: readonly PublicationDerivative[]): Promise<PublicationResult> {
    return publicationOperationLock.run(ownerId, selection.assetIds, async () => {
      const directoryObservation = await nativeLocalPhotoStorage.getDatabaseDirectoryObservation();
      const handle = await openLocalPhotoDatabase({ databaseName: "ikkyee-local.db", directoryObservation });
      try {
        await recoverInterruptedPublicationJobsOnce(databaseExecutor(handle));
        return await publishPreparedSelection({ ownerId, selection, derivatives }, {
          ...publicationDependencies(handle),
          createId: randomUUID
        });
      } finally {
        await handle.database.closeAsync();
      }
    });
  },
  async retry(ownerId: string, assetId: string): Promise<PublicationResult> {
    return publicationOperationLock.run(ownerId, [assetId], async () => {
      const directoryObservation = await nativeLocalPhotoStorage.getDatabaseDirectoryObservation();
      const handle = await openLocalPhotoDatabase({ databaseName: "ikkyee-local.db", directoryObservation });
      try {
        await recoverInterruptedPublicationJobsOnce(databaseExecutor(handle));
        const dependencies = publicationDependencies(handle);
        const job = await dependencies.repository.getLatestRetryableForAsset(assetId);
        if (job === null) throw new Error("Retryable publication job was not found");
        return await retryPublicationJob({ ownerId, job }, {
          ...dependencies,
          prepare: publicationDerivativeRuntime.prepare
        });
      } finally {
        await handle.database.closeAsync();
      }
    });
  },
  async delete(ownerId: string, assetId: string): Promise<{ readonly photoId: string }> {
    return publicationOperationLock.run(ownerId, [assetId], async () => {
      const directoryObservation = await nativeLocalPhotoStorage.getDatabaseDirectoryObservation();
      const handle = await openLocalPhotoDatabase({ databaseName: "ikkyee-local.db", directoryObservation });
      try {
        const repository = createRepository(handle);
        const client = getSupabaseClient();
        return await deletePublishedPhoto(ownerId, assetId, {
          findLatestPublished: (photoAssetId) => repository.getLatestSucceededForAsset(photoAssetId),
          async deletePhotoRecord(photoId, expectedOwnerId) {
            const { error } = await client.from("photos").delete()
              .eq("id", photoId).eq("owner_id", expectedOwnerId);
            if (error !== null) throw error;
          },
          async removeObject(path) {
            const { error } = await client.storage.from("photos").remove([path]);
            if (error !== null) throw error;
          },
          clearLocalJob: (jobId) => repository.deleteSucceeded(jobId)
        });
      } finally {
        await handle.database.closeAsync();
      }
    });
  }
};
