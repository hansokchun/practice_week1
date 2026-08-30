import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { PublicPhotoDetailScreen } from "../app/explore-photo/[photoId]";
import * as publicPhotoRepository from "../src/public-photo-detail-repository";

describe("public photo detail screen", () => {
  it("settles when the real route uses its default photo loader", async () => {
    const loadPhoto = jest.spyOn(publicPhotoRepository, "fetchPublicPhotoDetail").mockResolvedValue({
      id: "photo-route", date: null, description: "라우트 사진", liked: 0,
      owner: { id: "11111111-1111-4111-8111-111111111111", displayName: "여행자", avatarUrl: null },
      createdAt: "2026-08-30T08:00:00.000Z", imageUrl: "https://example.supabase.co/signed/photo-route",
      locationPrecision: "hidden", visibility: "public", viewerHasLiked: false
    });
    const screen = await render(
      <PublicPhotoDetailScreen loadComments={async () => []} photoId="photo-route" />
    );

    await waitFor(() => expect(screen.getByText("라우트 사진")).toBeOnTheScreen());
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(loadPhoto).toHaveBeenCalledTimes(1);
    loadPhoto.mockRestore();
  });

  it("renders only the safe public projection", async () => {
    const openAuthor = jest.fn();
    const loadPhoto = jest.fn(async () => ({
      id: "photo-a", date: "2026-08-24", description: "한강 저녁", liked: 7,
      owner: { id: "11111111-1111-4111-8111-111111111111", displayName: "여행자", avatarUrl: null },
      createdAt: "2026-08-24T10:00:00.000Z", imageUrl: "https://example.supabase.co/signed/photo-a",
      locationPrecision: "approximate" as const, viewerHasLiked: false
    }));
    const openOnMap = jest.fn();
    const { getByLabelText, getByRole, getByText, queryByText } = await render(
      <PublicPhotoDetailScreen loadPhoto={loadPhoto} openAuthor={openAuthor} openOnMap={openOnMap} photoId="photo-a" />
    );

    await waitFor(() => expect(getByText("한강 저녁")).toBeOnTheScreen());
    expect(getByLabelText("여행 사진")).toBeOnTheScreen();
    expect(getByText("여행자")).toBeOnTheScreen();
    expect(queryByText("근사 위치로 공개됨")).toBeNull();
    expect(getByRole("button", { name: "좋아요" })).toHaveTextContent("♡");
    expect(queryByText("좋아요 취소")).toBeNull();
    expect(queryByText(/11111111|storage_path|37\.|127\./)).not.toBeOnTheScreen();
    fireEvent.press(getByLabelText("여행자 프로필 열기"));
    expect(openAuthor).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111");
  });

  it("shows owner-only visibility and opens a safe located photo on Explore", async () => {
    const openOnMap = jest.fn();
    const ownerId = "11111111-1111-4111-8111-111111111111";
    const photo = {
      id: "photo-a", date: null, description: "내 공개 사진", liked: 2,
      owner: { id: ownerId, displayName: "나", avatarUrl: null },
      createdAt: "2026-08-24T10:00:00.000Z", imageUrl: "https://example.supabase.co/signed/photo-a",
      locationPrecision: "exact" as const, location: { lat: 37.52, lng: 126.97 }, visibility: "public" as const, viewerHasLiked: false
    };
    const screen = await render(
      <PublicPhotoDetailScreen currentUserId={ownerId} loadPhoto={async () => photo} openOnMap={openOnMap} photoId="photo-a" />
    );

    await waitFor(() => expect(screen.getByText("공개 · 정확 위치로 공개됨")).toBeOnTheScreen());
    expect(screen.getByText("-- -- · 좋아요 2")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Explore 지도에서 보기" }));
    expect(openOnMap).toHaveBeenCalledWith(photo);
  });

  it("formats provider timestamps as a calm calendar date", async () => {
    const photo = {
      id: "photo-date", date: "2026-07-24T04:30:00.000Z", description: "여름 풍경", liked: 0,
      owner: { id: "11111111-1111-4111-8111-111111111111", displayName: "여행자", avatarUrl: null },
      createdAt: "2026-07-24T04:31:00.000Z", imageUrl: "https://example.supabase.co/signed/photo-date",
      locationPrecision: "hidden" as const, visibility: "public" as const, viewerHasLiked: false
    };
    const screen = await render(
      <PublicPhotoDetailScreen loadPhoto={async () => photo} photoId="photo-date" />
    );

    await waitFor(() => expect(screen.getByText("2026. 07. 24. · 좋아요 0")).toBeOnTheScreen());
    expect(screen.queryByText(/T04:30/u)).toBeNull();
  });

  it("optimistically likes and rolls back when the mutation fails", async () => {
    const updateLike = jest.fn(async () => { throw new Error("rpc detail"); });
    const photo = {
      id: "photo-a", date: null, description: "한강 저녁", liked: 7,
      owner: { id: "11111111-1111-4111-8111-111111111111", displayName: "여행자", avatarUrl: null },
      createdAt: "2026-08-24T10:00:00.000Z", imageUrl: "https://example.supabase.co/signed/photo-a",
      locationPrecision: "hidden" as const, viewerHasLiked: false
    };
    const { getByRole, getByText } = await render(
      <PublicPhotoDetailScreen loadPhoto={async () => photo} photoId="photo-a" updateLike={updateLike} />
    );
    await waitFor(() => expect(getByRole("button", { name: "좋아요" })).toBeOnTheScreen());

    await act(async () => fireEvent.press(getByRole("button", { name: "좋아요" })));
    await waitFor(() => expect(getByText("좋아요를 변경하지 못했어요. 로그인 상태를 확인해 주세요.")).toBeOnTheScreen());
    expect(getByRole("button", { name: "좋아요" })).toBeOnTheScreen();
    expect(getByText(/좋아요 7/)).toBeOnTheScreen();
  });

  it("shows a generic retryable state without backend details", async () => {
    const { getByRole, getByText, queryByText } = await render(
      <PublicPhotoDetailScreen loadPhoto={async () => { throw new Error("row not found: secret detail"); }} photoId="photo-a" />
    );

    await waitFor(() => expect(getByText("사진을 열 수 없어요")).toBeOnTheScreen());
    expect(getByRole("button", { name: "다시 시도" })).toBeOnTheScreen();
    expect(queryByText(/secret detail|row not found/)).not.toBeOnTheScreen();
  });

  it("removes a cached photo and its comments when a refresh finds it unavailable", async () => {
    const photo = {
      id: "photo-a", date: null, description: "이제 비공개", liked: 1,
      owner: { id: "11111111-1111-4111-8111-111111111111", displayName: "여행자", avatarUrl: null },
      createdAt: "2026-08-24T10:00:00.000Z", imageUrl: "https://example.supabase.co/signed/photo-a",
      locationPrecision: "hidden" as const, viewerHasLiked: false
    };
    const loadPhoto = jest.fn().mockResolvedValueOnce(photo).mockRejectedValueOnce(new Error("private"));
    const loadComments = jest.fn().mockResolvedValue([{ id: 1, text: "캐시된 댓글", date: "2026-08-24T11:00:00.000Z", author: { id: photo.owner.id, displayName: "여행자" } }]);
    const screen = await render(<PublicPhotoDetailScreen loadComments={loadComments} loadPhoto={loadPhoto} photoId="photo-a" refreshKey={0} />);
    await waitFor(() => expect(screen.getByText("이제 비공개")).toBeOnTheScreen());
    expect(screen.getByText("캐시된 댓글")).toBeOnTheScreen();

    await screen.rerender(<PublicPhotoDetailScreen loadComments={loadComments} loadPhoto={loadPhoto} photoId="photo-a" refreshKey={1} />);

    await waitFor(() => expect(screen.getByText("사진을 열 수 없어요")).toBeOnTheScreen());
    expect(screen.queryByText("이제 비공개")).toBeNull();
    expect(screen.queryByText("캐시된 댓글")).toBeNull();
  });

  it("requeries the safe public projection when its signed image fails", async () => {
    const photo = {
      id: "photo-a", date: null, description: "서명 재발급", liked: 1,
      owner: { id: "11111111-1111-4111-8111-111111111111", displayName: "여행자", avatarUrl: null },
      createdAt: "2026-08-24T10:00:00.000Z", imageUrl: "https://example.supabase.co/signed/photo-a",
      locationPrecision: "hidden" as const, viewerHasLiked: false
    };
    const loadPhoto = jest.fn().mockResolvedValue(photo);
    const screen = await render(<PublicPhotoDetailScreen loadPhoto={loadPhoto} photoId="photo-a" />);
    await waitFor(() => expect(screen.getByText("서명 재발급")).toBeOnTheScreen());

    fireEvent(screen.getByLabelText("여행 사진"), "error");
    await waitFor(() => expect(screen.getByRole("button", { name: "여행 사진 다시 불러오기" })).toBeOnTheScreen());
    await act(async () => fireEvent.press(screen.getByRole("button", { name: "여행 사진 다시 불러오기" })));

    await waitFor(() => expect(loadPhoto).toHaveBeenCalledTimes(2));
  });
});
