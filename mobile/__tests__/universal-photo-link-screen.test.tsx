import { render, waitFor } from "@testing-library/react-native";

import { UniversalPhotoLinkScreen } from "../app/photo-link/index";

const token = "c".repeat(64);
const photo = {
  id: "photo-a", date: null, description: "HTTPS 공유 사진", liked: 0,
  ownerId: "owner-a", createdAt: "2026-08-26T00:00:00.000Z",
  imageUrl: "https://example.supabase.co/signed/photo-a"
};

describe("UniversalPhotoLinkScreen", () => {
  it("opens a validated fragment token through the existing private-link client", async () => {
    const loadPhoto = jest.fn(async () => photo);
    const screen = await render(
      <UniversalPhotoLinkScreen
        currentUrl={`https://practice-week1-cws.pages.dev/photo-link#${token}`}
        loadPhoto={loadPhoto}
        publicOrigin="https://practice-week1-cws.pages.dev"
      />
    );

    await waitFor(() => expect(screen.getByText("HTTPS 공유 사진")).toBeOnTheScreen());
    expect(loadPhoto).toHaveBeenCalledWith(token);
  });

  it("rejects the same token from an unassociated origin before any backend call", async () => {
    const loadPhoto = jest.fn(async () => photo);
    const screen = await render(
      <UniversalPhotoLinkScreen
        currentUrl={`https://attacker.example/photo-link#${token}`}
        loadPhoto={loadPhoto}
        publicOrigin="https://practice-week1-cws.pages.dev"
      />
    );

    await waitFor(() => expect(screen.getByText("공유 사진을 열 수 없어요")).toBeOnTheScreen());
    expect(loadPhoto).not.toHaveBeenCalled();
  });
});
