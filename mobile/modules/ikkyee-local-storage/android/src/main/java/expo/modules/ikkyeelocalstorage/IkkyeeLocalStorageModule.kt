package expo.modules.ikkyeelocalstorage

import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class IkkyeeLocalStorageModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("IkkyeeLocalStorage")

    AsyncFunction("getDatabaseDirectoryObservation") {
      val context = requireNotNull(appContext.reactContext) {
        "Ikkyee local storage requires an active application context"
      }
      val applicationId = context.packageName
      require(applicationId == EXPECTED_APPLICATION_ID) {
        "Unexpected Android application id"
      }

      val trustedRoot = context.noBackupFilesDir.canonicalFile
      val databaseDirectory = File(trustedRoot, "ikkyee-local").canonicalFile
      require(databaseDirectory.parentFile == trustedRoot) {
        "Database directory escaped the Android no-backup root"
      }
      require(databaseDirectory.isDirectory || databaseDirectory.mkdirs()) {
        "Unable to create the local photo database directory"
      }

      mapOf(
        "platform" to "android",
        "expectedApplicationId" to EXPECTED_APPLICATION_ID,
        "adapterApplicationId" to applicationId,
        "trustedRootUri" to Uri.fromFile(trustedRoot).toString(),
        "databaseDirectoryUri" to Uri.fromFile(databaseDirectory).toString(),
        "trustedRootKind" to "no-backup-files",
        "verification" to "native-adapter-observed"
      )
    }
  }

  private companion object {
    const val EXPECTED_APPLICATION_ID = "com.ikkyee.mobile"
  }
}
