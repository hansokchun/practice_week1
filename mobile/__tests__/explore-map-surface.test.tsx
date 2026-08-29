import { fireEvent, render } from "@testing-library/react-native";

import { ExploreMapSurface } from "../src/ExploreMapSurface.native";

const bounds = { north: 37.72, south: 37.42, east: 127.18, west: 126.76 };

describe("Explore native map surface", () => {
  it("reports completed camera bounds and routes marker selection", async () => {
    const onBoundsChange = jest.fn();
    const onClusterPress = jest.fn();
    const screen = await render(
      <ExploreMapSurface
        bounds={bounds}
        clusters={[{
          id: "cluster:photo-a",
          photoIds: ["photo-a"],
          latitude: 37.52,
          longitude: 126.97,
          leftPercent: 50,
          topPercent: 50,
          pointBounds: { north: 37.52, south: 37.52, east: 126.97, west: 126.97 }
        }]}
        nativeMapsEnabled
        onBoundsChange={onBoundsChange}
        onClusterPress={onClusterPress}
        selectedPhotoId={null}
      />
    );

    const map = screen.getByTestId("native-explore-map");
    expect(map.props["provider"]).toBe("google");
    await fireEvent(map, "regionChangeComplete", {
      latitude: 35.15,
      longitude: 129.1,
      latitudeDelta: 0.3,
      longitudeDelta: 0.4
    });
    expect(onBoundsChange).toHaveBeenCalledWith({
      north: expect.closeTo(35.3, 8),
      south: expect.closeTo(35, 8),
      east: expect.closeTo(129.3, 8),
      west: expect.closeTo(128.9, 8)
    });

    await fireEvent.press(screen.getByRole("button", { name: "공개 사진 위치 1" }));
    expect(onClusterPress).toHaveBeenCalledWith(["photo-a"]);
  });

  it("ignores an incomplete native camera report without exposing an error", async () => {
    const onBoundsChange = jest.fn();
    const screen = await render(
      <ExploreMapSurface bounds={bounds} clusters={[]} nativeMapsEnabled onBoundsChange={onBoundsChange} onClusterPress={jest.fn()} selectedPhotoId={null} />
    );

    await fireEvent(screen.getByTestId("native-explore-map"), "regionChangeComplete", {
      latitude: 37.5,
      longitude: 127,
      latitudeDelta: 0,
      longitudeDelta: 0.1
    });
    expect(onBoundsChange).not.toHaveBeenCalled();
  });

  it("keeps the non-network fallback when restricted native keys are not configured", async () => {
    const screen = await render(
      <ExploreMapSurface bounds={bounds} clusters={[]} nativeMapsEnabled={false} onBoundsChange={jest.fn()} onClusterPress={jest.fn()} selectedPhotoId={null} />
    );

    expect(screen.getByTestId("explore-map-fallback")).toBeOnTheScreen();
    expect(screen.queryByTestId("native-explore-map")).toBeNull();
  });

  it("moves the controlled native camera when a searched place changes bounds", async () => {
    const busanBounds = { north: 35.3, south: 35.0, east: 129.3, west: 128.9 };
    const props = {
      clusters: [], nativeMapsEnabled: true, onBoundsChange: jest.fn(),
      onClusterPress: jest.fn(), selectedPhotoId: null
    } as const;
    const screen = await render(<ExploreMapSurface {...props} bounds={bounds} />);

    await screen.rerender(<ExploreMapSurface {...props} bounds={busanBounds} />);

    const region = screen.getByTestId("native-explore-map").props["region"];
    expect(region.latitude).toBeCloseTo(35.15, 8);
    expect(region.longitude).toBeCloseTo(129.1, 8);
    expect(region.latitudeDelta).toBeCloseTo(0.3, 8);
    expect(region.longitudeDelta).toBeCloseTo(0.4, 8);
  });
});
