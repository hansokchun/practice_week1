import { updateOwnedPhoto } from "../src/owned-photo-mutation-repository";

describe("owned photo mutation repository", () => {
  it("updates only the authenticated owner's shared web photo row", async () => {
    const mutate = jest.fn(async () => ({
      row: { description: "웹과 공유", visibility: "public", location_precision: "exact" },
      error: null
    }));

    await expect(updateOwnedPhoto(
      "photo-a",
      "11111111-1111-4111-8111-111111111111",
      { description: "웹과 공유", visibility: "public", locationPrecision: "exact" },
      mutate
    )).resolves.toEqual({
      description: "웹과 공유",
      visibility: "public",
      locationPrecision: "exact"
    });
    expect(mutate).toHaveBeenCalledWith("photo-a", "11111111-1111-4111-8111-111111111111", {
      description: "웹과 공유",
      visibility: "public",
      shared: true,
      location_precision: "exact"
    });
  });

  it("rejects malformed input before a server write", async () => {
    const mutate = jest.fn();
    await expect(updateOwnedPhoto("../photo", "not-a-user", {
      description: "x", visibility: "private", locationPrecision: "approximate"
    }, mutate)).rejects.toThrow("사진을 수정하지 못했습니다");
    expect(mutate).not.toHaveBeenCalled();
  });
});
