import { render } from "@testing-library/react-native";

import ExploreScreen from "../app/index";

describe("ExploreScreen", () => {
  it("renders Explore as the selected default destination", async () => {
    // Given: the standalone mobile app is opened at its root route.
    const { getByLabelText, getByRole } = await render(<ExploreScreen />);

    // When: the initial screen is visible.
    const exploreTab = getByRole("tab", { name: "Explore" });

    // Then: Explore is selected and the map surface is available.
    expect(exploreTab).toHaveProp("accessibilityState", { selected: true });
    expect(getByLabelText("서울 한강 주변 공개 사진 지도")).toBeOnTheScreen();
  });
});
