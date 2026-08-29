import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { PublicationReviewScreen } from "../app/publish/review";

describe("publication selection review", () => {
  it("requires a second confirmation without claiming an upload has started", async () => {
    const publish = jest.fn(async () => ({ succeeded: 2, failed: 0, jobIds: ["job-a", "job-b"] }));
    const prepareDerivatives = jest.fn(async () => [{
      assetId: "asset-a",
      uri: "file:///cache/ikkyee-derivatives/a.jpg",
      width: 1600,
      height: 1200,
      byteSize: 300_000,
      format: "jpeg" as const,
      metadataPolicy: "stripped" as const,
      createdAt: 1_000,
      expiresAt: 3_601_000
    }, {
      assetId: "asset-b",
      uri: "file:///cache/ikkyee-derivatives/b.jpg",
      width: 1200,
      height: 1600,
      byteSize: 310_000,
      format: "jpeg" as const,
      metadataPolicy: "stripped" as const,
      createdAt: 1_000,
      expiresAt: 3_601_000
    }]);
    const { getByRole, getByText, queryByText } = await render(
      <PublicationReviewScreen
        goBack={jest.fn()}
        prepareDerivatives={prepareDerivatives}
        publish={publish}
        selection={{ intent: "public", assetIds: ["asset-a", "asset-b"] }}
      />
    );

    expect(getByText("공개 게시 준비")).toBeOnTheScreen();
    expect(getByText("선택한 사진 2장")).toBeOnTheScreen();
    expect(getByText("아직 업로드하거나 공개하지 않았습니다.")).toBeOnTheScreen();
    expect(queryByText(/asset-a|asset-b/)).not.toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "사진 선택 확정" }));
    });
    await waitFor(() => expect(getByText("게시용 사진 2장 준비 완료 · 업로드는 시작되지 않았어요")).toBeOnTheScreen());
    expect(getByText("사진 파일의 EXIF·GPS 등 메타데이터를 제거했습니다.")).toBeOnTheScreen();
    expect(prepareDerivatives).toHaveBeenCalledWith(["asset-a", "asset-b"]);
    expect(publish).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "지금 업로드" }));
    });
    await waitFor(() => expect(getByText("사진 2장을 안전하게 저장했습니다.")).toBeOnTheScreen());
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it("offers a safe retry when derivative preparation fails", async () => {
    const prepareDerivatives = jest.fn(async () => {
      throw new Error("native details must stay hidden");
    });
    const { getByRole, getByText, queryByText } = await render(
      <PublicationReviewScreen
        prepareDerivatives={prepareDerivatives}
        selection={{ intent: "private", assetIds: ["asset-a"] }}
      />
    );

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "사진 선택 확정" }));
    });

    await waitFor(() => expect(getByText("게시용 사진을 준비하지 못했어요. 원본 접근 상태를 확인하고 다시 시도해 주세요.")).toBeOnTheScreen());
    expect(getByRole("button", { name: "다시 준비" })).toBeOnTheScreen();
    expect(queryByText("native details must stay hidden")).not.toBeOnTheScreen();
  });

  it("removes every prepared derivative before cancelling and going back", async () => {
    const goBack = jest.fn();
    const removeDerivative = jest.fn(async () => undefined);
    const derivative = {
      assetId: "asset-a",
      uri: "file:///cache/ikkyee-derivatives/cancel.jpg",
      width: 1200,
      height: 900,
      byteSize: 200_000,
      format: "jpeg" as const,
      metadataPolicy: "stripped" as const,
      createdAt: 1_000,
      expiresAt: 3_601_000
    };
    const { getByRole } = await render(
      <PublicationReviewScreen
        goBack={goBack}
        prepareDerivatives={async () => [derivative]}
        removeDerivative={removeDerivative}
        publish={jest.fn()}
        selection={{ intent: "private", assetIds: ["asset-a"] }}
      />
    );

    await act(async () => fireEvent.press(getByRole("button", { name: "사진 선택 확정" })));
    await waitFor(() => expect(getByRole("button", { name: "게시 취소" })).toBeOnTheScreen());
    await act(async () => fireEvent.press(getByRole("button", { name: "게시 취소" })));
    expect(removeDerivative).toHaveBeenCalledWith(derivative.uri);
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it("offers native sharing after a secure link publication without rendering the token", async () => {
    const token = "f".repeat(64);
    const shareLink = jest.fn(async () => undefined);
    const derivative = {
      assetId: "asset-a",
      uri: "file:///cache/ikkyee-derivatives/link.jpg",
      width: 1200,
      height: 900,
      byteSize: 200_000,
      format: "jpeg" as const,
      metadataPolicy: "stripped" as const,
      createdAt: 1_000,
      expiresAt: 3_601_000
    };
    const { getByRole, getByText, queryByText } = await render(
      <PublicationReviewScreen
        prepareDerivatives={async () => [derivative]}
        publish={async () => ({ succeeded: 1, failed: 0, jobIds: ["job-a"], shareTokens: [token] })}
        selection={{ intent: "link", assetIds: ["asset-a"] }}
        shareLink={shareLink}
      />
    );

    await act(async () => fireEvent.press(getByRole("button", { name: "사진 선택 확정" })));
    await act(async () => fireEvent.press(getByRole("button", { name: "지금 업로드" })));
    await waitFor(() => expect(getByRole("button", { name: "공유 링크 보내기" })).toBeOnTheScreen());
    expect(getByText("공유 링크가 준비됐습니다.")).toBeOnTheScreen();
    expect(queryByText(token)).not.toBeOnTheScreen();

    await act(async () => fireEvent.press(getByRole("button", { name: "공유 링크 보내기" })));
    expect(shareLink).toHaveBeenCalledWith(token);
  });

});
