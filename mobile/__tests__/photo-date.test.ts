import { formatPhotoDate } from "../src/photo-date";

describe("photo date presentation", () => {
  it.each([
    ["2026-07-24T04:30:00.000Z", "2026. 07. 24."],
    ["2026-07-24", "2026. 07. 24."],
    [null, "-- --"],
    ["", "-- --"],
    ["not-a-date", "-- --"],
    ["2026-02-30", "-- --"],
  ])("formats %p as %s", (value, expected) => {
    expect(formatPhotoDate(value)).toBe(expected);
  });
});
