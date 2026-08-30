import appConfig from "../app.json";
import reviewContract from "../store-review-contract.json";

const { buildExpoConfig } = require("../app.config.js") as {
  buildExpoConfig: (config: typeof appConfig.expo, environment?: Record<string, string>) => typeof appConfig.expo;
};

describe("store review handoff contract", () => {
  it("declares user-generated content and the implemented safety controls", () => {
    expect(reviewContract.audience.directedToChildren).toBe(false);
    expect(reviewContract.content.userGeneratedContent).toBe(true);
    expect(reviewContract.content.publicPhotos).toBe(true);
    expect(reviewContract.content.comments).toBe(true);
    expect(reviewContract.safety.reportContent).toBe(true);
    expect(reviewContract.safety.blockUsers).toBe(true);
    expect(reviewContract.safety.moderationRunbook).toBe(true);
    expect(reviewContract.commerce.advertising).toBe(false);
    expect(reviewContract.commerce.inAppPurchases).toBe(false);
    expect(reviewContract.commerce.gambling).toBe(false);
  });

  it("keeps ratings and reviewer credentials as explicit operator gates", () => {
    expect(reviewContract.reviewStatus).toBe("store-console-operator-review-required");
    expect(reviewContract.apple.ageRating.calculatedRating).toBeNull();
    expect(reviewContract.apple.ageRating.consoleQuestionnaireRequired).toBe(true);
    expect(reviewContract.googlePlay.contentRating.rating).toBeNull();
    expect(reviewContract.googlePlay.contentRating.consoleQuestionnaireRequired).toBe(true);
    expect(reviewContract.reviewAccess.demoAccount.status).toBe("operator-action-required");
    expect(reviewContract.reviewAccess.demoAccount.credentialsStoredInRepository).toBe(false);
    expect(reviewContract.reviewAccess.demoAccount.username).toBeNull();
    expect(reviewContract.reviewAccess.demoAccount.password).toBeNull();
    expect(reviewContract.reviewContact.email).toBeNull();
    expect(reviewContract.reviewContact.phone).toBeNull();
  });

  it("declares only standard exempt encryption in the generated iOS config", () => {
    expect(reviewContract.apple.exportCompliance.customOrProprietaryCryptography).toBe(false);
    expect(reviewContract.apple.exportCompliance.usesNonExemptEncryption).toBe(false);
    expect(appConfig.expo.ios.config.usesNonExemptEncryption).toBe(false);

    const generated = buildExpoConfig(appConfig.expo, {});
    expect(generated.ios.config.usesNonExemptEncryption).toBe(false);
  });
});
