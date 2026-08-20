# ADR 0001: Native media capability boundary

- Status: Accepted for contract implementation; Owner real-device gate deferred
- Date: 2026-08-20
- Scope: Expo SDK 57 local photo-library capability discovery

## Context

Ikkyee needs a machine-readable boundary between Expo-supported photo-library behavior and work that requires native iOS or Android code. The boundary must remain honest before device testing: `realDeviceVerified` is fixed at `false`, and local reports describe contract coverage rather than device success.

Expo SDK 57 supports Android 7 (API 24) and iOS 16.4 or later. Its current MediaLibrary API provides permissions, limited-library status, offset-based queries, EXIF/location access, foreground library-change listeners, iOS Live Photo subtype detection, and paired-video extraction. Offset pagination is resumable only as an application checkpoint; because the library can mutate between queries, the checkpoint also stores the last asset identifier and requires reconciliation on resume. This drift warning is an engineering inference from applying an offset API to a mutable collection.

## Decision

1. `mobile/src/native-media-capabilities.json` is the machine-readable source of truth. `mobile/src/native-media-capability.ts` exposes its strict readonly TypeScript shape and platform selector.
2. A run reads at most 10,000 assets in pages of 250. The resumable checkpoint contains `offset`, `lastAssetId`, and `processedAssetCount`; every resume reconciles rather than treating the offset as a durable cursor.
3. iOS uses `NSPhotoLibraryUsageDescription` and `NSPhotoLibraryAddUsageDescription`. Expo owns limited access, EXIF/GPS reads, Live Photo detection, paired-video extraction, and foreground listeners. Complete Live Photo resource enumeration remains a native `PHAssetResourceManager` gap.
4. Android maps API 24-32 reads to `READ_EXTERNAL_STORAGE`, API 33+ reads to `READ_MEDIA_IMAGES` and `READ_MEDIA_VIDEO`, and original EXIF/GPS location to `ACCESS_MEDIA_LOCATION`. MediaStore volume, version, and generation signals remain native gaps.
5. Foreground listeners are supported on both platforms. No terminated-process delivery is guaranteed, so resume reconciliation is required.
6. HEIC decoding and iCloud-original availability remain device probes. No local or CLI result may convert those probes into a device-success claim.

## Platform status and fallback matrix

`PASS` means the SDK/API or checked-in contract supports the capability. `FAIL` means Expo does not provide the required guarantee and a native or lifecycle fallback is required. `UNRESOLVED` means the behavior still requires an authorized physical device.

| Capability | iOS contract | Android contract | Fallback or native boundary | Connected-device result |
| --- | --- | --- | --- | --- |
| Minimum OS | PASS: iOS 16.4 | PASS: API 24 | Reject unsupported OS versions | UNRESOLVED |
| Full access | PASS: Expo `all` | PASS: Expo `all` | Enumerate the authorized library | UNRESOLVED |
| Limited access | PASS: Expo `limited` | PASS: Expo `limited` | Enumerate authorized assets and reconcile | UNRESOLVED |
| Denied access | PASS: Expo `none` | PASS: Expo `none` | Do not enumerate; offer request or Settings flow | UNRESOLVED |
| Revoked access | PASS: transition to `none` | PASS: transition to `none` | Stop enumeration and reconcile inaccessible records | UNRESOLVED |
| 10,000-asset pagination | PASS: bounded offset pages | PASS: bounded offset pages | Persist offset, last asset ID, and processed count; reconcile on resume | UNRESOLVED |
| EXIF and GPS | PASS | PASS with `ACCESS_MEDIA_LOCATION` | Treat missing/redacted metadata as unavailable | UNRESOLVED |
| HEIC decoding | UNRESOLVED | UNRESOLVED | Surface unsupported/unavailable state until device proof exists | UNRESOLVED |
| iCloud-only original | PASS: cloud state detection | N/A | Keep a retryable network-dependent unavailable state | UNRESOLVED |
| Live Photo detection and paired video | PASS | N/A | Use Expo subtype and temporary paired-video URI | UNRESOLVED |
| Complete Live Photo resources | FAIL | N/A | Minimal native `PHAssetResourceManager` boundary | UNRESOLVED |
| Foreground changes | PASS | PASS without incremental details | Reconcile when details are absent | UNRESOLVED |
| Terminated-process delivery | FAIL | FAIL | Reconcile on every resume | UNRESOLVED |
| MediaStore volume/version/generation | N/A | FAIL: absent from Expo | Minimal native MediaStore boundary | UNRESOLVED |

## Connected host result

The current Windows host probe used `Get-Command adb` and `Get-Command xcrun`. Both returned `UNAVAILABLE`; therefore no authorized iOS or Android device can be reached from this host. Contract and CLI rows above may be `PASS` or `FAIL`, but every physical-device result remains `UNRESOLVED` and `realDeviceVerified=false`. The exact probe is recorded in `.omo/evidence/task-3/connected-host-current.log`.

## Consequences

The boundary is intentionally not a complete adapter and does not introduce collection-management concepts. The CLI verifies the checked-in JSON hash before reporting, rejects malformed or stale input with sanitized errors, and always exposes the deferred Owner gate. Native implementation and device validation remain later work.

Cancel/resume and repeated interruption scenarios are not applicable to this contract-only task; there is no running import workflow yet. Prompt-injection text encountered in source material is untrusted documentation and is never executed.

## Official sources

- Expo SDK 57 MediaLibrary: https://docs.expo.dev/versions/v57.0.0/sdk/media-library/
- Expo SDK compatibility table: https://docs.expo.dev/versions/latest/
- Expo MediaLibrary migration guide: https://docs.expo.dev/guides/sdk-libraries-migration/media-library/
- Apple limited photo-library access: https://developer.apple.com/documentation/photokit/delivering-an-enhanced-privacy-experience-in-your-photos-app
- Apple photo-library change observation: https://developer.apple.com/documentation/photokit/observing-changes-in-the-photo-library
- Apple `PHAssetResourceManager`: https://developer.apple.com/documentation/photokit/phassetresourcemanager
- Android `MediaStore` volume, version, and generation APIs: https://developer.android.com/reference/android/provider/MediaStore
- Android shared media and original location access: https://developer.android.com/training/data-storage/shared/media

Initial constrained research reported HTTP `000` with no live source content. A later retained direct verification returned HTTP `200` with curl exit `0` for the cited Expo, Apple, and Android URLs. Those results establish URL reachability only; page content was not semantically validated, and this ADR quotes no source text.

## Owner gate

Owner must run the capability probes on supported physical iOS and Android devices, including limited access, HEIC, iCloud-only originals, GPS redaction/original access, Live Photos, foreground changes, termination/resume reconciliation, and MediaStore volume/version/generation behavior. This Owner gate must pass before Task 6 or Task 21, whichever starts first. Until those artifacts exist, `realDeviceVerified=false` is mandatory.
