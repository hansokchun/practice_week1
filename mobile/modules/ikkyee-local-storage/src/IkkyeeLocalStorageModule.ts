import { requireNativeModule } from "expo";

import type { NativeDirectoryObservation } from "./IkkyeeLocalStorage.types";

type IkkyeeLocalStorageModule = {
  readonly getDatabaseDirectoryObservation: () => Promise<NativeDirectoryObservation>;
};

export default requireNativeModule<IkkyeeLocalStorageModule>("IkkyeeLocalStorage");
