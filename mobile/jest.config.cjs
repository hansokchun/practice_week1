process.env.EXPO_PUBLIC_USE_RN_FETCH = "1";

module.exports = {
  preset: "jest-expo",
  rootDir: __dirname,
  testPathIgnorePatterns: ["<rootDir>/dist/"],
  collectCoverageFrom: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"]
};
