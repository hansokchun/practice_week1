import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Pressable } from "react-native";

import { ExploreScreen } from "../app/(tabs)/index";
import type { ExploreMapSurfaceProps } from "../src/ExploreMapSurface.types";
import { SEOUL_EXPLORE_BOUNDS } from "../src/explore-photo-repository";
import { PlaceSearchError } from "../src/place-search";

describe("ExploreScreen", () => {
  it("renders the public map at the default destination", async () => {
    // Given: the standalone mobile app is opened at its root route.
    const loadPage = jest.fn(async () => ({ photos: [], hasMore: false, nextOffset: 0 }));
    const { getByLabelText, getByText } = await render(<ExploreScreen loadPage={loadPage} />);

    // When: the initial screen is visible.
    // Then: the map surface is available. The router layout owns tab selection.
    expect(getByLabelText("현재 영역의 공개 사진 지도")).toBeOnTheScreen();
    await waitFor(() => expect(getByText("이 지도 영역에 공개 사진이 없어요")).toBeOnTheScreen());
    expect(loadPage).toHaveBeenCalledWith(expect.objectContaining({ offset: 0, pageSize: 20, signal: expect.any(AbortSignal) }));
  });

  it("renders queried public photos instead of fixed sample markers", async () => {
    const openPhoto = jest.fn();
    const loadPage = jest.fn(async () => ({
      photos: [{
        id: "photo-a", date: "2026-08-24", description: "한강 저녁", liked: 3,
        ownerId: "owner-a", createdAt: "2026-08-24T10:00:00.000Z",
        imageUrl: "https://example.supabase.co/signed/photo-a", lat: 37.52, lng: 126.97
      }],
      hasMore: false,
      nextOffset: 1
    }));
    const { getByLabelText, getByRole, getByText, queryByText } = await render(<ExploreScreen loadPage={loadPage} openPhoto={openPhoto} />);

    await waitFor(() => expect(getByLabelText("공개 사진 위치 1")).toBeOnTheScreen());
    expect(getByText("한강 저녁")).toBeOnTheScreen();
    expect(queryByText("강변에서 만난 늦은 오후")).not.toBeOnTheScreen();
    fireEvent.press(getByRole("button", { name: "사진 자세히 보기" }));
    expect(openPhoto).toHaveBeenCalledWith("photo-a");
  });

  it("removes a cached map preview after a focused public-scope refresh", async () => {
    const page = {
      photos: [{
        id: "photo-a", date: null, description: "삭제될 미리보기", liked: 0, ownerId: "owner-a",
        createdAt: "2026-08-24T10:00:00.000Z", imageUrl: "https://example.supabase.co/signed/photo-a",
        lat: 37.52, lng: 126.97
      }],
      hasMore: false,
      nextOffset: 1
    };
    const loadPage = jest.fn().mockResolvedValueOnce(page).mockResolvedValueOnce({ photos: [], hasMore: false, nextOffset: 0 });
    const screen = await render(<ExploreScreen loadPage={loadPage} refreshKey={0} />);
    await waitFor(() => expect(screen.getByText("삭제될 미리보기")).toBeOnTheScreen());

    await screen.rerender(<ExploreScreen loadPage={loadPage} refreshKey={1} />);

    await waitFor(() => expect(screen.getByText("이 지도 영역에 공개 사진이 없어요")).toBeOnTheScreen());
    expect(screen.queryByText("삭제될 미리보기")).toBeNull();
  });

  it("surfaces and retries a pagination network failure without discarding loaded photos", async () => {
    const firstPage = {
      photos: [{
        id: "photo-a", date: null, description: "유지할 사진", liked: 0, ownerId: "owner-a",
        createdAt: "2026-08-24T10:00:00.000Z", imageUrl: "https://example.supabase.co/signed/photo-a",
        lat: 37.52, lng: 126.97
      }],
      hasMore: true,
      nextOffset: 1
    };
    const loadPage = jest.fn()
      .mockResolvedValueOnce(firstPage)
      .mockRejectedValueOnce(new Error("network detail"))
      .mockResolvedValueOnce({ photos: [], hasMore: false, nextOffset: 1 });
    const screen = await render(<ExploreScreen loadPage={loadPage} />);
    await waitFor(() => expect(screen.getByText("유지할 사진")).toBeOnTheScreen());

    await fireEvent.press(screen.getByRole("button", { name: "추가 공개 사진 불러오기" }));
    await waitFor(() => expect(screen.getByText("사진을 더 불러오지 못했어요.")).toBeOnTheScreen());
    expect(screen.getByText("유지할 사진")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "추가 공개 사진 다시 시도" }));
    await waitFor(() => expect(screen.queryByText("사진을 더 불러오지 못했어요.")).toBeNull());
    expect(loadPage).toHaveBeenCalledTimes(3);
  });

  it("does not request public photos while offline and retries after connectivity returns", async () => {
    const loadPage = jest.fn(async () => ({ photos: [], hasMore: false, nextOffset: 0 }));
    const getConnectivity = jest.fn()
      .mockResolvedValueOnce("offline")
      .mockResolvedValueOnce("online");
    const screen = await render(<ExploreScreen loadPage={loadPage} getConnectivity={getConnectivity} />);

    await waitFor(() => expect(screen.getByText("인터넷 연결이 없어요")).toBeOnTheScreen());
    expect(screen.getByText("연결을 확인한 뒤 다시 시도해 주세요.")).toBeOnTheScreen();
    expect(loadPage).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole("button", { name: "연결 후 다시 시도" }));

    await waitFor(() => expect(screen.getByText("이 지도 영역에 공개 사진이 없어요")).toBeOnTheScreen());
    expect(loadPage).toHaveBeenCalledTimes(1);
  });

  it("preserves loaded photos when an additional page is requested offline", async () => {
    const loadPage = jest.fn(async () => ({
      photos: [{
        id: "photo-a", date: null, description: "오프라인에도 유지할 사진", liked: 0, ownerId: "owner-a",
        createdAt: "2026-08-24T10:00:00.000Z", imageUrl: "https://example.supabase.co/signed/photo-a",
        lat: 37.52, lng: 126.97
      }],
      hasMore: true,
      nextOffset: 1
    }));
    const getConnectivity = jest.fn()
      .mockResolvedValueOnce("online")
      .mockResolvedValueOnce("offline");
    const screen = await render(<ExploreScreen loadPage={loadPage} getConnectivity={getConnectivity} />);
    await waitFor(() => expect(screen.getByText("오프라인에도 유지할 사진")).toBeOnTheScreen());

    await fireEvent.press(screen.getByRole("button", { name: "추가 공개 사진 불러오기" }));

    await waitFor(() => expect(screen.getByText("인터넷 연결 후 사진을 더 불러올 수 있어요.")).toBeOnTheScreen());
    expect(screen.getByText("오프라인에도 유지할 사진")).toBeOnTheScreen();
    expect(loadPage).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "추가 공개 사진 다시 시도" })).toBeOnTheScreen();
  });

  it("renders nearby photos as one accessible marker and cycles its selection", async () => {
    const loadPage = jest.fn(async () => ({
      photos: [
        {
          id: "photo-a", date: null, description: "첫 번째 군집 사진", liked: 0, ownerId: "owner-a",
          createdAt: "2026-08-24T10:00:00.000Z", imageUrl: "https://example.supabase.co/signed/photo-a",
          lat: 37.52, lng: 126.97
        },
        {
          id: "photo-b", date: null, description: "두 번째 군집 사진", liked: 0, ownerId: "owner-b",
          createdAt: "2026-08-24T09:00:00.000Z", imageUrl: "https://example.supabase.co/signed/photo-b",
          lat: 37.521, lng: 126.971
        }
      ],
      hasMore: false,
      nextOffset: 2
    }));
    const screen = await render(<ExploreScreen loadPage={loadPage} getConnectivity={async () => "online"} />);
    await waitFor(() => expect(screen.getByText("첫 번째 군집 사진")).toBeOnTheScreen());

    expect(screen.getAllByRole("button", { name: "공개 사진 2장 모음" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "공개 사진 위치 2" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "공개 사진 2장 모음" }));

    expect(screen.getByText("두 번째 군집 사진")).toBeOnTheScreen();
  });

  it("refreshes the public page when the selected signed image fails", async () => {
    const page = {
      photos: [{
        id: "photo-a", date: null, description: "서명 갱신 사진", liked: 0, ownerId: "owner-a",
        createdAt: "2026-08-24T10:00:00.000Z", imageUrl: "https://example.supabase.co/signed/photo-a",
        lat: 37.52, lng: 126.97
      }],
      hasMore: false,
      nextOffset: 1
    };
    const loadPage = jest.fn().mockResolvedValue(page);
    const screen = await render(<ExploreScreen loadPage={loadPage} getConnectivity={async () => "online"} />);
    await waitFor(() => expect(screen.getByText("서명 갱신 사진")).toBeOnTheScreen());

    fireEvent(screen.getByLabelText("선택한 공개 사진"), "error");
    await waitFor(() => expect(screen.getByRole("button", { name: "선택한 공개 사진 다시 불러오기" })).toBeOnTheScreen());
    await act(async () => fireEvent.press(screen.getByRole("button", { name: "선택한 공개 사진 다시 불러오기" })));

    await waitFor(() => expect(loadPage).toHaveBeenCalledTimes(2));
  });

  it("aborts the old page and reloads offset zero for the completed native map viewport", async () => {
    const movedBounds = { north: 35.3, south: 35.0, east: 129.3, west: 128.9 };
    const loadPage = jest.fn(async () => ({ photos: [], hasMore: false, nextOffset: 0 }));
    function MapSurface({ onBoundsChange }: ExploreMapSurfaceProps) {
      return <Pressable accessibilityLabel="부산으로 지도 이동" accessibilityRole="button" onPress={() => onBoundsChange(movedBounds)} />;
    }
    const screen = await render(<ExploreScreen loadPage={loadPage} MapSurface={MapSurface} />);
    await waitFor(() => expect(loadPage).toHaveBeenCalledTimes(1));

    await fireEvent.press(screen.getByRole("button", { name: "부산으로 지도 이동" }));

    await waitFor(() => expect(loadPage).toHaveBeenCalledTimes(2));
    expect(loadPage).toHaveBeenLastCalledWith(expect.objectContaining({ bounds: movedBounds, offset: 0, pageSize: 20 }));
  });

  it("searches a place, shows provider attribution, and moves the live viewport to the selected result", async () => {
    const busanBounds = { north: 35.13, south: 35.1, east: 129.06, west: 129.02 };
    const loadPage = jest.fn(async () => ({ photos: [], hasMore: false, nextOffset: 0 }));
    const busanResults = [{
      id: "place-busan-station", name: "부산역", address: "부산 동구",
      latitude: 35.1151, longitude: 129.0414, viewport: busanBounds
    }];
    let resolveSearch!: (places: typeof busanResults) => void;
    const searchPlaces = jest.fn(() => new Promise<typeof busanResults>((resolve) => { resolveSearch = resolve; }));
    const screen = await render(
      <ExploreScreen loadPage={loadPage} searchPlaces={searchPlaces} getConnectivity={async () => "online"} />
    );
    await waitFor(() => expect(loadPage).toHaveBeenCalledTimes(1));

    await fireEvent.changeText(screen.getByLabelText("장소 검색"), "부산역");
    await fireEvent(screen.getByLabelText("장소 검색"), "submitEditing");
    await waitFor(() => expect(searchPlaces).toHaveBeenCalledWith("부산역", SEOUL_EXPLORE_BOUNDS));
    await act(async () => { resolveSearch(busanResults); });

    await waitFor(() => expect(screen.getByRole("button", { name: "부산역 부산 동구로 지도 이동" })).toBeOnTheScreen());
    expect(screen.getByText("Powered by Google")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "부산역 부산 동구로 지도 이동" }));

    await waitFor(() => expect(loadPage).toHaveBeenLastCalledWith(expect.objectContaining({
      bounds: busanBounds, offset: 0, pageSize: 20, scope: "others", viewerId: null
    })));
    expect(screen.getByText("부산역")).toBeOnTheScreen();
  });

  it("starts a signed-in viewer on all owned located photos and can switch to other public photos", async () => {
    const loadPage = jest.fn(async () => ({ photos: [], hasMore: false, nextOffset: 0 }));
    const screen = await render(<ExploreScreen loadOwnerBounds={async () => null} loadPage={loadPage} viewerId="owner-a" getConnectivity={async () => "online"} />);
    await waitFor(() => expect(loadPage).toHaveBeenCalledTimes(1));
    expect(loadPage).toHaveBeenLastCalledWith(expect.objectContaining({ scope: "mine", viewerId: "owner-a" }));
    expect(screen.getByRole("button", { name: "사진 범위 내 사진" })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "사진 범위 내 사진" }));
    await fireEvent.press(screen.getByRole("button", { name: "다른 사람 사진 보기" }));

    await waitFor(() => expect(loadPage).toHaveBeenCalledTimes(2));
    expect(loadPage).toHaveBeenLastCalledWith(expect.objectContaining({ scope: "others", viewerId: "owner-a", offset: 0 }));
    expect(screen.getByRole("button", { name: "사진 범위 다른 사람 사진" })).toBeOnTheScreen();
  });

  it("fits the first signed-in Explore viewport around the owner's located photos", async () => {
    const ownerBounds = { north: 38.1, south: 33.0, east: 130.0, west: 126.0 };
    const loadPage = jest.fn(async () => ({ photos: [], hasMore: false, nextOffset: 0 }));
    await render(
      <ExploreScreen loadOwnerBounds={async () => ownerBounds} loadPage={loadPage} viewerId="owner-a" getConnectivity={async () => "online"} />
    );

    await waitFor(() => expect(loadPage).toHaveBeenCalledWith(expect.objectContaining({ bounds: ownerBounds, scope: "mine" })));
  });

  it("offers a safe retry when the Places quota is temporarily exceeded", async () => {
    const loadPage = jest.fn(async () => ({ photos: [], hasMore: false, nextOffset: 0 }));
    const searchPlaces = jest.fn(async () => { throw new PlaceSearchError("quota"); });
    const screen = await render(<ExploreScreen loadPage={loadPage} searchPlaces={searchPlaces} getConnectivity={async () => "online"} />);
    await waitFor(() => expect(loadPage).toHaveBeenCalledTimes(1));

    await fireEvent.changeText(screen.getByLabelText("장소 검색"), "부산역");
    await fireEvent(screen.getByLabelText("장소 검색"), "submitEditing");

    await waitFor(() => expect(screen.getByText("장소 검색 사용량이 잠시 초과됐어요.")).toBeOnTheScreen());
    expect(screen.getByRole("button", { name: "장소 검색 다시 시도" })).toBeOnTheScreen();
  });

  it("does not ask the user to retry an invalid release key configuration", async () => {
    const loadPage = jest.fn(async () => ({ photos: [], hasMore: false, nextOffset: 0 }));
    const searchPlaces = jest.fn(async () => { throw new PlaceSearchError("configuration"); });
    const screen = await render(<ExploreScreen loadPage={loadPage} searchPlaces={searchPlaces} getConnectivity={async () => "online"} />);
    await waitFor(() => expect(loadPage).toHaveBeenCalledTimes(1));

    await fireEvent.changeText(screen.getByLabelText("장소 검색"), "부산역");
    await fireEvent(screen.getByLabelText("장소 검색"), "submitEditing");

    await waitFor(() => expect(screen.getByText("장소 검색을 잠시 사용할 수 없어요.")).toBeOnTheScreen());
    expect(screen.queryByRole("button", { name: "장소 검색 다시 시도" })).toBeNull();
  });
});
