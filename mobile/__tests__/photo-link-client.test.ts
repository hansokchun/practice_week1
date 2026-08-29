import { fetchLinkedPhoto } from "../src/photo-link-client";
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";

describe("photo link client", () => {
  it("sends the token only to the dedicated function and accepts its safe projection", async () => {
    const invoke = jest.fn(async () => ({
      data: { photo: {
        id: "photo-a", date: "2026-08-24", description: "서울의 저녁", liked: 0,
        ownerId: "owner-a", createdAt: "2026-08-24T10:00:00.000Z",
        imageUrl: "https://example.supabase.co/storage/v1/object/sign/photos/a.jpg?token=signed"
      } },
      error: null
    }));
    const token = "b".repeat(64);

    await expect(fetchLinkedPhoto(token, { invoke })).resolves.toMatchObject({ id: "photo-a", description: "서울의 저녁" });
    expect(invoke).toHaveBeenCalledWith("photo-link", { body: { token } });
  });

  it("rejects malformed tokens before making a network request", async () => {
    const invoke = jest.fn();

    await expect(fetchLinkedPhoto("not-a-token", { invoke })).rejects.toThrow("공유 링크");
    expect(invoke).not.toHaveBeenCalled();
  });

  it("maps function errors and unsafe response fields to one generic failure", async () => {
    const token = "c".repeat(64);
    await expect(fetchLinkedPhoto(token, {
      invoke: async () => ({ data: null, error: new Error("database detail") })
    })).rejects.toThrow("공유 링크");
    await expect(fetchLinkedPhoto(token, {
      invoke: async () => ({ data: { photo: { id: "photo-a", imageUrl: "javascript:alert(1)" } }, error: null })
    })).rejects.toThrow("공유 링크");
  });

  it("separates retryable relay, fetch, and 5xx failures from unavailable links", async () => {
    const token = "d".repeat(64);
    for (const error of [
      new FunctionsFetchError(new Error("offline detail")),
      new FunctionsRelayError(new Error("relay detail")),
      new FunctionsHttpError(new Response(null, { status: 503 }))
    ]) {
      await expect(fetchLinkedPhoto(token, {
        invoke: async () => ({ data: null, error })
      })).rejects.toMatchObject({ kind: "retryable", message: "공유 링크를 불러오지 못했습니다." });
    }

    await expect(fetchLinkedPhoto(token, {
      invoke: async () => ({ data: null, error: new FunctionsHttpError(new Response(null, { status: 404 })) })
    })).rejects.toMatchObject({ kind: "unavailable", message: "공유 링크를 열 수 없습니다." });
  });
});
