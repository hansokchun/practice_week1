import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { LandingScreen } from "../src/LandingScreen";

const content = {
  sections: [{
    id: "recommended", title: "추천", description: "",
    photos: [{
      id: "photo-a", description: "제주 바다", title: null, album: "한국", ownerId: "owner-a",
      createdAt: "2026-08-27T00:00:00.000Z", date: null,
      imageUrl: "https://example.supabase.co/signed/photo-a", locationPrecision: "approximate" as const,
      lat: 33.4, lng: 126.5
    }]
  }]
};

describe("web-parity landing screen", () => {
  it("starts with search, curated rows, map entry, photo upload, and the signed-in account menu", async () => {
    const navigate = jest.fn();
    const openPhoto = jest.fn();
    const screen = await render(
      <LandingScreen loadContent={async () => content} navigate={navigate} openPhoto={openPhoto} signedIn />
    );

    await waitFor(() => expect(screen.getByText("추천")).toBeOnTheScreen());
    expect(screen.getByText("이끼에서 당신만의 장소를 찾아보세요")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "제주 바다" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "서울 야경" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "일본" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "부산" })).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "도쿄 골목" })).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "벚꽃 여행" })).not.toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByRole("button", { name: "사진 추가" })));
    expect(navigate).toHaveBeenCalledWith("/upload");
    await act(async () => fireEvent.press(screen.getByRole("button", { name: "계정 메뉴 열기" })));
    expect(screen.getByRole("button", { name: "내 프로필" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "내 사진" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "좋아요한 사진" })).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByRole("button", { name: "지도에서 찾아보기" })));
    expect(navigate).toHaveBeenCalledWith("/explore");
    expect(screen.queryByText("지도에서 찾아보세요")).not.toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByRole("button", { name: "제주 바다 상세 보기" })));
    expect(openPhoto).toHaveBeenCalledWith("photo-a");
  });

  it("filters landing photos and sends guest photo upload through login", async () => {
    const navigate = jest.fn();
    const screen = await render(<LandingScreen loadContent={async () => content} navigate={navigate} signedIn={false} />);
    await waitFor(() => expect(screen.getByText("추천")).toBeOnTheScreen());
    await act(async () => fireEvent.changeText(screen.getByLabelText("공개 사진 검색"), "도쿄"));
    await act(async () => fireEvent.press(screen.getByRole("button", { name: "공개 사진 검색 실행" })));
    expect(screen.getByText("검색 결과가 없어요.")).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByRole("button", { name: "사진 추가" })));
    expect(navigate).toHaveBeenCalledWith("/auth/login");
  });
});
