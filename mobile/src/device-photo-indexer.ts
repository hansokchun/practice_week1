import type { SQLiteDatabase } from "expo-sqlite";

import { expoDevicePhotoPageSource } from "./device-photo-library";
import { createExpoSQLiteDevicePhotoScanStore } from "./device-photo-repository";
import { scanDevicePhotoLibrary, type DevicePhotoScanResult } from "./device-photo-scan";

export async function indexDevicePhotoLibrary(
  database: SQLiteDatabase
): Promise<DevicePhotoScanResult> {
  return scanDevicePhotoLibrary({
    source: expoDevicePhotoPageSource,
    store: createExpoSQLiteDevicePhotoScanStore(database)
  });
}
