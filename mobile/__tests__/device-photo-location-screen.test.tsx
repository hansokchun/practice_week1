import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { DevicePhotoLocationScreen } from "../app/device-photo/[assetId]/location";

describe("device photo private location screen", () => {
  it("saves a map-picked private location without rendering raw coordinates", async () => {
    const saveLocation = jest.fn(async () => undefined);
    const goBack = jest.fn();
    const { getByLabelText, getByRole, getByText, queryByText } = await render(
      <DevicePhotoLocationScreen
        assetId="asset-missing"
        goBack={goBack}
        loadLocation={async () => null}
        saveLocation={saveLocation}
      />
    );

    await waitFor(() => expect(getByText("사진 위치를 선택해 주세요")).toBeOnTheScreen());
    await act(async () => {
      fireEvent.press(getByLabelText("비공개 위치 선택 지도"), {
        nativeEvent: { locationX: 160, locationY: 180 }
      });
    });
    expect(getByText("새 위치를 선택했어요")).toBeOnTheScreen();
    expect(queryByText(/0(?:\.0+)?[, ]+0/)).not.toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "이 위치 저장" }));
    });
    await waitFor(() => expect(saveLocation).toHaveBeenCalledWith("asset-missing", {
      latitude: 0,
      longitude: 0
    }));
    expect(goBack).toHaveBeenCalledTimes(1);
  });
});
