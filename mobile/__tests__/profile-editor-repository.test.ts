import { fetchEditableProfile, saveEditableProfile } from "../src/profile-editor-repository";

const userId = "11111111-1111-4111-8111-111111111111";
const oldPath = `${userId}/avatar-22222222-2222-4222-8222-222222222222.jpg`;
const newPath = `${userId}/avatar-33333333-3333-4333-8333-333333333333.jpg`;

function jpegBytes(): Uint8Array {
  return Uint8Array.from([
    0xff, 0xd8,
    0xff, 0xda, 0x00, 0x03, 0x00,
    0x11,
    0xff, 0xd9
  ]);
}

describe("profile editor repository", () => {
  it("loads normalized editable fields and prefers the managed avatar path", async () => {
    await expect(fetchEditableProfile(userId, undefined, {
      fetchRow: async () => ({ row: { nickname: "  여행자  ", bio: " 천천히 걷습니다 ", avatar_url: "https://legacy.example/avatar.jpg", avatar_path: oldPath }, error: null }),
      publicAvatarUrl: (path) => `https://storage.example/${path}`
    })).resolves.toEqual({
      nickname: "여행자",
      bio: "천천히 걷습니다",
      avatarPath: oldPath,
      avatarUrl: `https://storage.example/${oldPath}`
    });
  });

  it("uploads a new immutable avatar, swaps the profile row, then removes the old object", async () => {
    const calls: string[] = [];
    const result = await saveEditableProfile({
      userId,
      nickname: " 새 이름 ",
      bio: " 새 소개 ",
      currentAvatarPath: oldPath,
      avatarChange: { kind: "replace", bytes: jpegBytes() }
    }, {
      createAvatarId: () => "33333333-3333-4333-8333-333333333333",
      uploadAvatar: async (path) => { calls.push(`upload:${path}`); return { uploaded: true, error: null }; },
      updateRow: async (_id, patch) => { calls.push(`update:${JSON.stringify(patch)}`); return { row: { ...patch }, error: null }; },
      removeAvatar: async (path) => { calls.push(`remove:${path}`); return { removed: true, error: null }; },
      publicAvatarUrl: (path) => `https://storage.example/${path}`
    });

    expect(calls).toEqual([
      `upload:${newPath}`,
      `update:${JSON.stringify({ nickname: "새 이름", bio: "새 소개", avatar_path: newPath })}`,
      `remove:${oldPath}`
    ]);
    expect(result).toEqual({ nickname: "새 이름", bio: "새 소개", avatarPath: newPath, avatarUrl: `https://storage.example/${newPath}`, cleanupPending: false });
  });

  it("deletes the newly uploaded object when the profile update fails", async () => {
    const removeAvatar = jest.fn(async () => ({ removed: true, error: null }));
    await expect(saveEditableProfile({
      userId,
      nickname: "중복 이름",
      bio: "",
      currentAvatarPath: oldPath,
      avatarChange: { kind: "replace", bytes: jpegBytes() }
    }, {
      createAvatarId: () => "33333333-3333-4333-8333-333333333333",
      uploadAvatar: async () => ({ uploaded: true, error: null }),
      updateRow: async () => ({ row: null, error: new Error("duplicate nickname detail") }),
      removeAvatar,
      publicAvatarUrl: () => null
    })).rejects.toThrow("프로필을 저장하지 못했습니다.");
    expect(removeAvatar).toHaveBeenCalledWith(newPath);
  });

  it("hides upload transport details and does not update the profile after upload failure", async () => {
    const updateRow = jest.fn();
    await expect(saveEditableProfile({
      userId,
      nickname: "여행자",
      bio: "",
      currentAvatarPath: null,
      avatarChange: { kind: "replace", bytes: jpegBytes() }
    }, {
      createAvatarId: () => "33333333-3333-4333-8333-333333333333",
      uploadAvatar: async () => { throw new Error("private transport detail"); },
      updateRow,
      removeAvatar: jest.fn(),
      publicAvatarUrl: () => null
    })).rejects.toThrow("프로필을 저장하지 못했습니다.");
    expect(updateRow).not.toHaveBeenCalled();
  });

  it("removes the profile reference before deleting an avatar and reports deferred cleanup safely", async () => {
    const calls: string[] = [];
    await expect(saveEditableProfile({
      userId,
      nickname: "여행자",
      bio: "",
      currentAvatarPath: oldPath,
      avatarChange: { kind: "remove" }
    }, {
      createAvatarId: () => "unused",
      uploadAvatar: async () => ({ uploaded: false, error: null }),
      updateRow: async (_id, patch) => { calls.push("update"); return { row: patch, error: null }; },
      removeAvatar: async () => { calls.push("remove"); return { removed: false, error: new Error("network") }; },
      publicAvatarUrl: () => null
    })).resolves.toMatchObject({ avatarPath: null, avatarUrl: null, cleanupPending: true });
    expect(calls).toEqual(["update", "remove"]);
  });

  it("rejects invalid names and unsafe avatar bytes before any network call", async () => {
    const uploadAvatar = jest.fn();
    const updateRow = jest.fn();
    await expect(saveEditableProfile({
      userId,
      nickname: " ",
      bio: "",
      currentAvatarPath: null,
      avatarChange: { kind: "replace", bytes: Uint8Array.from([1, 2, 3]) }
    }, {
      createAvatarId: () => "33333333-3333-4333-8333-333333333333",
      uploadAvatar,
      updateRow,
      removeAvatar: jest.fn(),
      publicAvatarUrl: () => null
    })).rejects.toThrow("이름을 입력해 주세요.");
    expect(uploadAvatar).not.toHaveBeenCalled();
    expect(updateRow).not.toHaveBeenCalled();
  });
});
