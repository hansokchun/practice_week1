import { normalizeFeedbackDraft, submitProductFeedback } from "../src/product-feedback-repository";

describe("mobile product feedback repository", () => {
  const userId = "11111111-1111-4111-8111-111111111111";

  it("normalizes supported fields without retaining oversized input", () => {
    expect(normalizeFeedbackDraft({
      category: "feature_request",
      contactAllowed: true,
      message: `  ${"a".repeat(1200)}  `,
      pagePath: "/settings",
      rating: 5
    })).toEqual({
      category: "feature_request",
      contact_allowed: true,
      message: "a".repeat(1000),
      page_path: "/settings",
      rating: 5
    });
  });

  it("submits only a valid signed-in user's own feedback", async () => {
    const insert = jest.fn(async () => ({ inserted: true, error: null }));
    await expect(submitProductFeedback(userId, {
      category: "usability",
      contactAllowed: false,
      message: "Photo loading could be smoother.",
      pagePath: "/settings",
      rating: 3
    }, { insert })).resolves.toBeUndefined();
    expect(insert).toHaveBeenCalledWith({
      user_id: userId,
      category: "usability",
      contact_allowed: false,
      message: "Photo loading could be smoother.",
      page_path: "/settings",
      rating: 3,
      status: "received"
    });
    await expect(submitProductFeedback("bad-user", { message: "A useful comment" }, { insert })).rejects.toThrow();
  });
});
