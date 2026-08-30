import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { LandingTagScreen } from "../src/LandingTagScreen";
import type { LandingPhoto } from "../src/landing-photo-repository";

function photo(index: number): LandingPhoto {
  return {
    id: `photo-${index}`,
    title: null,
    description: index % 2 === 0 ? "서울 도시" : "제주 바다",
    album: "한국",
    ownerId: "owner",
    createdAt: "2026-08-30T00:00:00.000Z",
    date: null,
    imageUrl: `https://example.com/${index}.jpg`,
    locationPrecision: "hidden",
    lat: null,
    lng: null,
    aiTags: [index % 2 === 0 ? "서울" : "제주", "한국"],
    aiScene: "city",
    aiSummary: null
  };
}

const photos = Array.from({ length: 24 }, (_, index) => photo(index + 1));
const content = {
  sections: [{ id: "korea", title: "한국", description: "", curatedPhotoIds: [], photos }]
};

describe("landing tag gallery", () => {
  it("shows summary, region filters, progressive photos, and photo detail navigation", async () => {
    const openPhoto = jest.fn();
    const screen = await render(
      <LandingTagScreen loadContent={async () => content} openPhoto={openPhoto} sectionId="korea" seed="test" />
    );

    await waitFor(() => expect(screen.getByText("한국")).toBeOnTheScreen());
    expect(screen.getByText("24장의 사진 · 2개 지역")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "전체 지역" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "서울 지역" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "제주 지역" })).toBeOnTheScreen();
    expect(screen.getAllByLabelText(/\uC0C1\uC138 \uBCF4\uAE30$/u)).toHaveLength(20);

    await act(async () => fireEvent.press(screen.getByRole("button", { name: "사진 더 보기" })));
    expect(screen.getByText("24장의 사진을 모두 표시했어요")).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getAllByLabelText(/\uC0C1\uC138 \uBCF4\uAE30$/u)[0]!));
    expect(openPhoto).toHaveBeenCalled();

    await act(async () => fireEvent.press(screen.getByRole("button", { name: "서울 지역" })));
    expect(screen.getByText("12장의 사진")).toBeOnTheScreen();
  });
});
