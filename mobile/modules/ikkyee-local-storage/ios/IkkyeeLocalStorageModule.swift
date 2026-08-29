import ExpoModulesCore
import Foundation

public final class IkkyeeLocalStorageModule: Module {
  public func definition() -> ModuleDefinition {
    Name("IkkyeeLocalStorage")

    AsyncFunction("getDatabaseDirectoryObservation") { () -> [String: String] in
      let fileManager = FileManager.default
      guard let trustedRoot = fileManager.urls(
        for: .applicationSupportDirectory,
        in: .userDomainMask
      ).first else {
        throw IkkyeeLocalStorageError("Application Support directory is unavailable")
      }
      guard let bundleId = Bundle.main.bundleIdentifier, bundleId == expectedBundleId else {
        throw IkkyeeLocalStorageError("Unexpected iOS bundle identifier")
      }

      try fileManager.createDirectory(
        at: trustedRoot,
        withIntermediateDirectories: true
      )
      var databaseDirectory = trustedRoot.appendingPathComponent("ikkyee-local", isDirectory: true)
      try fileManager.createDirectory(
        at: databaseDirectory,
        withIntermediateDirectories: true
      )

      var resourceValues = URLResourceValues()
      resourceValues.isExcludedFromBackup = true
      try databaseDirectory.setResourceValues(resourceValues)
      let observedValues = try databaseDirectory.resourceValues(
        forKeys: [.isExcludedFromBackupKey]
      )
      guard observedValues.isExcludedFromBackup == true else {
        throw IkkyeeLocalStorageError("iOS did not verify backup exclusion")
      }

      return [
        "platform": "ios",
        "expectedBundleId": expectedBundleId,
        "adapterBundleId": bundleId,
        "trustedRootUri": canonicalDirectoryUri(trustedRoot),
        "databaseDirectoryUri": canonicalDirectoryUri(databaseDirectory),
        "trustedRootKind": "application-support",
        "verification": "native-adapter-observed",
        "nativeBackupExclusion": "verified"
      ]
    }
  }
}

private let expectedBundleId = "com.ikkyee.mobile"

private func canonicalDirectoryUri(_ url: URL) -> String {
  url.standardizedFileURL.absoluteString.trimmingCharacters(
    in: CharacterSet(charactersIn: "/")
  )
}

private struct IkkyeeLocalStorageError: Error, CustomStringConvertible {
  let description: String

  init(_ description: String) {
    self.description = description
  }
}
