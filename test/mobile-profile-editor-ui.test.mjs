import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const editorUrl = new URL("../mobile/src/ProfileEditor.tsx", import.meta.url);
const profileScreenUrl = new URL("../mobile/app/profile.tsx", import.meta.url);

test("signed-in profile screen exposes accessible profile editing controls", async () => {
  const [editor, profileScreen] = await Promise.all([
    readFile(editorUrl, "utf8"),
    readFile(profileScreenUrl, "utf8")
  ]);

  assert.match(profileScreen, /<ProfileEditor userId=\{auth\.user\.id\}/u);
  assert.match(editor, /accessibilityLabel="프로필 이름"/u);
  assert.match(editor, /accessibilityLabel="프로필 소개"/u);
  assert.match(editor, /accessibilityLabel="프로필 사진 선택"/u);
  assert.match(editor, /accessibilityLabel="프로필 사진 제거"/u);
  assert.match(editor, /accessibilityLabel="프로필 저장"/u);
  assert.match(editor, /maxLength=\{40\}/u);
  assert.match(editor, /maxLength=\{300\}/u);
  assert.match(editor, /프로필을 저장하지 못했어요/u);
  assert.doesNotMatch(editor, /console\.(?:log|error|warn)/u);
});
