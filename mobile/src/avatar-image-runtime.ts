import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import { MAX_AVATAR_BYTES } from "./profile-editor-repository";
import { sanitizePublicationJpegMetadata } from "./publication-jpeg-sanitizer";

export type PreparedAvatar = { readonly previewUri: string; readonly bytes: Uint8Array };

export async function pickPreparedAvatar(): Promise<PreparedAvatar | null> {
  const ImagePicker = await import("expo-image-picker");
  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    aspect: [1, 1],
    mediaTypes: ["images"],
    quality: 1
  });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  if (asset === undefined || asset.type === "video") throw new Error("사진만 선택할 수 있습니다.");
  const longest = Math.max(asset.width, asset.height);
  const ratio = longest > 512 ? 512 / longest : 1;
  const context = ImageManipulator.manipulate(asset.uri);
  if (ratio < 1) context.resize({ width: Math.round(asset.width * ratio), height: Math.round(asset.height * ratio) });
  const image = await context.renderAsync();
  let renderedUri: string | null = null;
  try {
    const rendered = await image.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
    renderedUri = rendered.uri;
    const file = new File(rendered.uri);
    const bytes = sanitizePublicationJpegMetadata(await file.bytes());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_AVATAR_BYTES) throw new Error("프로필 사진은 2MB 이하로 선택해 주세요.");
    return { previewUri: asset.uri, bytes };
  } finally {
    if (renderedUri !== null) {
      const file = new File(renderedUri);
      if (file.exists) file.delete();
    }
    image.release();
    context.release();
  }
}
