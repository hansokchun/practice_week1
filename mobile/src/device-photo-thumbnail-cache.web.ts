export const devicePhotoThumbnailCache = {
  async getOrCreate(assetId: string): Promise<string> {
    return assetId;
  },
  async remove(): Promise<void> {},
  async clear(): Promise<void> {}
};
