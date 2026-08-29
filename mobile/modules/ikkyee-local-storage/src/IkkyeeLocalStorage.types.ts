export type NativeDirectoryObservation =
  | {
      readonly platform: "android";
      readonly expectedApplicationId: string;
      readonly adapterApplicationId: string;
      readonly trustedRootUri: string;
      readonly databaseDirectoryUri: string;
      readonly trustedRootKind: "no-backup-files";
      readonly verification: "native-adapter-observed";
    }
  | {
      readonly platform: "ios";
      readonly expectedBundleId: string;
      readonly adapterBundleId: string;
      readonly trustedRootUri: string;
      readonly databaseDirectoryUri: string;
      readonly trustedRootKind: "application-support";
      readonly verification: "native-adapter-observed";
      readonly nativeBackupExclusion: "verified";
    };
