import { act, fireEvent, render } from "@testing-library/react-native";

import { LegalLinks, storePublicUrls } from "../src/LegalLinks";

describe("store public links", () => {
  it("opens privacy, support, and account-deletion resources outside the app", async () => {
    const openUrl = jest.fn(async () => undefined);
    const screen = await render(<LegalLinks openUrl={openUrl} />);

    for (const [label, url] of [
      ["개인정보 처리방침", storePublicUrls.privacy],
      ["지원", storePublicUrls.support],
      ["계정 삭제 안내", storePublicUrls.accountDeletion]
    ] as const) {
      await act(async () => fireEvent.press(screen.getByRole("link", { name: label })));
      expect(openUrl).toHaveBeenCalledWith(url);
    }
  });
});
